import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { YoutubeTranscript } from 'youtube-transcript-plus'
import { env } from '../env/index.js'
import { logger } from '../util/logger.js'
import type { Transcript, TranscriptResult } from './transcript.js'

export class YoutubeProvider implements Transcript {
  private static proxyAgent: ProxyAgent | null = null

  private getProxyAgent(): ProxyAgent {
    if (!YoutubeProvider.proxyAgent) {
      const safeProxyUrl = env.proxyUrl.replace(/:([^:@]+)@/, ':***@')
      logger.info(`🔗 Initializing Proxy Agent`, { proxy: safeProxyUrl })
      YoutubeProvider.proxyAgent = new ProxyAgent(env.proxyUrl)
    }
    return YoutubeProvider.proxyAgent
  }

  private async proxyFetch(params: any): Promise<Response> {
    return undiciFetch(params.url, {
      method: params.method || 'GET',
      body: params.body,
      headers: {
        ...params.headers,
        'User-Agent': params.userAgent,
        'Accept-Language': params.lang,
      },
      dispatcher: this.getProxyAgent(),
    }) as unknown as Response
  }

  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    logger.info(`Processing video`, { videoId, provider: 'YoutubePlus' })
    const startTime = Date.now()

    try {
      const customFetch = this.proxyFetch.bind(this)

      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        videoFetch: customFetch,
        playerFetch: customFetch,
        transcriptFetch: customFetch,
      })

      if (!transcriptItems || transcriptItems.length === 0) {
        throw new Error('Library returned empty transcript array (Parsing failed).')
      }

      const fullText = transcriptItems
        .map((item: any) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      const duration = Date.now() - startTime
      logger.info(`Transcript fetched successfully`, {
        videoId,
        segments: transcriptItems.length,
        durationMs: duration,
      })

      return {
        text: fullText,
      }
    } catch (error: any) {
      logger.error(`Failed to fetch transcript`, error, { videoId })
      throw error
    }
  }
}
