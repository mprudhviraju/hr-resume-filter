import type { Writable } from 'stream';
import { analyzeResumesWithProgress } from './resumeAnalyzer';
import type { JobRecord } from '../store/jobStore';

export type SseWriter = (event: string, data: object) => void;

export function createSseWriter(write: (chunk: string) => void): SseWriter {
  return (event: string, data: object) => {
    write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

/**
 * Run resume analysis for a job and emit SSE progress / done / error events.
 */
export async function runJobAnalysisStream(
  job: JobRecord,
  send: SseWriter,
  onComplete?: () => Promise<void>,
): Promise<void> {
  try {
    const results = await analyzeResumesWithProgress(
      job.resumes,
      job.criteria,
      job.apiKey,
      (currentIndex, total, currentFileName) => {
        send('progress', { currentIndex, total, currentFileName });
      },
    );
    send('done', results);
    await onComplete?.();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    console.error('Stream analysis error:', err);
    send('error', { error: message });
    await onComplete?.();
  }
}

/** Express response or Lambda response stream */
export async function pipeAnalysisStreamToWritable(
  job: JobRecord,
  writable: Writable,
  onComplete?: () => Promise<void>,
): Promise<void> {
  const send = createSseWriter((chunk) => {
    writable.write(chunk);
  });
  await runJobAnalysisStream(job, send, onComplete);
}
