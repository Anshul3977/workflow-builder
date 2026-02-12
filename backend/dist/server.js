import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import workflowRoutes from './routes/workflows.js';
import { supabase } from './lib/supabase-client.js';
// Load .env.local first, then fall back to .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const app = express();
const PORT = process.env.PORT || 3001;
// Track server metrics
let requestsProcessed = 0;
const serverStartTime = Date.now();
// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
// Request counter middleware
app.use((_req, _res, next) => {
    requestsProcessed++;
    next();
});
// Health check endpoint — performs real connectivity checks
app.get('/api/health', async (_req, res) => {
    const backendStart = Date.now();
    const backendResponseTime = Date.now() - backendStart;
    // Check database connectivity
    let dbStatus = 'healthy';
    let dbMessage = 'Connected';
    let dbResponseTime = 0;
    try {
        const dbStart = Date.now();
        const { error } = await supabase.from('workflow_runs').select('id').limit(1);
        dbResponseTime = Date.now() - dbStart;
        if (error) {
            dbStatus = 'unhealthy';
            dbMessage = error.message;
        }
    }
    catch (err) {
        dbStatus = 'unhealthy';
        dbMessage = err instanceof Error ? err.message : 'Connection failed';
        dbResponseTime = 0;
    }
    // Check LLM availability (lightweight — just verify the key is set)
    let llmStatus = 'healthy';
    let llmMessage = 'API key configured';
    if (!process.env.GROQ_API_KEY) {
        llmStatus = 'unhealthy';
        llmMessage = 'GROQ_API_KEY is not set';
    }
    const overallStatus = dbStatus === 'unhealthy' || llmStatus === 'unhealthy' ? 'unhealthy' : 'healthy';
    res.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        health: {
            backend: {
                name: 'Backend Server',
                status: 'healthy',
                message: 'Running',
                lastChecked: new Date().toISOString(),
                responseTime: backendResponseTime,
            },
            database: {
                name: 'Supabase Database',
                status: dbStatus,
                message: dbMessage,
                lastChecked: new Date().toISOString(),
                responseTime: dbResponseTime,
            },
            llm: {
                name: 'Groq LLM',
                status: llmStatus,
                message: llmMessage,
                lastChecked: new Date().toISOString(),
                responseTime: 0,
            },
            uptime: Math.floor((Date.now() - serverStartTime) / 1000),
            requestsProcessed,
            averageResponseTime: 0,
        },
    });
});
// Workflow routes
app.use('/api', workflowRoutes);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
    });
});
// Error handler (must have 4 params for Express to recognize it)
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
//# sourceMappingURL=server.js.map