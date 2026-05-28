import { useState } from 'react';
import { AnalysisResults } from '../types';
import { CheckCircle2, XCircle, Star, RotateCcw, Mail, Phone, Briefcase, GraduationCap, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { StatCards, type StatCardItem } from './StatCards';

interface ResultsDisplayProps {
  results: AnalysisResults;
  onReset: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, onReset }) => {
  const { shortlisted, notShortlisted, summary } = results;
  const total = shortlisted.length + notShortlisted.length;
  const [showNotShortlisted, setShowNotShortlisted] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const stats: StatCardItem[] = [
    { label: 'Total Candidates', value: total, color: 'ocean', icon: Info, subtitle: 'Resumes analyzed' },
    { label: 'Shortlisted', value: shortlisted.length, color: 'green', subtitle: 'Recommended candidates' },
    { label: 'Not Shortlisted', value: notShortlisted.length, color: 'red', subtitle: 'Did not meet criteria' },
    {
      label: 'Avg Match Score',
      value: total > 0
        ? `${Math.round([...shortlisted, ...notShortlisted].reduce((s, c) => s + c.matchScore, 0) / total)}%`
        : '—',
      color: 'amber',
      subtitle: 'Across all candidates',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <StatCards items={stats} />

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-500">{total} candidate{total !== 1 ? 's' : ''} analyzed</span>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          <RotateCcw size={13} />
          New Analysis
        </button>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Executive Summary</h3>
        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{summary}</p>
      </div>

      {/* Shortlisted table */}
      {shortlisted.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--color-success-500)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Shortlisted Candidates ({shortlisted.length})</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Match</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shortlisted.map((c, i) => (
                <CandidateRow
                  key={i}
                  candidate={c}
                  isShortlisted
                  expanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Not shortlisted table */}
      {notShortlisted.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowNotShortlisted(!showNotShortlisted)}
            className="w-full px-4 py-3 bg-[#f5f6f8] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Not Shortlisted ({notShortlisted.length})</span>
            </div>
            {showNotShortlisted ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          {showNotShortlisted && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">Match</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {notShortlisted.map((c, i) => (
                  <CandidateRow
                    key={i}
                    candidate={c}
                    isShortlisted={false}
                    expanded={expandedIdx === shortlisted.length + i}
                    onToggle={() =>
                      setExpandedIdx(
                        expandedIdx === shortlisted.length + i ? null : shortlisted.length + i,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

interface CandidateRowProps {
  candidate: AnalysisResults['shortlisted'][0];
  isShortlisted: boolean;
  expanded: boolean;
  onToggle: () => void;
}

const CandidateRow: React.FC<CandidateRowProps> = ({ candidate, isShortlisted, expanded, onToggle }) => {
  const scoreColor =
    candidate.matchScore >= 70 ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
    : candidate.matchScore >= 40 ? 'text-amber-600 bg-amber-50 border-amber-100'
    : 'text-gray-500 bg-gray-50 border-gray-200';

  return (
    <>
      <tr
        className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-gray-800">
            {candidate.extractedInfo.name || candidate.fileName}
          </div>
          {candidate.extractedInfo.name && (
            <div className="text-[11px] text-gray-400">{candidate.fileName}</div>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {candidate.extractedInfo.experience || '—'}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${scoreColor}`}>
            {candidate.matchScore}%
          </span>
        </td>
        <td className="px-4 py-3">
          {isShortlisted ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 size={10} /> Shortlisted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-100">
              <XCircle size={10} /> Not Selected
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {candidate.extractedInfo.email && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <Mail size={11} className="text-gray-300 shrink-0" />
                {candidate.extractedInfo.email}
              </span>
            )}
            {candidate.extractedInfo.phone && (
              <span className="flex items-center gap-1">
                <Phone size={11} className="text-gray-300 shrink-0" />
                {candidate.extractedInfo.phone}
              </span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-gray-50 px-4 py-4 border-t border-gray-100">
            <div className="max-w-3xl space-y-3">
              {/* Info row */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {candidate.extractedInfo.education && (
                  <span className="flex items-center gap-1">
                    <GraduationCap size={12} className="text-gray-300" />
                    {candidate.extractedInfo.education}
                  </span>
                )}
                {candidate.extractedInfo.experience && (
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} className="text-gray-300" />
                    {candidate.extractedInfo.experience}
                  </span>
                )}
              </div>

              {/* Skills */}
              {candidate.extractedInfo.skills && candidate.extractedInfo.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.extractedInfo.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[11px] font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary */}
              <p className="text-sm text-gray-600 leading-relaxed">{candidate.summary}</p>

              {/* Evidence (AI tooling) */}
              {candidate.aiToolingEvidence && (
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    AI tooling evidence
                  </h5>
                  <div className="text-xs text-gray-600">
                    <div className="mb-1">
                      <span className="font-semibold">Present:</span>{' '}
                      {candidate.aiToolingEvidence.present ? 'Yes' : 'No (not found in resume)'}
                    </div>
                    {candidate.aiToolingEvidence.toolsMentioned?.length > 0 && (
                      <div className="mb-1">
                        <span className="font-semibold">Tools:</span>{' '}
                        {candidate.aiToolingEvidence.toolsMentioned.join(', ')}
                      </div>
                    )}
                    {candidate.aiToolingEvidence.evidenceQuotes?.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {candidate.aiToolingEvidence.evidenceQuotes.slice(0, 4).map((q, idx) => (
                          <li key={idx} className="text-[11px] text-gray-500 whitespace-pre-wrap">
                            “{q}”
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[11px] text-gray-500">
                        No resume quotes provided.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reasons */}
              <div>
                <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isShortlisted ? 'Why Shortlisted' : 'Why Not Shortlisted'}
                </h5>
                <ul className="space-y-0.5 text-xs text-gray-500">
                  {candidate.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="mt-1.5 block h-1 w-1 rounded-full bg-gray-300 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Standout */}
              {isShortlisted && candidate.standoutFeatures.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <h5 className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Star size={11} className="text-amber-400" />
                    Standout Features
                  </h5>
                  <ul className="space-y-0.5 text-xs text-gray-600">
                    {candidate.standoutFeatures.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="mt-1.5 block h-1 w-1 rounded-full bg-amber-300 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ResultsDisplay;
