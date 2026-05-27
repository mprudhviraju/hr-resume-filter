import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileSearch,
  Info,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AnalysisResults } from '../types';
import ResultsDisplay from '../components/ResultsDisplay';
import NavBar from '../components/NavBar';
import { StatCards, type StatCardItem } from '../components/StatCards';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

interface RunSummary {
  userEmail: string;
  userName?: string;
  createdAt: number;
  runId: string;
  criteria: string;
  totalResumes: number;
  shortlistedCount: number;
  notShortlistedCount: number;
  durationMs: number;
}

interface RunDetail extends RunSummary {
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
    month: '2-digit',
    day: '2-digit',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function runByLabel(run: RunSummary): string {
  return run.userName?.trim() || run.userEmail;
}

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const { authHeaders, isAdmin } = useAuth();

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [page, setPage] = useState(0);

  const fetchRuns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/runs?limit=100'), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load history');
      const data = (await res.json()) as { runs: RunSummary[] };
      setRuns(data.runs.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runDetailUrl = (run: RunSummary) => {
    const params = new URLSearchParams();
    if (isAdmin) {
      params.set('userEmail', run.userEmail);
    }
    const qs = params.toString();
    return apiUrl(`/api/runs/${run.createdAt}${qs ? `?${qs}` : ''}`);
  };

  const handleViewRun = async (run: RunSummary) => {
    setLoadingDetail(run.runId);
    setError('');
    try {
      const res = await fetch(runDetailUrl(run), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load run details');
      const data = (await res.json()) as { run: RunDetail };
      setSelectedRun(data.run);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleDeleteRun = async (run: RunSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const label = runByLabel(run);
    if (
      !window.confirm(
        `Delete this analysis run by ${label}?\n\nThis permanently removes the results from the database and any uploaded resume files.`,
      )
    ) {
      return;
    }

    const key = `${run.userEmail}-${run.createdAt}`;
    setDeletingKey(key);
    setError('');
    try {
      const params = new URLSearchParams({ userEmail: run.userEmail });
      const res = await fetch(
        apiUrl(`/api/runs/${run.createdAt}?${params}`),
        { method: 'DELETE', headers: authHeaders() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Failed to delete run');
      }
      if (selectedRun?.createdAt === run.createdAt && selectedRun.userEmail === run.userEmail) {
        setSelectedRun(null);
      }
      setRuns((prev) =>
        prev.filter(
          (r) => !(r.userEmail === run.userEmail && r.createdAt === run.createdAt),
        ),
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingKey(null);
    }
  };

  const totalResumes = runs.reduce((s, r) => s + r.totalResumes, 0);
  const totalShortlisted = runs.reduce((s, r) => s + r.shortlistedCount, 0);
  const totalNotShortlisted = runs.reduce((s, r) => s + r.notShortlistedCount, 0);

  const totalPages = Math.ceil(runs.length / PAGE_SIZE);
  const pageRuns = runs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats: StatCardItem[] = [
    { label: 'Total Runs', value: runs.length, color: 'ocean', icon: Info, subtitle: isAdmin ? 'All users, last 30 days' : 'Your analyses, last 30 days' },
    { label: 'Total Resumes', value: totalResumes.toLocaleString(), color: 'ocean', subtitle: 'Resumes analyzed' },
    { label: 'Shortlisted', value: totalShortlisted.toLocaleString(), color: 'green', subtitle: 'Candidates shortlisted' },
    { label: 'Not Shortlisted', value: totalNotShortlisted.toLocaleString(), color: 'red', subtitle: 'Candidates not shortlisted' },
  ];

  if (selectedRun) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-subtle)' }}>
        <NavBar />
        <div className="px-4 sm:px-6 py-5">
          <button
            onClick={() => setSelectedRun(null)}
            className="inline-flex items-center gap-1.5 text-xs hover:text-gray-800 mb-4"
            style={{ color: 'var(--text-secondary)', transition: `all var(--duration-normal) var(--ease-out)` }}
          >
            <ArrowLeft size={14} />
            Back to History
          </button>

          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-[11px] text-gray-400 mb-1 flex flex-wrap items-center gap-2">
                  <span>
                    {formatDate(selectedRun.createdAt)} at {formatTime(selectedRun.createdAt)} &middot; {formatDuration(selectedRun.durationMs)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    <User size={10} />
                    {runByLabel(selectedRun)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{selectedRun.criteria}</p>
              </div>
              <div className="flex gap-3 text-center shrink-0 items-start">
                <div className="bg-emerald-50 border border-emerald-100 rounded px-3 py-1.5">
                  <div className="text-lg font-bold text-emerald-600">{selectedRun.shortlistedCount}</div>
                  <div className="text-[10px] text-emerald-500">Shortlisted</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                  <div className="text-lg font-bold text-gray-500">{selectedRun.notShortlistedCount}</div>
                  <div className="text-[10px] text-gray-400">Not Shortlisted</div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRun(selectedRun, e)}
                    disabled={deletingKey === `${selectedRun.userEmail}-${selectedRun.createdAt}`}
                    className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete run"
                  >
                    {deletingKey === `${selectedRun.userEmail}-${selectedRun.createdAt}` ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-subtle)' }}>
      <NavBar />

      <div className="px-4 sm:px-6 py-5 space-y-4">
        {!loading && runs.length > 0 && <StatCards items={stats} />}

        <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={14} className="text-gray-400" />
            <span>{isAdmin ? 'All users · last 30 days' : 'Last 30 days'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {runs.length === 0
                ? 'No runs'
                : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, runs.length)} of ${runs.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={fetchRuns}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-20">
              <FileSearch size={36} className="text-gray-200 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-600 mb-1">No analysis runs yet</h3>
              <p className="text-xs text-gray-400">
                Run your first resume analysis and it will appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', height: 'var(--table-header-height)' }}>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Date</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Time</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Run by</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Criteria</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>Resumes</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>Shortlisted</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>Not Shortlisted</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>Duration</th>
                  <th className="px-4 text-[11px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRuns.map((run) => {
                  const deleteKey = `${run.userEmail}-${run.createdAt}`;
                  return (
                    <tr
                      key={deleteKey}
                      className="cursor-pointer"
                      style={{ height: 'var(--table-row-height)', transition: `background var(--duration-normal) var(--ease-out)` }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-ocean-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => handleViewRun(run)}
                    >
                      <td className="px-4 text-sm whitespace-nowrap" style={{ color: 'var(--color-ocean-800)', fontWeight: 600 }}>{formatDate(run.createdAt)}</td>
                      <td className="px-4 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatTime(run.createdAt)}</td>
                      <td className="px-4 text-xs max-w-[180px]">
                        <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{runByLabel(run)}</div>
                        {run.userName && (
                          <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{run.userEmail}</div>
                        )}
                      </td>
                      <td className="px-4 text-xs max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>{run.criteria}</td>
                      <td className="px-4 text-xs text-center font-medium" style={{ color: 'var(--text-secondary)' }}>{run.totalResumes}</td>
                      <td className="px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-success-50)', color: 'var(--color-success-600)', border: '1px solid var(--color-success-100)' }}>
                          {run.shortlistedCount}
                        </span>
                      </td>
                      <td className="px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-error-50)', color: 'var(--color-error-600)', border: '1px solid var(--color-error-100)' }}>
                          {run.notShortlistedCount}
                        </span>
                      </td>
                      <td className="px-4 text-xs text-center whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {formatDuration(run.durationMs)}
                        </span>
                      </td>
                      <td className="px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewRun(run)}
                            disabled={loadingDetail === run.runId}
                            className="text-xs px-3 py-1 rounded font-medium"
                            style={{ backgroundColor: 'var(--color-ocean-50)', color: 'var(--color-ocean-700)', border: '1px solid var(--color-ocean-100)' }}
                          >
                            {loadingDetail === run.runId ? (
                              <Loader2 size={12} className="animate-spin inline" />
                            ) : (
                              'View'
                            )}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDeleteRun(run, e)}
                              disabled={deletingKey === deleteKey}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50 border border-red-100"
                              title="Delete run"
                            >
                              {deletingKey === deleteKey ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
