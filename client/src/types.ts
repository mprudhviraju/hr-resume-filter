export interface CandidateAnalysis {
  fileName: string;
  shortlisted: boolean;
  matchScore: number;
  reasons: string[];
  standoutFeatures: string[];
  summary: string;
  extractedInfo: {
    name?: string;
    email?: string;
    phone?: string;
    experience?: string;
    education?: string;
    skills?: string[];
  };
}

export interface AnalysisResults {
  shortlisted: CandidateAnalysis[];
  notShortlisted: CandidateAnalysis[];
  summary: string;
}

