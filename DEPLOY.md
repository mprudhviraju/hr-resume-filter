# Deploy to AWS (Amplify + Lambda)

This guide deploys the **React client** to [AWS Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html) and the **API** to **Lambda** behind an **HTTP API**, with job state in **DynamoDB**.

## Architecture

- **Amplify** — static SPA from `client/` (`amplify.yml` at repo root)
- **SAM stack** (`server/template.yaml`) — API Lambda, stream Lambda, DynamoDB, HTTP API
- **Client** — `VITE_API_BASE_URL` points at the HTTP API URL

## Prerequisites

- Node.js 18+
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Git repository connected to GitHub/GitLab/CodeCommit (for Amplify)

### Install SAM + AWS CLI on macOS (if `sam: command not found`)

```bash
brew install aws-sam-cli awscli
sam --version
aws --version
aws configure   # Access Key, Secret, region (e.g. us-east-1)
```

If `sam` is still not found, open a **new terminal** or run `hash -r` so your shell picks up Homebrew’s `/opt/homebrew/bin`.

## 1. Deploy the API (Lambda)

```bash
cd server
npm install
cp samconfig.toml.example samconfig.toml
# Edit samconfig.toml: set region and parameter_overrides (especially AllowedOrigins after you have an Amplify URL)
```

Deploy (first time):

```bash
sam build
sam deploy --guided
```

Guided prompts:

| Prompt | Suggested value |
|--------|-----------------|
| Stack name | `hr-resume-filter-api` |
| Region | your region (e.g. `us-east-1`) |
| Parameter `AllowedOrigins` | `*` for first test; later your Amplify URL |
| Parameter `OpenAIApiKey` | optional default key, or leave empty if users supply keys in the UI |
| Confirm changes | `y` |

Note the output **`HttpApiUrl`** (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com`).

### Update CORS after Amplify is live

Redeploy with your Amplify app URL:

```bash
sam deploy --parameter-overrides 'AllowedOrigins="https://main.d1abc2def3.amplifyapp.com"'
```

## 2. Deploy the frontend (Amplify)

1. Open [Amplify Console](https://console.aws.amazon.com/amplify/) → **Create new app** → **Host web app**.
2. Connect your Git provider and this repository.
3. **Monorepo**: set **App root** to `client` (build uses root `amplify.yml`).
4. **Environment variables** (App settings → Environment variables):

   | Name | Value |
   |------|--------|
   | `VITE_API_BASE_URL` | `HttpApiUrl` from step 1 (no trailing slash) |

5. Save and deploy. Your public URL will look like `https://main.xxxxx.amplifyapp.com`.

### Optional variables

| Name | Purpose |
|------|---------|
| `VITE_ENABLE_FOLDER_PATH` | `true` only for local-style server folder paths (not supported on Lambda) |

## 3. Verify

1. Open the Amplify URL → **Settings** → add your OpenAI API key.
2. Upload 1–2 PDF resumes, enter criteria, run analysis.
3. API health: `curl https://<HttpApiUrl>/api/health`

## Local development (unchanged)

```bash
npm run install:all
# server/.env with OPENAI_API_KEY optional if using UI key
npm run dev
```

- Frontend: http://localhost:3000 (proxies `/api` to port 8787)
- Jobs use **in-memory** store unless `JOB_TABLE_NAME` is set

To test against DynamoDB locally, set `JOB_TABLE_NAME` and AWS credentials in `server/.env`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Set `AllowedOrigins` to exact Amplify URL (include `https://`) |
| Analysis stops early | Stream Lambda timeout is 15 min; reduce batch size or increase memory |
| `Job not found` | POST and stream must use the same API URL; check `VITE_API_BASE_URL` |
| Large uploads fail | HTTP API payload limit 10 MB (matches app limit) |

## Stack outputs

- `HttpApiUrl` → `VITE_API_BASE_URL`
- `JobsTableName` → DynamoDB table (auto-wired to Lambdas)

## Clean up

```bash
cd server
sam delete --stack-name hr-resume-filter-api
```

Delete the Amplify app from the Amplify Console.
