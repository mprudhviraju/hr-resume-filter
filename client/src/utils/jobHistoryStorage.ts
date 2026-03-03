import type { AnalysisResults } from '../types';

const JOB_HISTORY_STORAGE_KEY = 'hr_resume_filter_job_history';

export interface JobHistoryItem {
  id: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  success: boolean;
  results?: AnalysisResults;
  error?: string;
}

/**
 * Load job history from localStorage
 */
export function loadJobHistory(): JobHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(JOB_HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as JobHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save job history to localStorage
 */
export function saveJobHistory(items: JobHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(JOB_HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}
