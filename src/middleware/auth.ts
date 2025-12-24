import type { NextFunction, Request, Response } from 'express'
import { env } from '../env/index.js'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Busca o token no Header (padrão mais seguro que query param)
  const clientKey = req.headers['x-api-key'] || req.headers['authorization']

  // Verifica se bate (suporta "Bearer token" ou apenas o token direto)
  if (!clientKey || (clientKey !== env.xApiKey && clientKey !== `Bearer ${env.xApiKey}`)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' })
  }

  next()
}
