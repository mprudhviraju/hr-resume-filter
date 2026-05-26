import { AnalysisResults } from '../types';
import { CheckCircle2, XCircle, Star, RotateCcw, Mail, Phone, Briefcase, GraduationCap } from 'lucide-react';

interface ResultsDisplayProps {
  results: AnalysisResults;
  onReset: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, onReset }) => {
  const { shortlisted, notShortlisted, summary } = results;
  const total = shortlisted.length + notShortlisted.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stats bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
            <p className="text-sm text-gray-400 mt-0.5">{total} candidate{total !== 1 ? 's' : ''} analyzed</p>
          </div>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            New Analysis
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{shortlisted.length}</div>
              <div className="text-xs text-emerald-500 font-medium">Shortlisted</div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <XCircle size={20} className="text-gray-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">{notShortlisted.length}</div>
              <div className="text-xs text-gray-400 font-medium">Not Shortlisted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Executive Summary</h3>
        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{summary}</p>
      </div>

      {/* Shortlisted */}
      {shortlisted.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Shortlisted Candidates ({shortlisted.length})
          </h3>
          <div className="space-y-4">
            {shortlisted.map((candidate, index) => (
              <CandidateCard key={index} candidate={candidate} isShortlisted />
            ))}
          </div>
        </div>
      )}

      {/* Not Shortlisted */}
      {notShortlisted.length > 0 && (
        <details className="group">
          <summary className="text-sm font-semibold text-gray-600 cursor-pointer flex items-center gap-2 mb-3 select-none">
            <XCircle size={16} className="text-gray-400" />
            Not Shortlisted ({notShortlisted.length})
            <span className="text-xs text-gray-400 font-normal ml-1">click to expand</span>
          </summary>
          <div className="space-y-4">
            {notShortlisted.map((candidate, index) => (
              <CandidateCard key={index} candidate={candidate} isShortlisted={false} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

interface CandidateCardProps {
  candidate: AnalysisResults['shortlisted'][0];
  isShortlisted: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, isShortlisted }) => {
  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
      isShortlisted ? 'border-emerald-100' : 'border-gray-100'
    }`}>
      {/* Header row */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="min-w-0">
          <h4 className="text-base font-bold text-gray-900 truncate">
            {candidate.extractedInfo.name || candidate.fileName}
          </h4>
          {candidate.extractedInfo.name && (
            <p className="text-xs text-gray-400 truncate">{candidate.fileName}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-center">
          <div className={`text-xl font-extrabold ${
            candidate.matchScore >= 70 ? 'text-emerald-600' :
            candidate.matchScore >= 40 ? 'text-amber-500' : 'text-gray-400'
          }`}>
            {candidate.matchScore}%
          </div>
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Match</div>
        </div>
      </div>

      {/* Contact info */}
      {(candidate.extractedInfo.email || candidate.extractedInfo.phone ||
        candidate.extractedInfo.experience || candidate.extractedInfo.education) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-4 text-xs text-gray-500">
          {candidate.extractedInfo.email && (
            <span className="flex items-center gap-1.5 truncate">
              <Mail size={12} className="text-gray-300 flex-shrink-0" />
              {candidate.extractedInfo.email}
            </span>
          )}
          {candidate.extractedInfo.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={12} className="text-gray-300 flex-shrink-0" />
              {candidate.extractedInfo.phone}
            </span>
          )}
          {candidate.extractedInfo.experience && (
            <span className="flex items-center gap-1.5">
              <Briefcase size={12} className="text-gray-300 flex-shrink-0" />
              {candidate.extractedInfo.experience}
            </span>
          )}
          {candidate.extractedInfo.education && (
            <span className="flex items-center gap-1.5 truncate">
              <GraduationCap size={12} className="text-gray-300 flex-shrink-0" />
              {candidate.extractedInfo.education}
            </span>
          )}
        </div>
      )}

      {/* Skills */}
      {candidate.extractedInfo.skills && candidate.extractedInfo.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {candidate.extractedInfo.skills.map((skill, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-medium">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-gray-600 leading-relaxed mb-4">{candidate.summary}</p>

      {/* Reasons */}
      <div className="mb-3">
        <h5 className="text-xs font-semibold text-gray-700 mb-1.5">
          {isShortlisted ? 'Why Shortlisted' : 'Why Not Shortlisted'}
        </h5>
        <ul className="space-y-1 text-xs text-gray-500">
          {candidate.reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="mt-1 block h-1 w-1 rounded-full bg-gray-300 flex-shrink-0" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Standout */}
      {isShortlisted && candidate.standoutFeatures.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <h5 className="text-xs font-semibold text-amber-600 mb-1.5 flex items-center gap-1.5">
            <Star size={12} className="text-amber-400" />
            Standout Features
          </h5>
          <ul className="space-y-1 text-xs text-gray-600">
            {candidate.standoutFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="mt-1 block h-1 w-1 rounded-full bg-amber-300 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
