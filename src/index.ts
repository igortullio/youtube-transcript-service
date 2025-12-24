import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './env/index.js'
import { authMiddleware } from './middleware/auth.js'
import { YoutubeProvider } from './provider/youtube-provider.js'
import { logger } from './util/logger.js'

const app = express()
app.set('trust proxy', 1)

app.use(helmet())
app.use(express.json())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, _, options) => {
    logger.warn(`Rate limit exceeded`, { ip: req.ip })
    res.status(options.statusCode).send(options.message)
  },
})
app.use(limiter)

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const transcriptProvider = new YoutubeProvider()

app.get('/transcript/:videoId', authMiddleware, async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' })
  }

  try {
    const result = await transcriptProvider.fetchTranscript(videoId)

    return res.json({
      videoId,
      transcript: result.text,
      meta: {
        processedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    const errorMessage = error?.message?.toLowerCase() || 'unknown error'

    if (
      errorMessage.includes('video is unavailable') ||
      errorMessage.includes('transcript is disabled') ||
      errorMessage.includes('no transcript is available') ||
      errorMessage.includes('no transcript available') ||
      errorMessage.includes('not available in the specified language')
    ) {
      return res.status(404).json({
        error: 'Transcript unavailable',
        reason: error.message,
      })
    }

    if (errorMessage.includes('invalid video id')) {
      return res.status(400).json({ error: 'Invalid Video ID' })
    }

    if (errorMessage.includes('too many requests') || errorMessage.includes('recaptcha')) {
      logger.error('YouTube Rate Limit/Captcha Triggered', { videoId })
      return res.status(429).json({
        error: 'YouTube blocked the request (Captcha/Rate Limit)',
        retryable: true,
      })
    }

    if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code === 'ECONNRESET') {
      logger.error('Proxy Connection Error', { code: error.code })
      return res.status(502).json({ error: 'Upstream Proxy Error', retryable: true })
    }

    logger.error(`Internal Error processing video ${videoId}`, error)

    return res.status(500).json({
      error: 'Internal Server Error',
      details: env.xApiKey ? error.message : undefined,
    })
  }
})

app.listen(env.port, () => {
  logger.info(`🚀 Service running on port ${env.port}`)
})
