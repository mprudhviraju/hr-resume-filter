import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { analyzeResumesWithProgress } from './services/resumeAnalyzer';
import { parseResumeFolder, parseUploadedFiles } from './services/resumeParser';
import type { ParsedResume } from './services/resumeParser';

// Load environment variables
dotenv.config();

// Log startup information
console.log('=== Server Starting ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('Working directory:', process.cwd());
console.log('PORT will be:', process.env.PORT || 8080);

const app = express();
// Elastic Beanstalk sets PORT automatically, default to 8080 for EB
const PORT = Number(process.env.PORT) || 8080;

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase().match(/\.(pdf|doc|docx)$/);
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  },
});

// Configure CORS to allow custom headers
// Allow localhost for dev, and all origins for production (you can restrict this later)
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['*'] // In production, allow all (or specify your Amplify domain)
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-OpenAI-API-Key'],
  exposedHeaders: ['X-OpenAI-API-Key'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory job store: jobId -> { resumes, criteria, apiKey }
const jobStore = new Map<string, { resumes: ParsedResume[]; criteria: string; apiKey?: string }>();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HR Resume Filter API is running' });
});

// Create job: parse input and return jobId + totalResumes (analysis runs when client opens stream)
app.post('/api/analyze', upload.array('resumes', 50), async (req, res) => {
  try {
    const { folderPath, criteria, apiKey: apiKeyFromBody } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    const apiKey = (req.headers['x-openai-api-key'] as string | undefined) || apiKeyFromBody;

    if (!criteria || !criteria.trim()) {
      return res.status(400).json({ error: 'Filtering criteria is required' });
    }

    let resumes: ParsedResume[];

    if (files && files.length > 0) {
      resumes = await parseUploadedFiles(files);
    } else if (folderPath && folderPath.trim()) {
      resumes = await parseResumeFolder(folderPath);
    } else {
      return res.status(400).json({
        error: 'Either upload resume files or provide a folder path',
      });
    }

    if (resumes.length === 0) {
      return res.status(404).json({
        error: 'No valid resumes found. Please check your files or folder path.',
      });
    }

    const jobId = crypto.randomUUID();
    jobStore.set(jobId, { resumes, criteria, apiKey });

    res.json({ jobId, totalResumes: resumes.length });
  } catch (error: any) {
    console.error('Error creating analyze job:', error);
    res.status(500).json({
      error: 'Failed to create analysis job',
      message: error.message,
    });
  }
});

// SSE stream: run analysis for job and send progress + done events
app.get('/api/analyze/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  const job = jobStore.get(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  analyzeResumesWithProgress(
    job.resumes,
    job.criteria,
    job.apiKey,
    (currentIndex, total, currentFileName) => {
      send('progress', { currentIndex, total, currentFileName });
    }
  )
    .then((results) => {
      send('done', results);
      jobStore.delete(jobId);
      res.end();
    })
    .catch((err: any) => {
      console.error('Stream analysis error:', err);
      send('error', { error: err?.message || 'Analysis failed' });
      jobStore.delete(jobId);
      res.end();
    });
});

// Error handling for server startup
console.log(`Attempting to start server on port ${PORT}...`);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('=== Server Started Successfully ===');
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check available at: http://0.0.0.0:${PORT}/api/health`);
}).on('error', (err: any) => {
  console.error('=== Server Start FAILED ===');
  console.error('Error details:', err);
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Log process events for debugging
process.on('uncaughtException', (err) => {
  console.error('=== Uncaught Exception ===');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== Unhandled Rejection ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

