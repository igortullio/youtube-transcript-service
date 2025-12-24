export interface TranscriptResult {
  text: string
}

export interface Transcript {
  fetchTranscript(videoId: string): Promise<TranscriptResult>
}
