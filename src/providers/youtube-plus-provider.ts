import { YoutubeTranscript } from 'youtube-transcript-plus'
import type { Transcript, TranscriptResult } from './transcript.js'

export class YoutubePlusProvider implements Transcript {
  async fetchTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      // Pega a configuração padrão (idioma original geralmente é o default)
      // A lib youtube-transcript-plus retorna um array de objetos { text, duration, offset }
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

      if (!transcriptItems || transcriptItems.length === 0) {
        throw new Error('No transcript found for this video.')
      }

      // Junta todo o texto em um bloco único
      const fullText = transcriptItems.map((item: any) => item.text).join(' ')

      return {
        text: fullText,
      }
    } catch (error: any) {
      console.error(`Provider Error [YoutubePlus]: ${error.message}`)
      throw new Error(`Failed to fetch transcript: ${error.message}`)
    }
  }
}
