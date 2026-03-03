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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filtering Criteria
      </label>
      <textarea
        value={criteria}
        onChange={(e) => onCriteriaChange(e.target.value)}
        placeholder={exampleCriteria}
        rows={8}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
      />
      <p className="mt-2 text-sm text-gray-500">
        Describe the requirements, skills, experience, and qualifications you're
        looking for in candidates.
      </p>
    </div>
  );
};

export default CriteriaInput;

