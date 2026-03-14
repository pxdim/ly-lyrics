/**
 * STT Provider Interface
 *
 * 抽象化語音轉文字引擎，允許替換不同 provider（Deepgram, Gemini, Whisper 等）
 */

export interface STTConfig {
  language: string;
  sampleRate: number;
  apiKey: string;
  keywords?: string[]; // 提示詞（歌詞內容），提升辨識準確度
}

export interface STTProvider {
  readonly name: string;
  connect(config: STTConfig): Promise<void>;
  disconnect(): void;
  sendAudio(chunk: Float32Array): void;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onError(callback: (error: Error) => void): void;
  isConnected(): boolean;
}
