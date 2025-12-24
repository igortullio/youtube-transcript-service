import type { NextFunction, Request, Response } from 'express'
import { env } from '../env/index.js'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientKey = req.headers['x-api-key'] || req.headers['authorization']

  if (!clientKey || (clientKey !== env.xApiKey && clientKey !== `Bearer ${env.xApiKey}`)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' })
  }

  next()
}
