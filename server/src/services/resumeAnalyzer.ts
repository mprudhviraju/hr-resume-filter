import OpenAI from 'openai';
import { ParsedResume } from './resumeParser';
import { getDefaultOpenAIKey } from '../config/openaiKeyStore';

/**
 * Get OpenAI client instance (lazy initialization).
 * Priority: explicit API key from request > PostgreSQL-stored key > environment variable.
 */
async function getOpenAIClient(apiKeyFromRequest?: string): Promise<OpenAI> {
  const apiKey = apiKeyFromRequest || (await getDefaultOpenAIKey());

  if (!apiKey) {
    throw new Error(
      'OpenAI API key is required. Provide it in the X-OpenAI-API-Key header, store it in PostgreSQL, or set OPENAI_API_KEY environment variable.'
    );
  }

  return new OpenAI({
    apiKey,
  });
}

export interface CandidateAnalysis {
  fileName: string;
  shortlisted: boolean;
  matchScore: number; // 0-100
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

/**
 * Analyze a single resume using OpenAI
 */
async function analyzeSingleResume(
  resume: ParsedResume,
  criteria: string,
  apiKey?: string
): Promise<CandidateAnalysis> {
  const prompt = `You are an expert HR recruiter analyzing resumes. 

RESUME CONTENT:
${resume.content}

FILTERING CRITERIA:
${criteria}

Please analyze this resume and provide:
1. Whether this candidate should be SHORTLISTED (true/false) based on the criteria
2. A match score from 0-100 indicating how well they match the criteria
3. Specific reasons for shortlisting or not shortlisting (3-5 bullet points)
4. Standout features that make this candidate exceptional (2-4 bullet points)
5. A brief professional summary (2-3 sentences)
6. Extract key information: name, email, phone, years of experience, education level, key skills

Respond in JSON format:
{
  "shortlisted": boolean,
  "matchScore": number,
  "reasons": string[],
  "standoutFeatures": string[],
  "summary": string,
  "extractedInfo": {
    "name": string,
    "email": string,
    "phone": string,
    "experience": string,
    "education": string,
    "skills": string[]
  }
}`;
  try {
    const openai = await getOpenAIClient(apiKey);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR recruiter. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(responseContent) as Omit<CandidateAnalysis, 'fileName'>;
    
    return {
      ...analysis,
      fileName: resume.fileName,
    };
  } catch (error: any) {
    console.error(`Error analyzing resume ${resume.fileName}:`, error);
    // Return a default analysis if AI fails
    const errorMessage = error?.message || 'Unknown error';
    return {
      fileName: resume.fileName,
      shortlisted: false,
      matchScore: 0,
      reasons: [`Failed to analyze resume: ${errorMessage}`],
      standoutFeatures: [],
      summary: 'Analysis failed - ' + errorMessage,
      extractedInfo: {},
    };
  }
}

/**
 * Progress callback: (currentIndex, total, currentFileName) => void
 */
export type ProgressCallback = (currentIndex: number, total: number, currentFileName: string) => void;

/**
 * Analyze multiple resumes with optional progress callback (processes one-by-one for progress)
 */
export async function analyzeResumesWithProgress(
  resumes: ParsedResume[],
  criteria: string,
  apiKey?: string,
  onProgress?: ProgressCallback
): Promise<AnalysisResults> {
  console.log(`Analyzing ${resumes.length} resumes...`);
  const total = resumes.length;
  const analyses: CandidateAnalysis[] = [];

  for (let i = 0; i < resumes.length; i++) {
    const resume = resumes[i];
    const analysis = await analyzeSingleResume(resume, criteria, apiKey);
    analyses.push(analysis);
    onProgress?.(i + 1, total, resume.fileName);
  }

  const shortlisted = analyses.filter((a) => a.shortlisted).sort((a, b) => b.matchScore - a.matchScore);
  const notShortlisted = analyses.filter((a) => !a.shortlisted);
  const summary = await generateOverallSummary(shortlisted, criteria, apiKey);

  return {
    shortlisted,
    notShortlisted,
    summary,
  };
}

/**
 * Analyze multiple resumes and generate overall summary
 */
export async function analyzeResumes(
  resumes: ParsedResume[],
  criteria: string,
  apiKey?: string
): Promise<AnalysisResults> {
  return analyzeResumesWithProgress(resumes, criteria, apiKey);
}

/**
 * Generate an overall summary of shortlisted candidates
 */
async function generateOverallSummary(
  shortlisted: CandidateAnalysis[],
  criteria: string,
  apiKey?: string
): Promise<string> {
  if (shortlisted.length === 0) {
    return 'No candidates were shortlisted based on the provided criteria.';
  }

  const shortlistedSummary = shortlisted
    .map(
      (c) => `- ${c.fileName}: ${c.summary} (Match Score: ${c.matchScore}%)`
    )
    .join('\n');

  const prompt = `You are an HR manager providing a high-level summary of shortlisted candidates.

FILTERING CRITERIA:
${criteria}

SHORTLISTED CANDIDATES:
${shortlistedSummary}

Provide a comprehensive executive summary (3-4 paragraphs) covering:
1. Overview of the shortlisting results
2. Common strengths and patterns among shortlisted candidates
3. Key differentiators and standout qualities
4. Recommendations for next steps in the hiring process

Write in a professional, executive-friendly tone.`;

  try {
    const openai = await getOpenAIClient(apiKey);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced HR manager writing executive summaries.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || 'Summary generation failed.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return `Successfully shortlisted ${shortlisted.length} candidate(s) based on the provided criteria. Review individual candidate analyses for detailed insights.`;
  }
}

