import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, FileSearch, Loader2 } from 'lucide-react';
import FolderSelector from '../components/FolderSelector';
import CriteriaInput from '../components/CriteriaInput';
import ResultsDisplay from '../components/ResultsDisplay';
import NavBar from '../components/NavBar';
import { AnalysisResults } from '../types';
import { getStoredApiKey, loadApiKeyFromServer } from '../utils/apiKeyStorage';
import { JobHistoryItem, loadJobHistory, saveJobHistory } from '../utils/jobHistoryStorage';
import { useAuth } from '../contexts/AuthContext';

interface ProgressState {
  total: number;
  currentIndex: number;
  currentFileName: string;
}

interface LastJobSummary {
  id: string;
  total: number;
  shortlisted: number;
  notShortlisted: number;
  durationMs: number;
  finishedAt: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const STREAM_BASE_URL = (import.meta.env.VITE_STREAM_BASE_URL || '').replace(/\/+$/, '');
const SHOW_SERVER_FOLDER_PATH =
  import.meta.env.VITE_ENABLE_FOLDER_PATH === 'true';

function resolveApiUrl(pathWithLeadingSlash: string): string {
  const path = pathWithLeadingSlash.startsWith('/')
    ? pathWithLeadingSlash
    : `/${pathWithLeadingSlash}`;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function AnalyzePage() {
  const { authHeaders } = useAuth();

  const [folderPath, setFolderPath] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [criteria, setCriteria] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [, setJobHistory] = useState<JobHistoryItem[]>(() => loadJobHistory());
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [, setCurrentJobId] = useState<string | null>(null);
  const [jobStartedAt, setJobStartedAt] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [lastJobSummary, setLastJobSummary] = useState<LastJobSummary | null>(null);
  const [isStatusPanelCollapsed, setIsStatusPanelCollapsed] =
    useState<boolean>(false);

  const formatDuration = (ms: number): string => {
    if (ms <= 0 || Number.isNaN(ms)) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (files) {
      setUploadedFiles(Array.from(files));
      setFolderPath('');
    }
  };

  const handleAnalyze = async () => {
    if (!folderPath.trim() && uploadedFiles.length === 0) {
      setError('Please upload resume files or provide a folder path');
      return;
    }

    if (!criteria.trim()) {
      setError('Please provide filtering criteria');
      return;
    }

    let apiKey = getStoredApiKey();
    if (!apiKey) {
      try {
        const serverKey = await loadApiKeyFromServer();
        if (!serverKey.hasKey) {
          setError('Please configure your OpenAI API key in Settings first');
          return;
        }
        apiKey = null;
      } catch {
        setError('Please configure your OpenAI API key in Settings first');
        return;
      }
    }

    setLoading(true);
    setError('');
    setResults(null);
    setProgress(null);
    setElapsedMs(0);
    setRecentFiles([]);
    setCurrentJobId(null);
    const started = new Date().toISOString();
    setJobStartedAt(started);
    setLastJobSummary(null);
    setIsStatusPanelCollapsed(false);

    try {
      let s3Keys: { key: string; fileName: string }[] | undefined;

      if (uploadedFiles.length > 0) {
        // Step 1a: Get presigned upload URLs from server
        const urlsRes = await fetch(resolveApiUrl('/api/upload-urls'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            fileNames: uploadedFiles.map((f) => f.name),
          }),
        });

        if (urlsRes.ok) {
          const { uploads } = (await urlsRes.json()) as {
            batchId: string;
            uploads: { fileName: string; key: string; uploadUrl: string }[];
          };

          // Step 1b: Upload each file directly to S3
          await Promise.all(
            uploads.map(async (u) => {
              const file = uploadedFiles.find((f) => f.name === u.fileName);
              if (!file) return;
              await fetch(u.uploadUrl, { method: 'PUT', body: file });
            }),
          );

          s3Keys = uploads.map((u) => ({ key: u.key, fileName: u.fileName }));
        }
        // If presigned URLs not available (local dev), fall back to multipart
      }

      let response: Response;

      if (s3Keys) {
        // S3-based flow (Lambda-safe, no payload size limits)
        response = await fetch(resolveApiUrl('/api/analyze'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            s3Keys,
            criteria,
            ...(apiKey ? { apiKey } : {}),
          }),
        });
      } else {
        // Multipart flow (local dev fallback)
        const formData = new FormData();
        uploadedFiles.forEach((file) => formData.append('resumes', file));
        if (folderPath.trim()) formData.append('folderPath', folderPath);
        formData.append('criteria', criteria);
        if (apiKey) formData.append('apiKey', apiKey);

        response = await fetch(resolveApiUrl('/api/analyze'), {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        });
      }

