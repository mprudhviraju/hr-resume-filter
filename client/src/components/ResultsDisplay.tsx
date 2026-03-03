import { AnalysisResults } from '../types';
import { CheckCircle2, XCircle, Star, RotateCcw } from 'lucide-react';

interface ResultsDisplayProps {
  results: AnalysisResults;
  onReset: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  onReset,
}) => {
  const { shortlisted, notShortlisted, summary } = results;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Analysis Results
          </h2>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <RotateCcw size={18} />
            New Analysis
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={24} />
              <span className="text-lg font-semibold">
                {shortlisted.length} Shortlisted
              </span>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-gray-700">
              <XCircle size={24} />
              <span className="text-lg font-semibold">
                {notShortlisted.length} Not Shortlisted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Executive Summary
        </h3>
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {summary}
          </p>
        </div>
      </div>

      {/* Shortlisted Candidates */}
      {shortlisted.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-600" size={24} />
            Shortlisted Candidates ({shortlisted.length})
          </h3>
          <div className="space-y-6">
            {shortlisted.map((candidate, index) => (
              <CandidateCard
                key={index}
                candidate={candidate}
                isShortlisted={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not Shortlisted Candidates (Collapsible) */}
      {notShortlisted.length > 0 && (
        <details className="bg-white rounded-lg shadow-lg p-6">
          <summary className="text-xl font-semibold text-gray-800 cursor-pointer flex items-center gap-2">
            <XCircle className="text-gray-500" size={24} />
            Not Shortlisted ({notShortlisted.length})
          </summary>
          <div className="mt-4 space-y-4">
            {notShortlisted.map((candidate, index) => (
              <CandidateCard
                key={index}
                candidate={candidate}
                isShortlisted={false}
              />
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

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isShortlisted,
}) => {
  return (
    <div
      className={`border-2 rounded-lg p-5 ${
        isShortlisted
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">
            {candidate.extractedInfo.name || candidate.fileName}
          </h4>
          <p className="text-sm text-gray-600">{candidate.fileName}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {candidate.matchScore}%
          </div>
          <div className="text-xs text-gray-500">Match Score</div>
        </div>
      </div>

      {/* Extracted Info */}
      {(candidate.extractedInfo.email ||
        candidate.extractedInfo.phone ||
        candidate.extractedInfo.experience ||
        candidate.extractedInfo.education) && (
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          {candidate.extractedInfo.email && (
            <div>
              <span className="font-medium">Email:</span>{' '}
              {candidate.extractedInfo.email}
            </div>
          )}
          {candidate.extractedInfo.phone && (
            <div>
              <span className="font-medium">Phone:</span>{' '}
              {candidate.extractedInfo.phone}
            </div>
          )}
          {candidate.extractedInfo.experience && (
            <div>
              <span className="font-medium">Experience:</span>{' '}
              {candidate.extractedInfo.experience}
            </div>
          )}
          {candidate.extractedInfo.education && (
            <div>
              <span className="font-medium">Education:</span>{' '}
              {candidate.extractedInfo.education}
            </div>
          )}
        </div>
      )}

      {/* Skills */}
      {candidate.extractedInfo.skills &&
        candidate.extractedInfo.skills.length > 0 && (
          <div className="mb-4">
            <span className="font-medium text-sm">Skills: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {candidate.extractedInfo.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Summary */}
      <div className="mb-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {candidate.summary}
        </p>
      </div>

      {/* Reasons */}
      <div className="mb-4">
        <h5 className="font-semibold text-sm text-gray-800 mb-2">
          {isShortlisted ? 'Shortlisting Reasons:' : 'Not Shortlisted Because:'}
        </h5>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          {candidate.reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* Standout Features */}
      {isShortlisted && candidate.standoutFeatures.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h5 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
            <Star className="text-yellow-500" size={16} />
            Standout Features:
          </h5>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {candidate.standoutFeatures.map((feature, idx) => (
              <li key={idx} className="text-indigo-700">
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

