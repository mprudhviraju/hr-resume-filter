import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const SETTINGS_KEY = 'settings#openai_api_key';

export interface SettingsStore {
  getApiKey(): Promise<string | null>;
  setApiKey(key: string): Promise<void>;
  deleteApiKey(): Promise<void>;
}

class InMemorySettingsStore implements SettingsStore {
  private apiKey: string | null = null;

  async getApiKey(): Promise<string | null> {
    return this.apiKey;
  }

  async setApiKey(key: string): Promise<void> {
    this.apiKey = key;
  }

  async deleteApiKey(): Promise<void> {
    this.apiKey = null;
  }
}

class DynamoDBSettingsStore implements SettingsStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async getApiKey(): Promise<string | null> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { jobId: SETTINGS_KEY },
      }),
    );
    return (result.Item?.apiKey as string | undefined) ?? null;
  }

  async setApiKey(key: string): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          jobId: SETTINGS_KEY,
          apiKey: key,
          updatedAt: Date.now(),
        },
      }),
    );
  }

  async deleteApiKey(): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { jobId: SETTINGS_KEY },
      }),
    );
  }
}

let storeInstance: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
  if (!storeInstance) {
    const tableName = process.env.JOB_TABLE_NAME?.trim();
    storeInstance = tableName
      ? new DynamoDBSettingsStore(tableName)
      : new InMemorySettingsStore();
  }
  return storeInstance;
}
