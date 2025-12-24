import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './env/index.js'
import { authMiddleware } from './middleware/auth.js'
import { YoutubePlusProvider } from './providers/youtube-plus-provider.js'

const originalFetch = global.fetch

global.fetch = async (url: string | URL | Request, config?: RequestInit) => {
  const newConfig = {
    ...config,
    headers: {
      ...config?.headers,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      Cookie: env.youtubeCookies,
    },
  }

  return originalFetch(url, newConfig)
}

const app = express()

app.use(helmet())
app.use(express.json())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
app.use(limiter)

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const transcriptProvider = new YoutubePlusProvider()

app.get('/transcript/:videoId', authMiddleware, async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' })
  }

  try {
    console.log(`Processing request for video: ${videoId}`)

    const result = await transcriptProvider.fetchTranscript(videoId)

    return res.json({
      videoId,
      transcript: result.text,
      meta: {
        processedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    // Tratamento de erros conhecidos
    if (error.message.includes('No transcript found')) {
      return res.status(404).json({ error: 'Transcript not available for this video' })
    }
    if (error.message.includes('Video unavailable')) {
      return res.status(404).json({ error: 'Video not found or private' })
    }

    console.error(error)
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
})

app.listen(env.port, () => {
  console.log(`🚀 Service running on port ${env.port}`)
  console.log(`🛡️ Security enabled: Rate Limit & API Key check`)
})
