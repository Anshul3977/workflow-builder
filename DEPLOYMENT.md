# Workflow Builder - Deployment Guide

Complete guide for deploying the Workflow Builder application to production.

## Prerequisites

- Frontend and backend code ready to deploy
- Supabase project with database set up
- Groq API key
- Domain names (optional, can use provided subdomains)

## Architecture Overview

```
┌─────────────────────┐
│   Frontend (Next.js)   │
│   Deployed to Vercel  │
└──────────┬──────────┘
           │ HTTPS
           ↓
┌─────────────────────┐
│  Backend (Express)  │
│   Deployed to       │
│  Render/Railway     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Supabase DB       │
│   (Cloud hosted)    │
└─────────────────────┘
           ↑
           │
┌─────────────────────┐
│   Groq API          │
│   (Cloud service)   │
└─────────────────────┘
```

## Frontend Deployment (Vercel)

### Option 1: Deploy via GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit: Workflow Builder"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select "Next.js" framework
   - Click "Deploy"

3. **Configure Environment Variables**
   - In Vercel project settings, go to Environment Variables
   - Add: `NEXT_PUBLIC_API_URL=https://your-backend-url/api`
   - Replace `your-backend-url` with your deployed backend URL
   - Redeploy after adding variables

### Option 2: Deploy via CLI

```bash
npm install -g vercel
vercel login
vercel
```

## Backend Deployment (Render.com)

### Step 1: Prepare Backend for Deployment

1. **Create `render.yaml` in backend folder:**
   ```yaml
   services:
     - type: web
       name: workflow-builder-api
       env: node
       plan: free
       buildCommand: cd backend && pnpm install && pnpm build
       startCommand: cd backend && pnpm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 3001
   ```

2. **Update backend package.json scripts:**
   ```json
   {
     "start": "node dist/server.js",
     "build": "tsc",
     "dev": "tsx watch src/server.ts"
   }
   ```

### Step 2: Deploy to Render

1. **Create Render Account**
   - Go to render.com
   - Sign up with GitHub
   - Authorize Render to access your repositories

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Select your GitHub repository
   - Configure:
     - Name: `workflow-builder-api`
     - Environment: `Node`
     - Build Command: `pnpm install && pnpm build`
     - Start Command: `pnpm start`
     - Plan: Free (or upgrade as needed)

3. **Add Environment Variables**
   In the Render dashboard environment variables section:
   ```
   PORT=3001
   NODE_ENV=production
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_KEY=<your-supabase-anon-key>
   GROQ_API_KEY=<your-groq-api-key>
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy the service URL (e.g., `https://workflow-builder-api.onrender.com`)

### Step 3: Update Frontend

1. **Update Frontend Environment Variable**
   - Go to Vercel project settings
   - Update `NEXT_PUBLIC_API_URL` to your Render backend URL
   - Trigger a redeploy

## Alternative: Railway.app Deployment

### Backend on Railway

1. **Connect GitHub**
   - Go to railway.app
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

2. **Configure Build**
   - Add `Procfile` in backend:
     ```
     web: node dist/server.js
     ```

3. **Set Environment Variables**
   - In Railway project, click "Variables"
   - Add all required env vars

4. **Deploy**
   - Railway auto-detects and deploys
   - Get the auto-generated URL

## Alternative: Vercel Serverless (Advanced)

Deploy backend as Vercel serverless functions:

1. **Create API routes in `/api` folder**
2. **Use Vercel's serverless functions deployment**
3. **Update `vercel.json` configuration**

See backend README for details.

## Post-Deployment Verification

### 1. Test Backend Health
```bash
curl https://your-backend-url/api/health
```

Should return:
```json
{
  "status": "healthy",
  "health": {
    "backend": { "status": "healthy" },
    "database": { "status": "healthy" },
    "llm": { "status": "healthy" }
  }
}
```

### 2. Test Frontend
- Visit your frontend domain
- Try creating and running a workflow
- Check the results page loads correctly

### 3. Test API Integration
- Open browser dev tools (F12)
- Create a workflow and run it
- Check Network tab to verify API calls succeed

## Troubleshooting Deployment

### Backend won't deploy

**Issue:** Build fails
- Check build logs in Render/Railway dashboard
- Verify all dependencies are in package.json
- Ensure TypeScript compiles (`pnpm type-check`)

**Issue:** Runtime errors
- Check environment variables are set
- Verify Groq API key is valid
- Check Supabase credentials

### Frontend shows API errors

**Issue:** 404 errors on API calls
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend is running and healthy
- Clear browser cache and reload

**Issue:** CORS errors
- Verify backend has CORS enabled
- Check `FRONTEND_URL` env var in backend matches frontend domain
- Restart backend after changing CORS config

### Database connection fails

- Verify Supabase URL format: `https://xxx.supabase.co`
- Use anon key, not service role key
- Check if IP is whitelisted (if using IP restrictions)
- Verify database tables exist (run migration SQL again if needed)

## Monitoring in Production

### Vercel Analytics
- Built-in in Vercel dashboard
- Monitor performance, errors, and usage

### Render/Railway Logs
- Check logs in dashboard for errors
- Set up log streaming for real-time monitoring

### Uptime Monitoring
- Use services like UptimeRobot to monitor `/api/health` endpoint
- Set up alerts if service goes down

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env.local` to git
   - Always use dashboard to set production env vars
   - Rotate API keys regularly

2. **Database**
   - Use strong passwords
   - Enable backups
   - Consider enabling RLS for production

3. **API**
   - Add rate limiting
   - Validate all inputs
   - Use HTTPS only (automatic on Vercel/Render)

4. **Secrets**
   - Never expose API keys in frontend code
   - Keep Groq API key server-side only
   - Use least-privilege access

## Scaling

### Free Tier Limits
- Vercel: 50 builds/month, limited compute
- Render: Auto-sleeps after inactivity
- Supabase Free: 50k rows, 1GB storage

### Upgrade Path
1. **Vercel Pro** → Unlimited builds, faster deployments
2. **Render Pro** → Always-on, no sleep
3. **Supabase Pro** → More storage, better performance
4. **Database** → Upgrade to dedicated instance if needed

## Cost Optimization

- Use free tier for development/testing
- Set up auto-scaling for high traffic
- Consider serverless for variable load
- Cache API responses on frontend
- Optimize database queries

## Maintenance

### Regular Tasks
- Review logs weekly
- Update dependencies monthly
- Rotate API keys quarterly
- Backup database regularly

### Monitoring Checklist
- [ ] Health endpoint returns 200
- [ ] No error logs in backend
- [ ] Database queries are fast
- [ ] API response times < 5s
- [ ] All features working in production

## Support & Troubleshooting

- **Vercel docs:** https://vercel.com/docs
- **Render docs:** https://render.com/docs
- **Supabase docs:** https://supabase.com/docs
- **Groq docs:** https://console.groq.com/docs

---

Congratulations! Your Workflow Builder is now deployed. 🚀
