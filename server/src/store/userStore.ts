import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

export interface UserRecord {
  email: string;
  name?: string;
  role: 'user' | 'admin';
  addedAt: number;
  addedBy?: string;
}

export interface UserStore {
  get(email: string): Promise<UserRecord | null>;
  list(): Promise<UserRecord[]>;
  add(user: UserRecord): Promise<void>;
  remove(email: string): Promise<void>;
  isAllowed(email: string): Promise<boolean>;
}

class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, UserRecord>();

  async get(email: string): Promise<UserRecord | null> {
    return this.users.get(email.toLowerCase()) ?? null;
  }

  async list(): Promise<UserRecord[]> {
    return Array.from(this.users.values());
  }

  async add(user: UserRecord): Promise<void> {
    this.users.set(user.email.toLowerCase(), { ...user, email: user.email.toLowerCase() });
  }

  async remove(email: string): Promise<void> {
    this.users.delete(email.toLowerCase());
  }

  async isAllowed(email: string): Promise<boolean> {
    return this.users.has(email.toLowerCase());
  }
}

class DynamoDBUserStore implements UserStore {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async get(email: string): Promise<UserRecord | null> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { email: email.toLowerCase() },
      }),
    );
    return (result.Item as UserRecord | undefined) ?? null;
  }

  async list(): Promise<UserRecord[]> {
    const result = await this.doc.send(
      new ScanCommand({ TableName: this.tableName }),
    );
    return (result.Items as UserRecord[] | undefined) ?? [];
  }

  async add(user: UserRecord): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...user, email: user.email.toLowerCase() },
      }),
    );
  }

  async remove(email: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { email: email.toLowerCase() },
      }),
    );
  }

  async isAllowed(email: string): Promise<boolean> {
    const user = await this.get(email);
    return user !== null;
  }
}

let storeInstance: UserStore | null = null;

export function getUserStore(): UserStore {
  if (!storeInstance) {
    const tableName = process.env.USERS_TABLE_NAME?.trim();
    storeInstance = tableName
      ? new DynamoDBUserStore(tableName)
      : new InMemoryUserStore();
  }
  return storeInstance;
}
