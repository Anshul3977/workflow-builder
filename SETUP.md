# Workflow Builder - Complete Setup Guide

This guide walks you through setting up the entire Workflow Builder application, including the frontend, backend, and database.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account (free tier available at supabase.com)
- Groq API key (free tier available at console.groq.com)

## Step 1: Clone/Download the Project

```bash
git clone <your-repo-url>
cd workflow-builder
```

## Step 2: Frontend Setup

### 2.1 Install Dependencies

```bash
pnpm install
```

### 2.2 Configure Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url/api
```

### 2.3 Run Development Server

```bash
pnpm dev
```

Frontend will be available at http://localhost:3000

## Step 3: Backend Setup

### 3.1 Install Backend Dependencies

```bash
cd backend
pnpm install
```

### 3.2 Configure Backend Environment

Copy the example file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:3000
```

### 3.3 Run Backend Server

```bash
pnpm dev
```

Backend will be available at http://localhost:3001

## Step 4: Database Setup

### 4.1 Create Supabase Project

1. Go to supabase.com and sign up
2. Create a new project
3. Wait for it to initialize
4. Go to Settings → API to find your credentials:
   - Project URL (SUPABASE_URL)
   - Anon Key (SUPABASE_KEY)

### 4.2 Run Database Migration

1. In Supabase dashboard, go to SQL Editor
2. Create a new query
3. Copy the contents of `scripts/setup-database.sql`
4. Paste into the SQL editor
5. Run the query
6. Verify tables are created in the Schema view

## Step 5: Get Groq API Key

1. Go to console.groq.com
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key to your backend `.env.local` as `GROQ_API_KEY`

## Step 6: Verify Everything Works

### 6.1 Check Backend Health

Open http://localhost:3001/api/health in your browser. You should see:

```json
{
  "status": "healthy",
  "timestamp": "...",
  "health": {
    "backend": { "status": "healthy", "responseTime": 5 },
    "database": { "status": "healthy", "responseTime": 10 },
    "llm": { "status": "healthy", "responseTime": 200 }
  }
}
```

### 6.2 Test the Frontend

1. Open http://localhost:3000
2. Click "Get Started" to go to the builder
3. Add a workflow step (e.g., "clean")
4. Enter some text
5. Click "Run Workflow"
6. Verify the result appears

## Troubleshooting

### Backend won't start

- Check `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Verify `GROQ_API_KEY` is set
- Check if port 3001 is already in use

### Database connection error

- Verify SUPABASE_URL format: `https://xxxxx.supabase.co`
- Make sure you used the anon key, not the service role key
- Try recreating the API key in Supabase dashboard

### Workflow execution fails

- Check backend logs for error messages
- Verify Groq API key is valid
- Check internet connection (Groq API requires it)

### Frontend can't reach backend

- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` is correct in frontend `.env.local`
- Verify CORS is enabled in backend

## Development Workflow

### Running Both Frontend and Backend

Terminal 1 (Frontend):
```bash
pnpm dev
```

Terminal 2 (Backend):
```bash
cd backend
pnpm dev
```

### Monitoring

- Frontend logs: Check browser console (F12)
- Backend logs: Check terminal output
- Database: Check Supabase dashboard

## Deployment

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Go to vercel.com
3. Import project
4. Add environment variable: `NEXT_PUBLIC_API_URL=<your-backend-url>`
5. Deploy

### Deploy Backend

See `backend/README.md` for detailed deployment instructions for:
- Render.com
- Railway
- Vercel Serverless Functions

### Deploy Database

The database is hosted on Supabase (cloud-based), no additional deployment needed.

## Project Structure

```
workflow-builder/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page
│   ├── builder/                 # Workflow builder page
│   ├── history/                 # Execution history page
│   ├── status/                  # Health status page
│   └── results/[id]/            # Results viewer page
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── layout/                  # Layout components
│   ├── workflow/                # Workflow builder components
│   ├── history/                 # History components
│   ├── results/                 # Results components
│   └── health/                  # Health status components
├── lib/                          # Utilities and state
│   ├── api.ts                   # API client
│   ├── stores/                  # Zustand stores
│   └── utils.ts                 # Helper functions
├── types/                        # TypeScript types
├── backend/                      # Express backend
│   ├── src/
│   │   ├── server.ts            # Express app
│   │   ├── routes/              # API routes
│   │   └── lib/                 # Business logic
│   └── package.json
├── scripts/                      # Database scripts
│   └── setup-database.sql       # Database schema
└── README.md
```

## Next Steps

1. Try creating a workflow with multiple steps
2. Check the history page to see past executions
3. Monitor system health in the status page
4. Customize step configurations to your needs

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend and frontend README files
3. Check browser console and backend logs
4. Verify all environment variables are set correctly

Happy building! 🚀
