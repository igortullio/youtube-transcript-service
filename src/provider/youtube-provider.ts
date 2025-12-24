import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { YoutubeTranscript } from 'youtube-transcript-plus'
import { env } from '../env/index.js'
import type { Transcript, TranscriptResult } from './transcript.js'

export class YoutubeProvider implements Transcript {
  private static proxyAgent: ProxyAgent | null = null

  private async proxyFetch(url: string, options: any = {}): Promise<Response> {
    if (!YoutubeProvider.proxyAgent && env.proxyUrl) {
      const safeProxy = env.proxyUrl.replace(/:([^:@]+)@/, ':***@')
      console.log(`🔗 Configuring Proxy for Lib: ${safeProxy}`)
      YoutubeProvider.proxyAgent = new ProxyAgent(env.proxyUrl)
    }

    const headers = {
      ...options.headers,
      'User-Agent':
        options.userAgent ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+433; SOCS=CAISBAgVEBg;',
    }

    const fetchConfig: any = {
      method: options.method || 'GET',
      headers,
      body: options.body,
    }

    if (YoutubeProvider.proxyAgent) {
      fetchConfig.dispatcher = YoutubeProvider.proxyAgent
    }

    return undiciFetch(url, fetchConfig) as unknown as Response
  }

  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      console.log(`Processing video: ${videoId} via YoutubePlus + Native Proxy Support`)

      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        videoFetch: async (params: any) => {
          return this.proxyFetch(params.url, {
            method: 'GET',
            userAgent: params.userAgent,
            headers: { 'Accept-Language': params.lang },
          })
        },

        playerFetch: async (params: any) => {
          return this.proxyFetch(params.url, {
            method: params.method,
            body: params.body,
            userAgent: params.userAgent,
            headers: {
              ...params.headers,
              'Accept-Language': params.lang,
            },
          })
        },

        transcriptFetch: async (params: any) => {
          return this.proxyFetch(params.url, {
            method: 'GET',
            userAgent: params.userAgent,
            headers: { 'Accept-Language': params.lang },
          })
        },
      })

      if (!transcriptItems || transcriptItems.length === 0) {
        throw new Error('Library returned empty transcript array.')
      }

      const fullText = transcriptItems
        .map((item: any) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      return {
        text: fullText,
      }
    } catch (error: any) {
      console.error(`Provider Error [YoutubePlus]: ${error.message}`)

      if (error.message.includes('Video is unavailable')) {
        throw new Error('Video is unavailable or private.')
      }
      if (error.message.includes('No transcript available')) {
        throw new Error('No transcripts available for this video.')
      }

      throw new Error(error.message)
    }
  }
}
