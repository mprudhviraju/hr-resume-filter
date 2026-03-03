# Quick Start Guide

## 1. Install Dependencies

```bash
npm run install:all
```

## 2. Configure OpenAI API Key

Create `server/.env` file:
```bash
cd server
echo "OPENAI_API_KEY=your_api_key_here" > .env
echo "PORT=5000" >> .env
```

Replace `your_api_key_here` with your actual OpenAI API key from https://platform.openai.com/api-keys

## 3. Start the Application

```bash
npm run dev
```

This starts both frontend (http://localhost:3000) and backend (http://localhost:5000)

## 4. Use the Application

1. **Upload Resumes**: Click "Upload Resume Files" and select PDF/DOCX files
   OR
   Enter a server-side folder path containing resumes

2. **Enter Criteria**: Describe what you're looking for, e.g.:
   ```
   - Minimum 5 years of experience in software development
   - Proficiency in React, TypeScript, and Node.js
   - Bachelor's degree in Computer Science
   - Experience with cloud platforms (AWS, Azure, or GCP)
   ```

3. **Analyze**: Click "Analyze Resumes" and wait for AI analysis

4. **Review Results**: See shortlisted candidates with:
   - Match scores
   - Shortlisting reasons
   - Standout features
   - Extracted contact information
   - Executive summary

## Example Criteria

Here are some example criteria you can use:

**Software Engineer:**
- 3+ years of experience in full-stack development
- Proficiency in JavaScript/TypeScript, React, Node.js
- Experience with databases (PostgreSQL, MongoDB)
- Knowledge of cloud platforms (AWS preferred)
- Strong problem-solving and communication skills

**Data Scientist:**
- Master's degree in Data Science, Statistics, or related field
- 2+ years of experience in machine learning
- Proficiency in Python, R, SQL
- Experience with ML frameworks (TensorFlow, PyTorch)
- Strong statistical analysis skills

**Product Manager:**
- 5+ years of product management experience
- Experience with agile methodologies
- Strong analytical and strategic thinking
- Excellent communication and leadership skills
- Technical background preferred

