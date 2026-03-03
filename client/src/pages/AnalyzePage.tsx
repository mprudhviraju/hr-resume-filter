import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, History, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import FolderSelector from '../components/FolderSelector';
import CriteriaInput from '../components/CriteriaInput';
import ResultsDisplay from '../components/ResultsDisplay';
import { AnalysisResults } from '../types';
import { getStoredApiKey } from '../utils/apiKeyStorage';
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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
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

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setError('Please configure your OpenAI API key in Settings first');
      return;
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
      // #region agent log
      console.log('DEBUG: Starting analyze request');
      fetch('http://127.0.0.1:7242/ingest/2901d96b-8f49-4242-aa1e-7362b9a3280e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalyzePage.tsx:47',message:'handleAnalyze starting',data:{hasFolderPath:!!folderPath.trim(),uploadedFilesCount:uploadedFiles.length,hasCriteria:!!criteria.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

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
      
      // Add API key to form data (more reliable than headers with FormData)
      formData.append('apiKey', apiKey);

      const apiUrl = '/api/analyze';
      // #region agent log
      console.log('DEBUG: About to fetch from:', apiUrl);
      fetch('http://127.0.0.1:7242/ingest/2901d96b-8f49-4242-aa1e-7362b9a3280e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalyzePage.tsx:66',message:'About to fetch',data:{url:apiUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Step 1: create job
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server returned ${response.status} ${response.statusText}` };
        }
        console.error('DEBUG: Job creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      const { jobId, totalResumes } = await response.json();

      if (!jobId) {
        throw new Error('Job ID missing from server response');
      }

      setCurrentJobId(jobId);

      // Step 2: open SSE stream for progress & final results
      const streamUrl = `/api/analyze/${jobId}/stream`;
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
      // #region agent log
      const errorDetails = {
        name: err?.name,
        message: err?.message,
        stack: err?.stack?.substring(0,300),
        type: typeof err,
        isNetworkError: err?.message?.includes('fetch') || err?.message?.includes('Failed to fetch'),
        isTypeError: err?.name === 'TypeError'
      };
      console.error('DEBUG: Error caught:', errorDetails);
      fetch('http://127.0.0.1:7242/ingest/2901d96b-8f49-4242-aa1e-7362b9a3280e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalyzePage.tsx:95',message:'Error caught',data:errorDetails,timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            {/* Logo placeholder (replace with your logo component/image) */}
            <div className="flex-1 flex items-center justify-start" >
                <img src='https://www.mirabeltechnologies.com/wp-content/uploads/2022/05/Mirabel-gold-white-background.png'/>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                HR Resume Filter
              </h1>
              <p className="text-gray-600">
                AI-powered resume analysis and candidate shortlisting
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                <Settings size={20} />
                Settings
              </Link>
            </div>
          </div>
        </header>

        {!results ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <FolderSelector
                folderPath={folderPath}
                onFolderChange={setFolderPath}
                onFilesSelected={handleFilesSelected}
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-medium text-indigo-800 mb-2">
                    {uploadedFiles.length} file(s) selected:
                  </p>
                  <ul className="text-sm text-indigo-700 list-disc list-inside">
                    {uploadedFiles.map((file, idx) => (
                      <li key={idx}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <CriteriaInput
                criteria={criteria}
                onCriteriaChange={setCriteria}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {jobHistory.length > 0 && !results && (
              <div className="max-w-4xl mx-auto mb-6">
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="text-indigo-600" size={18} />
                      <h2 className="text-sm font-semibold text-gray-800">
                        Recent Analyses
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                      onClick={() => setJobHistoryExpanded((prev) => !prev)}
                    >
                      {jobHistoryExpanded ? 'Hide history' : 'Show history'}
                    </button>
                  </div>
                  {jobHistoryExpanded && (
                    <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                      {jobHistory.map((job) => (
                        <li
                          key={job.id}
                          className="py-2 flex items-center justify-between text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 truncate">
                                {new Date(job.startedAt).toLocaleString()}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  job.success
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {job.success ? 'Success' : 'Error'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-insufficient text-gray-600">
                              {job.total} resume
                              {job.total === 1 ? '' : 's'} •{' '}
                              {job.finishedAt
                                ? `Duration: ${formatDuration(
                                    Date.parse(job.finishedAt) -
                                      Date.parse(job.startedAt),
                                  )}`
                                : 'In progress'}
                            </div>
                            {job.error && (
                              <div className="text-xs text-red-600 mt-1 truncate">
                                {job.error}
                              </div>
                            )}
                          </div>
                          {job.results && (
                            <button
                              type="button"
                              className="ml-3 text-xs px-3 py-1 rounded-full border border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => {
                                setResults(job.results || null);
                                setError('');
                                setProgress(null);
                              }}
                            >
                              View results
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleAnalyze}
                disabled={loading || (!folderPath && uploadedFiles.length === 0) || !criteria}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analyzing Resumes...
                  </>
                ) : (
                  'Analyze Resumes'
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

