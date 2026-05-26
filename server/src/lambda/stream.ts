import type {
  APIGatewayProxyEventV2,
  Context,
} from 'aws-lambda';
import { Writable } from 'stream';
import { runJobAnalysisStream, createSseWriter } from '../services/analysisStream';
import { getJobStore } from '../store/jobStore';
import { corsHeaders, isOriginAllowed } from '../utils/cors';

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

async function streamHandler(
  event: APIGatewayProxyEventV2,
  responseStream: NodeJS.WritableStream,
): Promise<void> {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const headers = {
    ...corsHeaders(origin),
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 204,
      headers,
    });
    httpStream.end();
    return;
  }

  if (origin && !isOriginAllowed(origin)) {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 403,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
    httpStream.write(JSON.stringify({ error: 'Origin not allowed' }));
    httpStream.end();
    return;
  }

  const jobId = getJobIdFromEvent(event);
  if (!jobId) {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 400,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
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
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
    httpStream.write(JSON.stringify({ error: 'Job not found' }));
    httpStream.end();
    return;
  }

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers,
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
