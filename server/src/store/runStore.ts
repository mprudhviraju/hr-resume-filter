import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

const RUN_TTL_DAYS = 30;

export interface RunRecord {
  userEmail: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
  results: object;
  expiresAt: number;
}

export interface RunSummary {
  userEmail: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
}

export interface RunStore {
  save(run: Omit<RunRecord, 'expiresAt'>): Promise<void>;
  listByUser(email: string, limit?: number): Promise<RunSummary[]>;
  get(email: string, createdAt: number): Promise<RunRecord | null>;
}

class InMemoryRunStore implements RunStore {
  private readonly runs: RunRecord[] = [];

  async save(run: Omit<RunRecord, 'expiresAt'>): Promise<void> {
    this.runs.push({
      ...run,
      expiresAt: Math.floor(run.createdAt / 1000) + RUN_TTL_DAYS * 86400,
    });
  }

  async listByUser(email: string, limit = 50): Promise<RunSummary[]> {
    const lowerEmail = email.toLowerCase();
    return this.runs
      .filter((r) => r.userEmail === lowerEmail)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(({ results: _, expiresAt: __, ...rest }) => rest);
  }

  async get(email: string, createdAt: number): Promise<RunRecord | null> {
    return (
      this.runs.find(
        (r) => r.userEmail === email.toLowerCase() && r.createdAt === createdAt,
      ) ?? null
    );
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
        ProjectionExpression:
          'userEmail, createdAt, runId, criteria, totalResumes, shortlistedCount, notShortlistedCount, durationMs',
      }),
    );
    return (result.Items as RunSummary[] | undefined) ?? [];
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
