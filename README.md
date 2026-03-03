# HR Resume Filter

An AI-powered application to analyze resumes and shortlist candidates based on defined criteria.

## Features

- 📄 Supports multiple resume formats: PDF, DOC, DOCX
- 🤖 AI-powered analysis using OpenAI GPT-4
- 📊 Detailed candidate shortlisting with reasoning
- 🎯 Customizable filtering criteria
- 💼 High-level summary of shortlisted candidates

## Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
```bash
cd server
cp .env.example .env
# Edit .env and add your OpenAI API key
```

3. Run the application:
```bash
npm run dev
```

The client will run on http://localhost:3000 and the server on http://localhost:5001

## Usage

### Option 1: Upload Resume Files (Recommended for Web)
1. Click "Upload Resume Files" and select multiple resume files (PDF, DOCX formats)
2. Define your filtering criteria (skills, experience, education, etc.)
3. Click "Analyze Resumes" to start the AI-powered analysis
4. Review the shortlisted candidates with detailed summaries and standout features

### Option 2: Server-Side Folder Path
1. Enter the full server-side folder path containing resumes (PDF, DOC, DOCX formats)
2. Define your filtering criteria (skills, experience, education, etc.)
3. Click "Analyze Resumes" to start the AI-powered analysis
4. Review the shortlisted candidates with detailed summaries and standout features

**Note**: DOC files require additional tools. It's recommended to convert them to DOCX or PDF format.

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **AI**: OpenAI GPT-4 API
- **Resume Parsing**: pdf-parse, mammoth