      if (!response.ok) {
        const bodyText = await response.text();
        let parsed: { error?: string; message?: string } = {};
        if (bodyText) {
          try {
            parsed = JSON.parse(bodyText) as typeof parsed;
          } catch { /* non-JSON */ }
        }
        const trimmed = bodyText?.trim()?.slice(0, 600) ?? '';
        const detail =
          parsed.message ||
          parsed.error ||
          (trimmed && !trimmed.startsWith('<')
            ? trimmed
            : `Server returned ${response.status} ${response.statusText}${trimmed.startsWith('<') ? ' — check that the backend is running and the API URL/port matches vite.config.ts' : ''}`);
        throw new Error(detail);
      }

      const { jobId, totalResumes } = (await response.json()) as {
        jobId: string;
        totalResumes?: number;
      };

      if (!jobId) {
        throw new Error('Job ID missing from server response');
      }

      setCurrentJobId(jobId);

      const streamUrl = STREAM_BASE_URL
        ? `${STREAM_BASE_URL}/${jobId}`
        : resolveApiUrl(`/api/analyze/${jobId}/stream`);
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      setProgress({
        total: totalResumes ?? uploadedFiles.length,
        currentIndex: 0,
        currentFileName: '',
      });

      const jobStartTime = jobStartedAt || new Date().toISOString();
      setJobStartedAt(jobStartTime);

      const startedAtMs = Date.parse(jobStartTime);
      setElapsedMs(0);

      es.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as ProgressState & {
            completed?: boolean;
          };

