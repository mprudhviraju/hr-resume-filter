interface CriteriaInputProps {
  criteria: string;
  onCriteriaChange: (criteria: string) => void;
}

const CriteriaInput: React.FC<CriteriaInputProps> = ({
  criteria,
  onCriteriaChange,
}) => {
  const exampleCriteria = `Example criteria:
- Minimum 5 years of experience in software development
- Proficiency in React, TypeScript, and Node.js
- Bachelor's degree in Computer Science or related field
- Experience with cloud platforms (AWS, Azure, or GCP)
- Strong problem-solving and communication skills`;

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        Filtering Criteria
      </label>
      <textarea
        value={criteria}
        onChange={(e) => onCriteriaChange(e.target.value)}
        placeholder={exampleCriteria}
        rows={6}
        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white resize-none transition-colors placeholder:text-gray-300"
      />
      <p className="mt-1.5 text-xs text-gray-400">
        Describe the skills, experience, education, and qualifications you need.
      </p>
    </div>
  );
};

export default CriteriaInput;
