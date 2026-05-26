import dotenv from 'dotenv';
import crypto from 'crypto';
import express from 'express';

dotenv.config();
import cors from 'cors';
import multer from 'multer';
import { parseResumeFolder, parseUploadedFiles } from './services/resumeParser';
import { pipeAnalysisStreamToWritable } from './services/analysisStream';
import { getJobStore, jobExpiresAt } from './store/jobStore';
import { isOriginAllowed, parseAllowedOrigins } from './utils/cors';

const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().match(/\.(pdf|doc|docx)$/);
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  },
});

export function createApp(): express.Application {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

  app.use(
    cors({
      origin: allowedOrigins.includes('*')
        ? true
        : (origin, callback) => {
            if (!origin || isOriginAllowed(origin)) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-OpenAI-API-Key'],
      exposedHeaders: ['X-OpenAI-API-Key'],
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'HR Resume Filter API is running' });
  });

  const uploadResumes = upload.array('resumes', 50);

  app.post(
    '/api/analyze',
    (req, res, next) => {
      uploadResumes(req, res, (err) => {
        if (err) {
          console.error('Multer / upload error:', err);
          return res.status(400).json({
            error: err.message || 'File upload failed',
            message: err.message,
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const { folderPath, criteria, apiKey: apiKeyFromBody } = req.body;
        const files = req.files as Express.Multer.File[] | undefined;

        const apiKey =
          (req.headers['x-openai-api-key'] as string | undefined) ||
          apiKeyFromBody;

        if (!criteria || !criteria.trim()) {
          return res.status(400).json({ error: 'Filtering criteria is required' });
        }

        if (isLambda && folderPath?.trim()) {
          return res.status(400).json({
            error:
              'Server-side folder paths are not supported in cloud deployment. Upload resume files instead.',
          });
        }

        let resumes;
        if (files && files.length > 0) {
          resumes = await parseUploadedFiles(files);
        } else if (folderPath?.trim()) {
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
        const createdAt = Date.now();
        await getJobStore().set({
          jobId,
          resumes,
          criteria: criteria.trim(),
          apiKey,
          createdAt,
          expiresAt: jobExpiresAt(createdAt),
        });

        res.json({ jobId, totalResumes: resumes.length });
      } catch (error: unknown) {
        console.error('Error creating analyze job:', error);
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          error: 'Failed to create analysis job',
          message,
        });
      }
    },
  );

  app.get('/api/analyze/:jobId/stream', async (req, res) => {
    const { jobId } = req.params;
    const job = await getJobStore().get(jobId);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const jobStore = getJobStore();
    await pipeAnalysisStreamToWritable(job, res, async () => {
      await jobStore.delete(jobId);
      res.end();
    });
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (res.headersSent) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error('Unhandled error middleware:', err);
      res.status(500).json({
        error: 'Internal server error',
        message,
      });
    },
  );

  return app;
}

export const app = createApp();