          setProgress((prev) => {
            const next: ProgressState = {
              total: data.total,
              currentIndex: data.currentIndex,
              currentFileName: data.currentFileName,
            };

            if (
              data.currentFileName &&
              data.currentIndex > (prev?.currentIndex ?? 0)
            ) {
              setRecentFiles((prevFiles) => {
                const updated = [data.currentFileName, ...prevFiles.filter((f) => f !== data.currentFileName)];
                return updated.slice(0, 5);
              });
            }

            if (startedAtMs) {
              setElapsedMs(Date.now() - startedAtMs);
            }

            return next;
          });
        } catch (e) {
          console.error('Failed to parse progress event', e);
        }
      });

      es.addEventListener('done', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as AnalysisResults;
          setResults(data);
          setLoading(false);

          const finishedAt = new Date().toISOString();
          const durationMs =
            jobStartTime && finishedAt
              ? Date.parse(finishedAt) - Date.parse(jobStartTime)
              : elapsedMs;

          const summary: LastJobSummary = {
            id: jobId,
            total: progress?.total ?? totalResumes ?? uploadedFiles.length,
            shortlisted: data.shortlisted.length,
            notShortlisted: data.notShortlisted.length,
            durationMs,
            finishedAt,
          };
          setLastJobSummary(summary);

          const historyEntry: JobHistoryItem = {
            id: jobId,
            startedAt: jobStartTime,
            finishedAt,
            total: progress?.total ?? totalResumes ?? uploadedFiles.length,
            success: true,
            results: data,
          };
          setJobHistory((prev) => {
            const updated = [historyEntry, ...prev].slice(0, 20);
            saveJobHistory(updated);
            return updated;
          });

          es.close();
          eventSourceRef.current = null;
        } catch (e) {
          console.error('Failed to parse done event', e);
          setError('Failed to parse analysis results');
          setLoading(false);
          es.close();
          eventSourceRef.current = null;
        }
      });

      es.addEventListener('error', (event) => {
        let message = 'An error occurred while streaming analysis progress';
        try {
          const data = (event as MessageEvent).data
            ? JSON.parse((event as MessageEvent).data as string)
            : null;
          if (data?.error) {
            message = data.error;
          }
        } catch { /* ignore */ }

        console.error('SSE error event', event);
        setError(message);
        setLoading(false);
        setProgress(null);

        if (jobId) {
          const finishedAt = new Date().toISOString();
          const historyEntry: JobHistoryItem = {
            id: jobId,
            startedAt: jobStartTime,
            finishedAt,
            total: progress?.total ?? uploadedFiles.length,
            success: false,
            error: message,
          };
          setJobHistory((prev) => {
            const updated = [historyEntry, ...prev].slice(0, 20);
            saveJobHistory(updated);
            return updated;
          });
        }

        es.close();
        eventSourceRef.current = null;
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFolderPath('');
    setUploadedFiles([]);
    setCriteria('');
    setResults(null);
    setError('');
    setProgress(null);
    setElapsedMs(0);
    setRecentFiles([]);
    setCurrentJobId(null);
    setLastJobSummary(null);
    setIsStatusPanelCollapsed(false);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-subtle)' }}>
      <NavBar />

      <div className="px-4 sm:px-6 py-5">
        {!results ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Step 1 — Upload */}
            <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold" style={{ backgroundColor: 'var(--color-ocean-50)', color: 'var(--color-ocean-700)' }}>1</span>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ocean-600)' }}>Upload Resumes</h2>
              </div>
              <FolderSelector
                showServerFolderPath={SHOW_SERVER_FOLDER_PATH}
                folderPath={folderPath}
                onFolderChange={setFolderPath}
                onFilesSelected={handleFilesSelected}
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">
                    {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
                  </p>
                  <ul className="text-xs text-indigo-600 space-y-0.5">
                    {uploadedFiles.map((file, idx) => (
                      <li key={idx} className="truncate">{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Step 2 — Criteria */}
            <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold" style={{ backgroundColor: 'var(--color-ocean-50)', color: 'var(--color-ocean-700)' }}>2</span>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ocean-600)' }}>Define Criteria</h2>
              </div>
              <CriteriaInput
                criteria={criteria}
                onCriteriaChange={setCriteria}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Analyze button */}
            <div>
              <button
                onClick={handleAnalyze}
                disabled={loading || (!folderPath && uploadedFiles.length === 0) || !criteria}
                className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm"
                style={{
                  backgroundColor: (!loading && (folderPath || uploadedFiles.length > 0) && criteria) ? 'var(--color-ocean-600)' : undefined,
                  transition: `all var(--duration-normal) var(--ease-out)`,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    Analyzing Resumes...
                  </>
                ) : (
                  <>
                    <FileSearch size={16} />
                    Analyze Resumes
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <ResultsDisplay results={results} onReset={handleReset} />
        )}
      </div>

      {/* Floating progress / summary panel */}
      {(progress || lastJobSummary) && (
        <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm sm:max-w-xs">
          {progress && !isStatusPanelCollapsed && (
            <div className="bg-[#2b3544] text-white shadow-2xl rounded-lg px-4 py-4 border border-gray-600">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Analyzing...</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                      {progress.currentIndex}/{progress.total}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-300 truncate max-w-[220px]">
                    {progress.currentIndex === 0 && !progress.currentFileName
                      ? 'Preparing...'
                      : progress.currentFileName || 'Processing...'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStatusPanelCollapsed(true)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 transition-all"
                  style={{
                    width:
                      progress.total > 0
                        ? `${Math.min(100, (progress.currentIndex / progress.total) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                <span>Elapsed: {formatDuration(elapsedMs)}</span>
                <span>
                  ETA:{' '}
                  {progress.total > 0 && progress.currentIndex > 0
                    ? formatDuration(
                        (elapsedMs / progress.currentIndex) *
                          (progress.total - progress.currentIndex),
                      )
                    : 'Calculating...'}
                </span>
              </div>
              {recentFiles.length > 0 && (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <div className="text-[10px] font-semibold mb-1 text-gray-300">Recent files</div>
                  <ul className="space-y-0.5 max-h-16 overflow-y-auto text-[10px] text-gray-400">
                    {recentFiles.map((name) => (
                      <li key={name} className="truncate">• {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {progress && isStatusPanelCollapsed && (
            <button
              type="button"
              onClick={() => setIsStatusPanelCollapsed(false)}
              className="flex items-center justify-between w-full bg-[#2b3544] text-white shadow-2xl rounded-full px-3 py-2 border border-gray-600 text-xs"
            >
              <span className="flex items-center gap-2">
                <Clock size={14} />
                <span>{progress.currentIndex}/{progress.total} resumes...</span>
              </span>
              <ChevronUp size={16} />
            </button>
          )}

          {!progress && lastJobSummary && !isStatusPanelCollapsed && (
            <div className="bg-emerald-700 text-white shadow-2xl rounded-lg px-4 py-4 border border-emerald-500">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-200" />
                    <span className="font-semibold text-sm">Analysis complete</span>
                  </div>
                  <div className="mt-1 text-xs text-emerald-100">
                    {lastJobSummary.shortlisted}/{lastJobSummary.total} shortlisted • {formatDuration(lastJobSummary.durationMs)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStatusPanelCollapsed(true)}
                  className="p-1 rounded hover:bg-emerald-600"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          )}

          {!progress && lastJobSummary && isStatusPanelCollapsed && (
            <button
              type="button"
              onClick={() => setIsStatusPanelCollapsed(false)}
              className="flex items-center justify-between w-full bg-emerald-700 text-white shadow-2xl rounded-full px-3 py-2 border border-emerald-500 text-xs"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>{lastJobSummary.shortlisted}/{lastJobSummary.total} shortlisted</span>
              </span>
              <ChevronUp size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyzePage;
