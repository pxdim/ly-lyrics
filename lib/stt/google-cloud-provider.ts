/**
 * GoogleCloudProvider — Google Cloud Speech-to-Text 實作
 *
 * 透過 Go 後端 WebSocket 代理串流音訊到 Google Cloud STT REST API。
 * 前端發送 Int16 PCM → Go 後端緩衝 2 秒 → Google STT → 回傳辨識結果
 *
 * 優點：中文辨識品質極佳（Chirp 模型）、API key 不暴露在前端
 */

import type { STTConfig, STTProvider } from "./types";

export class GoogleCloudProvider implements STTProvider {
  readonly name = "google-cloud";

  private ws: WebSocket | null = null;
  private transcriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private _intentionalClose = false;

  async connect(config: STTConfig): Promise<void> {
    this._intentionalClose = false;

    // 從現有 WS URL 推導 STT stream URL
    // NEXT_PUBLIC_GO_WS_URL 格式：wss://host/ws → 取 base 換路徑
    const existingWsUrl =
      process.env["NEXT_PUBLIC_GO_WS_URL"] || "ws://localhost:8080/ws";
    const baseUrl = existingWsUrl.replace(/\/ws$/, "");
    const url = `${baseUrl}/api/stt/stream?sampleRate=${config.sampleRate}&language=${config.language}`;

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            transcript?: string;
            confidence?: number;
            isFinal?: boolean;
          };
          if (data.transcript && this.transcriptCallback) {
            this.transcriptCallback(data.transcript, data.isFinal ?? true);
          }
        } catch {
          // 忽略非 JSON 訊息
        }
      };

      this.ws.onclose = (event) => {
        if (!this._intentionalClose && this.errorCallback) {
          this.errorCallback(
            new Error(`Google STT 連線中斷 (code=${event.code}, reason=${event.reason || "無"})`)
          );
        }
      };

      this.ws.onerror = () => {
        reject(new Error("Google STT WebSocket 連線失敗"));
      };
    });
  }

  disconnect(): void {
    this._intentionalClose = true;
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
