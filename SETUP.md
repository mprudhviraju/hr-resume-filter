# Setup Instructions

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation Steps

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the `server` directory:
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8787
   ```

   **Ports:** Defaults use **8787** for the API (see `server/src/index.ts` and `server/.env.example`) to reduce clashes with **5000** (macOS AirPlay), **8080** (many dev tools), and **3000** (Vite). If you change `PORT`, update `client/vite.config.ts` `proxy['/api'].target` to match.

3. **Start the development servers:**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Frontend server on http://localhost:3000
   - Backend API on http://localhost:8787 by default (or whatever you set in `PORT`)

## Project Structure

```
HR Resume Filter/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx        # Main app component
│   │   └── types.ts       # TypeScript types
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── services/      # Business logic
│   │   │   ├── resumeParser.ts
│   │   │   └── resumeAnalyzer.ts
│   │   └── index.ts       # Express server
│   └── package.json
└── package.json           # Root package.json
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/analyze` - Analyze resumes (accepts file uploads or folder path)

## AWS deployment (Amplify + Lambda)

See **[DEPLOY.md](./DEPLOY.md)** for production deployment steps.

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY is not defined"**
   - Make sure you've created the `.env` file in the `server` directory
   - Verify your API key is correct

2. **"Port already in use" (`EADDRINUSE`)**
   - Another process (or an old Node server) is using that port. Find and stop it, e.g. `lsof -i :8787` then `kill <pid>`, or pick a free port and set **`PORT`** in `server/.env` **and** the Vite **`proxy`** target in `client/vite.config.ts` to the same value.

3. **"Failed to parse DOC file"**
   - DOC files require additional tools. Convert them to DOCX or PDF format

4. **CORS errors**
   - Make sure both servers are running on the correct ports
   - Check that the frontend proxy in `client/vite.config.ts` points at the same host/port as the backend (default `http://localhost:8787`)

