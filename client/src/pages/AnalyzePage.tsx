import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, History, Settings, FileSearch, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import FolderSelector from '../components/FolderSelector';
import CriteriaInput from '../components/CriteriaInput';
import ResultsDisplay from '../components/ResultsDisplay';
import { AnalysisResults } from '../types';
import { getStoredApiKey, loadApiKeyFromServer } from '../utils/apiKeyStorage';
import { JobHistoryItem, loadJobHistory, saveJobHistory } from '../utils/jobHistoryStorage';

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

/** Same-origin `/api` in dev (Vite proxy) or explicit API host in production */
function resolveApiUrl(pathWithLeadingSlash: string): string {
  const path = pathWithLeadingSlash.startsWith('/')
    ? pathWithLeadingSlash
    : `/${pathWithLeadingSlash}`;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function AnalyzePage() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [criteria, setCriteria] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [jobHistory, setJobHistory] = useState<JobHistoryItem[]>(() => loadJobHistory());
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [, setCurrentJobId] = useState<string | null>(null);
  const [jobStartedAt, setJobStartedAt] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [jobHistoryExpanded, setJobHistoryExpanded] = useState<boolean>(false);
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
      setFolderPath(''); // Clear folder path when files are uploaded
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
        // Server has the key — send without it; the server will use its stored copy
        apiKey = null;
      } catch {
        setError('Please configure your OpenAI API key in Settings first');
        return;
      }
    }

    // Reset state before starting
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
      const formData = new FormData();
      
      // Add uploaded files if any
      uploadedFiles.forEach((file) => {
        formData.append('resumes', file);
      });

      // Add folder path if provided (for server-side folder access)
      if (folderPath.trim()) {
        formData.append('folderPath', folderPath);
      }

      // Add criteria
      formData.append('criteria', criteria);
      
      if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      const apiUrl = resolveApiUrl('/api/analyze');

      // Step 1: create job
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        let parsed: { error?: string; message?: string } = {};
        if (bodyText) {
          try {
            parsed = JSON.parse(bodyText) as typeof parsed;
          } catch {
            /* non‑JSON bodies (proxy HTML, empty, etc.) */
          }
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

      // Step 2: open SSE stream for progress & final results
      // Use Lambda Function URL if configured, otherwise fall back to API proxy (local dev)
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
        } catch {
          // ignore parse errors
        }

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

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Top navigation bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="https://www.mirabeltechnologies.com/wp-content/uploads/2022/05/Mirabel-gold-white-background.png"
                alt="Mirabel Technologies"
                className="h-9 w-auto object-contain"
              />
              <div className="hidden sm:block h-6 w-px bg-gray-200" />
              <span className="hidden sm:inline text-sm font-semibold text-gray-700">HR Resume Filter</span>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings size={16} />
              Settings
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Hero section */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-indigo-100">
            <FileSearch size={14} />
            AI-Powered Analysis
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Resume Filter
          </h1>
          <p className="mt-2 text-gray-500 max-w-lg mx-auto text-sm sm:text-base">
            Upload resumes and define your criteria. Our AI analyzes each candidate and provides detailed shortlisting recommendations.
          </p>
        </header>

        {!results ? (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Step 1 — Upload */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">1</span>
                <h2 className="text-sm font-semibold text-gray-800">Upload Resumes</h2>
              </div>
              <FolderSelector
                showServerFolderPath={SHOW_SERVER_FOLDER_PATH}
                folderPath={folderPath}
                onFolderChange={setFolderPath}
                onFilesSelected={handleFilesSelected}
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-4 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-700 mb-1.5">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">2</span>
                <h2 className="text-sm font-semibold text-gray-800">Define Criteria</h2>
              </div>
              <CriteriaInput
                criteria={criteria}
                onCriteriaChange={setCriteria}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {jobHistory.length > 0 && !results && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <button
                  type="button"
                  className="w-full flex items-center justify-between"
                  onClick={() => setJobHistoryExpanded((prev) => !prev)}
                >
                  <div className="flex items-center gap-2">
                    <History className="text-gray-400" size={16} />
                    <span className="text-sm font-semibold text-gray-700">Recent Analyses</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{jobHistory.length}</span>
                  </div>
                  {jobHistoryExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {jobHistoryExpanded && (
                  <ul className="mt-3 max-h-56 overflow-y-auto divide-y divide-gray-50">
                    {jobHistory.map((job) => (
                      <li
                        key={job.id}
                        className="py-2.5 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {new Date(job.startedAt).toLocaleString()}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                job.success
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-red-50 text-red-500'
                              }`}
                            >
                              {job.success ? 'Success' : 'Error'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {job.total} resume{job.total === 1 ? '' : 's'} &middot;{' '}
                            {job.finishedAt
                              ? formatDuration(Date.parse(job.finishedAt) - Date.parse(job.startedAt))
                              : 'In progress'}
                          </div>
                          {job.error && (
                            <div className="text-xs text-red-500 mt-1 truncate">{job.error}</div>
                          )}
                        </div>
                        {job.results && (
                          <button
                            type="button"
                            className="ml-3 text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors"
                            onClick={() => {
                              setResults(job.results || null);
                              setError('');
                              setProgress(null);
                            }}
                          >
                            View
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Analyze button */}
            <div className="pt-2">
              <button
                onClick={handleAnalyze}
                disabled={loading || (!folderPath && uploadedFiles.length === 0) || !criteria}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    Analyzing Resumes...
                  </>
                ) : (
                  <>
                    <FileSearch size={18} />
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
      {(progress || lastJobSummary) && (
        <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm sm:max-w-xs">
          {progress && !isStatusPanelCollapsed && (
            <div className="bg-indigo-700 text-white shadow-2xl rounded-xl px-4 py-4 border border-indigo-300">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      Analyzing resumes…
                    </span>
                    <span className="text-xs bg-indigo-500/40 px-2 py-0.5 rounded-full">
                      {progress.currentIndex}/{progress.total}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-indigo-100 truncate max-w-[220px]">
                    Current file:{' '}
                    <span className="font-medium">
                      {progress.currentIndex === 0 && !progress.currentFileName
                        ? 'Preparing analysis…'
                        : progress.currentFileName || 'Processing…'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="text-indigo-200" size={18} />
                  <button
                    type="button"
                    onClick={() => setIsStatusPanelCollapsed(true)}
                    className="p-1 rounded-full hover:bg-indigo-600"
                    aria-label="Minimize progress panel"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-2 w-full h-2 bg-indigo-500/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/90 transition-all"
                  style={{
                    width:
                      progress.total > 0
                        ? `${Math.min(
                            100,
                            (progress.currentIndex / progress.total) * 100,
                          )}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-indigo-100">
                <span>Elapsed: {formatDuration(elapsedMs)}</span>
                <span>
                  ETA:{' '}
                  {progress.total > 0 && progress.currentIndex > 0
                    ? formatDuration(
                        (elapsedMs / progress.currentIndex) *
                          (progress.total - progress.currentIndex),
                      )
                    : 'Calculating…'}
                </span>
              </div>
              {recentFiles.length > 0 && (
                <div className="mt-3 border-t border-indigo-500/40 pt-2">
                  <div className="text-[11px] font-semibold mb-1">
                    Recent files
                  </div>
                  <ul className="space-y-0.5 max-h-20 overflow-y-auto text-[11px]">
                    {recentFiles.map((name) => (
                      <li key={name} className="truncate">
                        • {name}
                      </li>
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
              className="flex items-center justify-between w-full bg-indigo-700 text-white shadow-2xl rounded-full px-3 py-2 border border-indigo-300 text-xs"
            >
              <span className="flex items-center gap-2">
                <Clock size={14} />
                <span>
                  {progress.currentIndex}/{progress.total} resumes…
                </span>
              </span>
              <ChevronUp size={16} />
            </button>
          )}

          {!progress && lastJobSummary && !isStatusPanelCollapsed && (
            <div className="bg-emerald-700 text-white shadow-2xl rounded-xl px-4 py-4 border border-emerald-300">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-200" size={18} />
                    <span className="font-semibold text-sm">
                      Analysis complete
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-emerald-100">
                    {lastJobSummary.shortlisted}/{lastJobSummary.total} shortlisted •{' '}
                    {formatDuration(lastJobSummary.durationMs)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStatusPanelCollapsed(true)}
                  className="p-1 rounded-full hover:bg-emerald-600"
                  aria-label="Minimize summary panel"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="mt-3 flex justify-between items-center text-[11px] text-emerald-100">
                <span>
                  Finished:{' '}
                  {new Date(lastJobSummary.finishedAt).toLocaleTimeString()}
                </span>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full border border-emerald-200 text-xs hover:bg-emerald-600"
                  onClick={() => {
                    const historyMatch = jobHistory.find(
                      (j) => j.id === lastJobSummary.id && j.results,
                    );
                    if (historyMatch?.results) {
                      setResults(historyMatch.results);
                      setError('');
                    }
                  }}
                >
                  View results
                </button>
              </div>
            </div>
          )}

          {!progress && lastJobSummary && isStatusPanelCollapsed && (
            <button
              type="button"
              onClick={() => setIsStatusPanelCollapsed(false)}
              className="flex items-center justify-between w-full bg-emerald-700 text-white shadow-2xl rounded-full px-3 py-2 border border-emerald-300 text-xs"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>
                  {lastJobSummary.shortlisted}/{lastJobSummary.total} shortlisted
                </span>
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

