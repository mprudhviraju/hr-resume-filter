import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const RUN_TTL_DAYS = 30;

export interface RunRecord {
  userEmail: string;
  userName?: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
  results: object;
  s3UploadPrefix?: string;
  expiresAt: number;
}

export interface RunSummary {
  userEmail: string;
  userName?: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
  s3UploadPrefix?: string;
}

export interface RunStore {
  save(run: Omit<RunRecord, 'expiresAt'>): Promise<void>;
  listByUser(email: string, limit?: number): Promise<RunSummary[]>;
  listAll(limit?: number): Promise<RunSummary[]>;
  get(email: string, createdAt: number): Promise<RunRecord | null>;
  delete(email: string, createdAt: number): Promise<boolean>;
}

const SUMMARY_FIELDS =
  'userEmail, userName, createdAt, runId, criteria, totalResumes, shortlistedCount, notShortlistedCount, durationMs, s3UploadPrefix';

function toSummary(run: RunRecord): RunSummary {
  const { results: _, expiresAt: __, ...rest } = run;
  return rest;
}

class InMemoryRunStore implements RunStore {
  private readonly runs: RunRecord[] = [];

  async save(run: Omit<RunRecord, 'expiresAt'>): Promise<void> {
    this.runs.push({
      ...run,
      userEmail: run.userEmail.toLowerCase(),
      expiresAt: Math.floor(run.createdAt / 1000) + RUN_TTL_DAYS * 86400,
    });
  }

  async listByUser(email: string, limit = 50): Promise<RunSummary[]> {
    const lowerEmail = email.toLowerCase();
    return this.runs
      .filter((r) => r.userEmail === lowerEmail)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(toSummary);
  }

  async listAll(limit = 100): Promise<RunSummary[]> {
    return [...this.runs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(toSummary);
  }

  async get(email: string, createdAt: number): Promise<RunRecord | null> {
    return (
      this.runs.find(
        (r) => r.userEmail === email.toLowerCase() && r.createdAt === createdAt,
      ) ?? null
    );
  }

  async delete(email: string, createdAt: number): Promise<boolean> {
    const idx = this.runs.findIndex(
      (r) => r.userEmail === email.toLowerCase() && r.createdAt === createdAt,
    );
    if (idx === -1) return false;
    this.runs.splice(idx, 1);
    return true;
  }
}

class DynamoDBRunStore implements RunStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async save(run: Omit<RunRecord, 'expiresAt'>): Promise<void> {
    const expiresAt = Math.floor(run.createdAt / 1000) + RUN_TTL_DAYS * 86400;
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...run, userEmail: run.userEmail.toLowerCase(), expiresAt },
      }),
    );
  }

  async listByUser(email: string, limit = 50): Promise<RunSummary[]> {
    const result = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userEmail = :email',
        ExpressionAttributeValues: { ':email': email.toLowerCase() },
        ScanIndexForward: false,
        Limit: limit,
        ProjectionExpression: SUMMARY_FIELDS,
      }),
    );
    return (result.Items as RunSummary[] | undefined) ?? [];
  }

  async listAll(limit = 100): Promise<RunSummary[]> {
    const result = await this.doc.send(
      new ScanCommand({
        TableName: this.tableName,
        Limit: limit,
        ProjectionExpression: SUMMARY_FIELDS,
      }),
    );
    const items = (result.Items as RunSummary[] | undefined) ?? [];
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async get(email: string, createdAt: number): Promise<RunRecord | null> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userEmail: email.toLowerCase(), createdAt },
      }),
    );
    return (result.Item as RunRecord | undefined) ?? null;
  }

  async delete(email: string, createdAt: number): Promise<boolean> {
    const existing = await this.get(email, createdAt);
    if (!existing) return false;
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { userEmail: email.toLowerCase(), createdAt },
      }),
    );
    return true;
  }
}

let storeInstance: RunStore | null = null;

export function getRunStore(): RunStore {
  if (!storeInstance) {
    const tableName = process.env.RUNS_TABLE_NAME?.trim();
    storeInstance = tableName
      ? new DynamoDBRunStore(tableName)
      : new InMemoryRunStore();
  }
  return storeInstance;
}

/** Extract S3 prefix for batch uploads (e.g. uploads/uuid/) from first key */
export function s3PrefixFromKeys(keys: { key: string }[]): string | undefined {
  const first = keys[0]?.key;
  if (!first) return undefined;
  const lastSlash = first.lastIndexOf('/');
  if (lastSlash <= 0) return undefined;
  return first.slice(0, lastSlash + 1);
}
