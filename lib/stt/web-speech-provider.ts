/**
 * WebSpeechProvider — 瀏覽器內建 Web Speech API 實作
 *
 * 優點：免費、免 API key、中文辨識品質佳（Chrome 使用 Google STT 引擎）
 * 限制：僅支援 Chrome/Edge，自行管理麥克風（不使用 AudioCapture 的音訊串流）
 */

import type { STTConfig, STTProvider } from "./types";

// Web Speech API 型別（瀏覽器原生，無標準 TS 定義）
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export class WebSpeechProvider implements STTProvider {
  readonly name = "web-speech";

  private recognition: SpeechRecognitionInstance | null = null;
  private transcriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private _isConnected = false;
  private _shouldRestart = false;

  async connect(config: STTConfig): Promise<void> {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error("此瀏覽器不支援 Web Speech API，請使用 Chrome 或 Edge");
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      // 取最新的結果
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;
          if (transcript && this.transcriptCallback) {
            this.transcriptCallback(transcript, isFinal);
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      // "no-speech" 和 "aborted" 不算錯誤，靜音時常發生
      if (event.error === "no-speech" || event.error === "aborted") return;
      this.errorCallback?.(new Error(`語音辨識錯誤: ${event.error}`));
    };

    this.recognition.onend = () => {
      // Web Speech API 會自動停止（靜音過久等），需要自動重啟
      if (this._shouldRestart && this._isConnected) {
        try {
          this.recognition?.start();
        } catch {
          // 可能在停止過程中重啟，忽略
        }
      }
    };

    return new Promise<void>((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("SpeechRecognition 初始化失敗"));
        return;
      }
      this.recognition.onstart = () => {
        this._isConnected = true;
        this._shouldRestart = true;
        resolve();
      };
      this.recognition.start();
    });
  }

  disconnect(): void {
    this._shouldRestart = false;
    this._isConnected = false;
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.stop();
      this.recognition = null;
    }
  }

  // Web Speech API 自行管理麥克風，不需要外部音訊
  sendAudio(_: Float32Array): void {
    // no-op
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  isConnected(): boolean {
    return this._isConnected;
  }
}
