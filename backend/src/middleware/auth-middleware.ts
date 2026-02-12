import { Request, Response, NextFunction } from 'express'
import { getSupabase } from '../lib/supabase-client.js'

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string
                email: string
            }
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Missing or invalid authorization header',
        })
        return
    }

    const token = authHeader.split(' ')[1]

    try {
        const { data: { user }, error } = await getSupabase().auth.getUser(token)

        if (error || !user) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            })
            return
        }

        req.user = {
            id: user.id,
            email: user.email || '',
        }

        next()
    } catch (err) {
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
        })
    }
}
