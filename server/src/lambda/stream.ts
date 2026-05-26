import type {
  APIGatewayProxyEventV2,
  Context,
} from 'aws-lambda';
import { Writable } from 'stream';
import { runJobAnalysisStream, createSseWriter } from '../services/analysisStream';
import { getJobStore } from '../store/jobStore';

declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: APIGatewayProxyEventV2,
      responseStream: NodeJS.WritableStream,
      context: Context,
    ) => Promise<void>,
  ) => (
    event: APIGatewayProxyEventV2,
    responseStream: NodeJS.WritableStream,
    context: Context,
  ) => Promise<void>;
  HttpResponseStream: {
    from: (
      responseStream: NodeJS.WritableStream,
      metadata: { statusCode: number; headers?: Record<string, string> },
    ) => Writable;
  };
};

function getJobIdFromEvent(event: APIGatewayProxyEventV2): string | undefined {
  return (
    event.pathParameters?.jobId ??
    event.rawPath?.match(/\/api\/analyze\/([^/]+)\/stream/)?.[1] ??
    event.rawPath?.match(/^\/([0-9a-f-]{36})$/)?.[1]
  );
}

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
};

const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

async function streamHandler(
  event: APIGatewayProxyEventV2,
  responseStream: NodeJS.WritableStream,
): Promise<void> {
  const jobId = getJobIdFromEvent(event);
  if (!jobId) {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 400,
      headers: JSON_HEADERS,
    });
    httpStream.write(JSON.stringify({ error: 'Job ID is required' }));
    httpStream.end();
    return;
  }

  const jobStore = getJobStore();
  const job = await jobStore.get(jobId);
  if (!job) {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 404,
      headers: JSON_HEADERS,
    });
    httpStream.write(JSON.stringify({ error: 'Job not found' }));
    httpStream.end();
    return;
  }

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: SSE_HEADERS,
  });

  const send = createSseWriter((chunk) => {
    httpStream.write(chunk);
  });

  await runJobAnalysisStream(job, send, async () => {
    await jobStore.delete(jobId);
    httpStream.end();
  });
}

export const handler = awslambda.streamifyResponse(streamHandler);
