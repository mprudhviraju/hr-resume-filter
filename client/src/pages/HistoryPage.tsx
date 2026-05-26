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

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const { authHeaders } = useAuth();

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  const [page, setPage] = useState(0);

  const fetchRuns = async () => {
    setLoading(true);
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

  const handleViewRun = async (run: RunSummary) => {
    setLoadingDetail(run.runId);
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
      setLoadingDetail(null);
    }
  };

  const totalResumes = runs.reduce((s, r) => s + r.totalResumes, 0);
  const totalShortlisted = runs.reduce((s, r) => s + r.shortlistedCount, 0);
  const totalNotShortlisted = runs.reduce((s, r) => s + r.notShortlistedCount, 0);

  const totalPages = Math.ceil(runs.length / PAGE_SIZE);
  const pageRuns = runs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats: StatCardItem[] = [
    { label: 'Total Runs', value: runs.length, color: 'blue', icon: Info, subtitle: 'Analyses in last 30 days' },
    { label: 'Total Resumes', value: totalResumes.toLocaleString(), color: 'blue', subtitle: 'Resumes analyzed' },
    { label: 'Shortlisted', value: totalShortlisted.toLocaleString(), color: 'green', subtitle: 'Candidates shortlisted' },
    { label: 'Not Shortlisted', value: totalNotShortlisted.toLocaleString(), color: 'red', subtitle: 'Candidates not shortlisted' },
  ];

  if (selectedRun) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <NavBar />
        <div className="px-4 sm:px-6 py-5">
          <button
            onClick={() => setSelectedRun(null)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to History
          </button>

          {/* Run metadata bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-[11px] text-gray-400 mb-1">
                  {formatDate(selectedRun.createdAt)} at {formatTime(selectedRun.createdAt)} &middot; {formatDuration(selectedRun.durationMs)}
                </div>
                <p className="text-sm text-gray-700">{selectedRun.criteria}</p>
              </div>
              <div className="flex gap-3 text-center shrink-0">
                <div className="bg-emerald-50 border border-emerald-100 rounded px-3 py-1.5">
                  <div className="text-lg font-bold text-emerald-600">{selectedRun.shortlistedCount}</div>
                  <div className="text-[10px] text-emerald-500">Shortlisted</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                  <div className="text-lg font-bold text-gray-500">{selectedRun.notShortlistedCount}</div>
                  <div className="text-[10px] text-gray-400">Not Shortlisted</div>
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
    <div className="min-h-screen bg-[#f5f6f8]">
      <NavBar />

      <div className="px-4 sm:px-6 py-5 space-y-4">
        {/* Stats row */}
        {!loading && runs.length > 0 && <StatCards items={stats} />}

        {/* Toolbar */}
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={14} className="text-gray-400" />
            <span>Last 30 days</span>
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5f6f8] border-b border-gray-200">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Criteria</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Resumes</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Shortlisted</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Not Shortlisted</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Duration</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRuns.map((run) => (
                  <tr
                    key={run.runId}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    onClick={() => handleViewRun(run)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatDate(run.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(run.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{run.criteria}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 text-center font-medium">{run.totalResumes}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        {run.shortlistedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-100">
                        {run.notShortlistedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(run.durationMs)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewRun(run);
                        }}
                        disabled={loadingDetail === run.runId}
                        className="text-xs px-3 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors border border-indigo-100"
                      >
                        {loadingDetail === run.runId ? (
                          <Loader2 size={12} className="animate-spin inline" />
                        ) : (
                          'View'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
