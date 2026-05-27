import dotenv from 'dotenv';
import crypto from 'crypto';
import express from 'express';

dotenv.config();
import cors from 'cors';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parseResumeFolder, parseUploadedFiles, parseS3Files } from './services/resumeParser';
import { pipeAnalysisStreamToWritable } from './services/analysisStream';
import { getJobStore, jobExpiresAt } from './store/jobStore';
import { getSettingsStore } from './store/settingsStore';
import { getUserStore } from './store/userStore';
import { getRunStore, s3PrefixFromKeys } from './store/runStore';
import { deleteS3Prefix } from './utils/s3Cleanup';
import { isOriginAllowed, parseAllowedOrigins } from './utils/cors';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from './middleware/auth';

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
      allowedHeaders: ['Content-Type', 'X-OpenAI-API-Key', 'Authorization'],
      exposedHeaders: ['X-OpenAI-API-Key'],
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const s3 = new S3Client({});
  const uploadBucket = process.env.UPLOAD_BUCKET?.trim() || '';

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'HR Resume Filter API is running' });
  });

  // --- S3 presigned upload URLs (bypasses Lambda 6MB payload limit) ---

  app.post('/api/upload-urls', requireAuth, async (req, res) => {
    try {
      if (!uploadBucket) {
        return res.status(501).json({ error: 'S3 uploads not configured' });
      }
      const { fileNames } = req.body as { fileNames: string[] };
      if (!Array.isArray(fileNames) || fileNames.length === 0) {
        return res.status(400).json({ error: 'fileNames array is required' });
      }
      if (fileNames.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 files per batch' });
      }

      const batchId = crypto.randomUUID();
      const uploads = await Promise.all(
        fileNames.map(async (name) => {
          const key = `uploads/${batchId}/${name}`;
          const url = await getSignedUrl(
            s3,
            new PutObjectCommand({ Bucket: uploadBucket, Key: key }),
            { expiresIn: 600 },
          );
          return { fileName: name, key, uploadUrl: url };
        }),
      );

      res.json({ batchId, uploads });
    } catch (error) {
      console.error('Error generating upload URLs:', error);
      res.status(500).json({ error: 'Failed to generate upload URLs' });
    }
  });

  // --- Settings: server-stored OpenAI API key (protected) ---

  app.get('/api/settings/api-key', requireAuth, async (_req, res) => {
    try {
      const key = await getSettingsStore().getApiKey();
      if (!key) {
        return res.json({ apiKey: null });
      }
      const masked =
        key.slice(0, 7) + '*'.repeat(Math.max(0, key.length - 11)) + key.slice(-4);
      res.json({ apiKey: masked, hasKey: true });
    } catch (error: unknown) {
      console.error('Error loading API key:', error);
      res.status(500).json({ error: 'Failed to load API key' });
    }
  });

  app.put('/api/settings/api-key', requireAuth, async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        return res.status(400).json({ error: 'API key is required' });
      }
      await getSettingsStore().setApiKey(apiKey.trim());
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Error saving API key:', error);
      res.status(500).json({ error: 'Failed to save API key' });
    }
  });

  app.delete('/api/settings/api-key', requireAuth, async (_req, res) => {
    try {
      await getSettingsStore().deleteApiKey();
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  });

  const uploadResumes = upload.array('resumes', 50);

  app.post(
    '/api/analyze',
    requireAuth,
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
        const { folderPath, criteria, apiKey: apiKeyFromBody, s3Keys } = req.body;
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
        if (Array.isArray(s3Keys) && s3Keys.length > 0 && uploadBucket) {
          resumes = await parseS3Files(s3, uploadBucket, s3Keys);
        } else if (files && files.length > 0) {
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
        const authReq = req as AuthenticatedRequest;
        const s3KeysList = Array.isArray(s3Keys) ? s3Keys : undefined;
        await getJobStore().set({
          jobId,
          resumes,
          criteria: criteria.trim(),
          apiKey,
          userEmail: authReq.user?.email,
          userName: authReq.user?.name,
          s3UploadPrefix: s3KeysList ? s3PrefixFromKeys(s3KeysList) : undefined,
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

  // --- Runs: per-user analysis history (last 30 days) ---

  app.get('/api/runs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const store = getRunStore();
      const runs =
        req.user!.role === 'admin'
          ? await store.listAll(limit)
          : await store.listByUser(req.user!.email, limit);
      res.json({ runs });
    } catch (error) {
      console.error('Error listing runs:', error);
      res.status(500).json({ error: 'Failed to list runs' });
    }
  });

  app.get('/api/runs/:createdAt', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const createdAt = Number(req.params.createdAt);
      if (!createdAt || Number.isNaN(createdAt)) {
        return res.status(400).json({ error: 'Invalid timestamp' });
      }

      const ownerEmail =
        req.user!.role === 'admin' && typeof req.query.userEmail === 'string'
          ? req.query.userEmail
          : req.user!.email;

      const run = await getRunStore().get(ownerEmail, createdAt);
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      if (req.user!.role !== 'admin' && run.userEmail !== req.user!.email.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json({ run });
    } catch (error) {
      console.error('Error fetching run:', error);
      res.status(500).json({ error: 'Failed to fetch run' });
    }
  });

  app.delete(
    '/api/runs/:createdAt',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const createdAt = Number(req.params.createdAt);
        const userEmail = req.query.userEmail as string | undefined;
        if (!createdAt || Number.isNaN(createdAt)) {
          return res.status(400).json({ error: 'Invalid timestamp' });
        }
        if (!userEmail || !userEmail.includes('@')) {
          return res.status(400).json({ error: 'userEmail query parameter is required' });
        }

        const store = getRunStore();
        const run = await store.get(userEmail, createdAt);
        if (!run) {
          return res.status(404).json({ error: 'Run not found' });
        }

        if (run.s3UploadPrefix && uploadBucket) {
          try {
            await deleteS3Prefix(s3, uploadBucket, run.s3UploadPrefix);
          } catch (s3Err) {
            console.error('S3 cleanup failed (run will still be deleted):', s3Err);
          }
        }

        await store.delete(userEmail, createdAt);
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting run:', error);
        res.status(500).json({ error: 'Failed to delete run' });
      }
    },
  );

  // --- Auth: verify Google token + check allowed users ---

  app.post('/api/auth/verify', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // --- User management (admin only) ---

  app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const users = await getUserStore().list();
      res.json({ users });
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  });

  app.post('/api/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { email, name, role } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      await getUserStore().add({
        email: email.toLowerCase().trim(),
        name: name?.trim() || undefined,
        role: role === 'admin' ? 'admin' : 'user',
        addedAt: Date.now(),
        addedBy: req.user?.email,
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding user:', error);
      res.status(500).json({ error: 'Failed to add user' });
    }
  });

  app.delete('/api/users/:email', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { email } = req.params;
      await getUserStore().remove(decodeURIComponent(email));
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing user:', error);
      res.status(500).json({ error: 'Failed to remove user' });
    }
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
