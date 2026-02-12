# Workflow Builder Backend

Express.js backend server for the Workflow Builder application. Handles workflow execution, database operations, and LLM processing via Groq API.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project
- Groq API key (free tier available at console.groq.com)

## Setup

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update the values:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key (found in project settings)
- `GROQ_API_KEY`: Your Groq API key

### 3. Set Up Database

1. Go to your Supabase project SQL editor
2. Copy the contents of `../scripts/setup-database.sql`
3. Paste and run the SQL script
4. Tables `workflows`, `workflow_runs`, and `workflow_templates` will be created

### 4. Start the Server

Development:
```bash
pnpm dev
```

Production:
```bash
pnpm build
pnpm start
```

The server will start on `http://localhost:3001` (or the PORT specified in .env.local)

## API Endpoints

### POST /api/workflows
Process a workflow with the provided steps and input text.

**Request:**
```json
{
  "steps": [
    {
      "id": "step1",
      "type": "clean",
      "config": {}
    },
    {
      "id": "step2",
      "type": "summarize",
      "config": { "length": "medium" }
    }
  ],
  "input": "Your text to process here...",
  "workflowId": "optional-workflow-id"
}
```

**Response:**
```json
{
  "success": true,
  "runId": "uuid",
  "results": {
    "workflowRunId": "uuid",
    "initialInput": "...",
    "steps": [
      {
        "stepId": "step1",
        "stepType": "clean",
        "input": "...",
        "output": "...",
        "processingTime": 1250,
        "status": "success",
        "tokensUsed": { "input": 50, "output": 45 }
      }
    ],
    "totalProcessingTime": 2500,
    "status": "completed"
  }
}
```

### GET /api/workflows
List all workflow runs with pagination.

**Query Parameters:**
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)
- `userId`: Filter by user ID (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workflow_id": "uuid",
      "user_id": "user123",
      "input_text": "...",
      "status": "completed",
      "results": {...},
      "total_processing_time": 2500,
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:30:02.5Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150
  }
}
```

### GET /api/workflows/:id
Get details of a specific workflow run.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflow_id": "uuid",
    "input_text": "...",
    "status": "completed",
    "results": {...},
    "total_processing_time": 2500,
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:30:02.5Z"
  }
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "health": {
    "backend": { "status": "healthy", "responseTime": 5 },
    "database": { "status": "healthy", "responseTime": 10 },
    "llm": { "status": "healthy", "responseTime": 200 }
  }
}
```

## Step Types

The backend supports four text processing step types:

### 1. Clean
Removes extra whitespace, fixes formatting, and normalizes text.

### 2. Summarize
Condenses text into a summary. Supports `length` config:
- `short`: 2-3 sentences
- `medium`: 3-4 sentences (default)
- `long`: 5-7 sentences

### 3. Extract
Extracts key information from text. Supports `topics` config to specify what to extract.

### 4. Categorize
Categorizes text by specified dimensions. Supports `categories` config.

## Deployment

### Render.com
1. Create new Web Service
2. Connect your GitHub repository
3. Set Build Command: `cd backend && pnpm build`
4. Set Start Command: `cd backend && pnpm start`
5. Add environment variables in Render dashboard
6. Deploy

### Railway
1. Create new project
2. Connect GitHub repository
3. Add environment variables
4. Railway auto-detects `package.json` and runs appropriate commands
5. Auto-deploys on push to main branch

### Vercel Serverless Functions
For serverless deployment, use the API routes pattern with `/api/workflows.ts` route handlers.

## Development

### Type Checking
```bash
pnpm type-check
```

### Linting
Use your preferred linter (ESLint, Biome, etc.)

## Troubleshooting

**"GROQ_API_KEY is not set"** - Add your Groq API key to `.env.local`

**Database connection error** - Verify SUPABASE_URL and SUPABASE_KEY are correct

**CORS errors** - Update FRONTEND_URL in `.env.local` to match your frontend URL

## License

MIT
