import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  Calendar,
  FileSearch,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AnalysisResults } from '../types';
import ResultsDisplay from '../components/ResultsDisplay';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

interface RunSummary {
  userEmail: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
}

interface RunDetail {
  userEmail: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
  results: AnalysisResults;
}

function formatDuration(ms: number): string {
  if (ms <= 0 || Number.isNaN(ms)) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { authHeaders } = useAuth();

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/runs'), {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to load history');
        const data = (await res.json()) as { runs: RunSummary[] };
        setRuns(data.runs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewRun = async (run: RunSummary) => {
    setLoadingDetail(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/runs/${run.createdAt}`), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load run details');
      const data = (await res.json()) as { run: RunDetail };
      setSelectedRun(data.run);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const sortedRuns = [...runs].sort((a, b) =>
    sortNewestFirst ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
  );

  const grouped = sortedRuns.reduce<Record<string, RunSummary[]>>((acc, run) => {
    const key = formatDate(run.createdAt);
    (acc[key] ??= []).push(run);
    return acc;
  }, {});

  if (selectedRun) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedRun(null)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to History
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">
                  {formatDate(selectedRun.createdAt)} at {formatTime(selectedRun.createdAt)} &middot; {formatDuration(selectedRun.durationMs)}
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Criteria</h2>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{selectedRun.criteria}</p>
              </div>
              <div className="flex gap-3 text-center">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2">
                  <div className="text-lg font-bold text-emerald-700">{selectedRun.shortlistedCount}</div>
                  <div className="text-[10px] text-emerald-500 font-medium">Shortlisted</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2">
                  <div className="text-lg font-bold text-gray-600">{selectedRun.notShortlistedCount}</div>
                  <div className="text-[10px] text-gray-400 font-medium">Not Shortlisted</div>
                </div>
              </div>
            </div>
          </div>

          <ResultsDisplay
            results={selectedRun.results}
            onReset={() => setSelectedRun(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Analyzer
          </button>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <History className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Analysis History</h1>
                  <p className="text-indigo-200 text-sm mt-0.5">
                    Last 30 days of analysis runs
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Sort control */}
              {runs.length > 1 && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setSortNewestFirst((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowUpDown size={14} />
                    {sortNewestFirst ? 'Newest first' : 'Oldest first'}
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-16">
                  <FileSearch size={40} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-gray-600 mb-1">No analysis runs yet</h3>
                  <p className="text-sm text-gray-400">
                    Run your first resume analysis and it will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([date, dateRuns]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-gray-300" />
                        <span className="text-xs font-semibold text-gray-500">{date}</span>
                        <span className="text-[10px] text-gray-300">
                          ({daysAgo(dateRuns[0].createdAt)})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dateRuns.map((run) => (
                          <button
                            key={run.runId}
                            onClick={() => handleViewRun(run)}
                            disabled={loadingDetail}
                            className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-sm font-medium text-gray-800">
                                    {formatTime(run.createdAt)}
                                  </span>
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                    {run.totalResumes} resume{run.totalResumes !== 1 ? 's' : ''}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Clock size={10} />
                                    {formatDuration(run.durationMs)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{run.criteria}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                                    <CheckCircle2 size={12} />
                                    {run.shortlistedCount} shortlisted
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <XCircle size={12} />
                                    {run.notShortlistedCount} not shortlisted
                                  </span>
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-gray-300 group-hover:text-indigo-500 transition-colors">
                                {loadingDetail ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : (
                                  <ChevronRight size={18} />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
