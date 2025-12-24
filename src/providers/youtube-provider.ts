import { Innertube, UniversalCache } from 'youtubei.js'
import { env } from '../env/index.js'
import type { Transcript, TranscriptResult } from './transcript.js'

type TranscriptSegment = {
  text: string
}

export class YoutubeProvider implements Transcript {
  private static yt: Innertube | null = null

  private async getInstance(): Promise<Innertube> {
    if (!YoutubeProvider.yt) {
      console.log('🔌 Initializing Youtubei')
      YoutubeProvider.yt = await Innertube.create({
        cache: new UniversalCache(false),
        cookie: env.youtubeCookies,
        generate_session_locally: true,
        lang: 'en',
        location: 'US',
        retrieve_player: false,
      })
    }
    return YoutubeProvider.yt
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  }

  private parseTimedTextXml(xml: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = []

    const pTagRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g
    let match = pTagRegex.exec(xml)
    let hasMatches = false

    while (match !== null) {
      hasMatches = true
      const [, , , rawText] = match
      const text = this.decodeHtmlEntities(rawText!.replace(/<[^>]+>/g, '')).trim()
      if (text) {
        segments.push({
          text,
        })
      }
      match = pTagRegex.exec(xml)
    }

    if (hasMatches) return segments

    const textTagRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g
    match = textTagRegex.exec(xml)
    while (match !== null) {
      const [, , , rawText] = match
      const text = this.decodeHtmlEntities(rawText!.replace(/<[^>]+>/g, '')).trim()
      if (text) {
        segments.push({
          text,
        })
      }
      match = textTagRegex.exec(xml)
    }

    return segments
  }

  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      const yt = await this.getInstance()
      const info = await yt.getBasicInfo(videoId)
      const captionTracks = info.captions?.caption_tracks
      if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No caption tracks found for this video.')
      }

      const selectedTrack = captionTracks[0] // default
      if (!selectedTrack?.base_url) {
        throw new Error('Selected caption track has no URL.')
      }

      console.log(`Fetching captions from: ${selectedTrack.language_code} (${selectedTrack.kind || 'standard'})`)

      const xmlResponse = await fetch(selectedTrack.base_url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      if (!xmlResponse.ok) {
        throw new Error(`Failed to download XML: ${xmlResponse.statusText}`)
      }

      const xmlText = await xmlResponse.text()
      const segments = this.parseTimedTextXml(xmlText)
      if (segments.length === 0) {
        throw new Error('Parsed XML resulted in zero segments.')
      }

      const fullText = segments
        .map(s => s.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      return {
        text: fullText,
      }
    } catch (error: any) {
      console.error(`Provider Error [Hybrid]: ${error.message}`)

      if (error.message.includes('No caption tracks')) {
        throw new Error('No transcripts available for this video.')
      }

      throw new Error(`Hybrid Fetch Failed: ${error.message}`)
    }
  }
}
