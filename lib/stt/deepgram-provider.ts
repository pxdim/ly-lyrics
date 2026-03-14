/**
 * DeepgramProvider — Deepgram Streaming API 實作
 *
 * 連線流程：
 * 1. 建立 WebSocket 到 wss://api.deepgram.com/v1/listen
 * 2. sendAudio() 將 Float32Array 轉 Int16 PCM 後寫入
 * 3. 收到 JSON 回應包含 transcript 和 is_final
 */

import type { STTConfig, STTProvider } from "./types";

export class DeepgramProvider implements STTProvider {
  readonly name = "deepgram";

  private ws: WebSocket | null = null;
  private transcriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  async connect(config: STTConfig): Promise<void> {
    const params = new URLSearchParams({
      language: config.language,
      model: "nova-2",
      interim_results: "true",
      sample_rate: String(config.sampleRate),
      encoding: "linear16",
      channels: "1",
      token: config.apiKey, // 瀏覽器 WebSocket 不支援自訂 header，Deepgram 支援 token query parameter
    });

    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          const transcript = data?.channel?.alternatives?.[0]?.transcript;
          const isFinal = data?.is_final ?? false;
          if (transcript && this.transcriptCallback) {
            this.transcriptCallback(transcript, isFinal);
          }
        } catch {
          // 忽略非 JSON 訊息
        }
      };

      this.ws.onclose = () => {
        if (this.errorCallback) {
          this.errorCallback(new Error("Deepgram WebSocket closed"));
        }
      };

      this.ws.onerror = () => {
        reject(new Error("Deepgram WebSocket connection failed"));
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(chunk: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Float32 (-1 to 1) → Int16 PCM
    const int16 = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i] ?? 0));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.ws.send(int16.buffer);
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
