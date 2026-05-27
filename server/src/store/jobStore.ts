import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ParsedResume } from '../services/resumeParser';

export interface JobRecord {
  jobId: string;
  resumes: ParsedResume[];
  criteria: string;
  apiKey?: string;
  userEmail?: string;
  userName?: string;
  s3UploadPrefix?: string;
  createdAt: number;
  expiresAt: number;
}

export interface JobStore {
  set(job: JobRecord): Promise<void>;
  get(jobId: string): Promise<JobRecord | null>;
  delete(jobId: string): Promise<void>;
}

const JOB_TTL_SECONDS = 24 * 60 * 60;

export function jobExpiresAt(createdAtMs: number = Date.now()): number {
  return Math.floor(createdAtMs / 1000) + JOB_TTL_SECONDS;
}

class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();

  async set(job: JobRecord): Promise<void> {
    this.jobs.set(job.jobId, job);
  }

  async get(jobId: string): Promise<JobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async delete(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }
}

class DynamoDBJobStore implements JobStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async set(job: JobRecord): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: job,
      }),
    );
  }

  async get(jobId: string): Promise<JobRecord | null> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { jobId },
      }),
    );
    return (result.Item as JobRecord | undefined) ?? null;
  }

  async delete(jobId: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { jobId },
      }),
    );
  }
}

let storeInstance: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!storeInstance) {
    const tableName = process.env.JOB_TABLE_NAME?.trim();
    storeInstance = tableName
      ? new DynamoDBJobStore(tableName)
      : new InMemoryJobStore();
  }
  return storeInstance;
}

/** @internal — reset singleton for tests */
export function resetJobStoreForTests(): void {
  storeInstance = null;
}
