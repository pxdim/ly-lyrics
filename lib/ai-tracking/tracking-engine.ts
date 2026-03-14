/**
 * TrackingEngine — AI 歌詞追蹤整合引擎
 *
 * 串接 AudioCapture → STTProvider → LyricsMatcher → store.jumpToLine()
 * 是唯一知道全流程的模組。
 */

import type { STTProvider, STTConfig } from "../stt/types";
import type { AudioCapture } from "../audio/audio-capture";
import { matchLyrics, type MatchConfig } from "./lyrics-matcher";

export interface TrackingEngineConfig {
  sttProvider: STTProvider;
  audioCapture: AudioCapture;
  jumpToLine: (index: number) => void;
  getCurrentIndex: () => number;
  getLyrics: () => string[];
  getLrcTimestamps: () => number[] | undefined;
  onError?: (error: Error) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  matchConfig?: Partial<MatchConfig>;
  cooldownMs?: number;
}

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  confidenceThreshold: 0.45, // 中文 STT 準確度較低，門檻適度放寬
  windowBefore: 2,
  windowAfter: 5, // 向後多看幾行，提升跳轉容錯
  fullScanThreshold: 0.7,
  forwardBias: 0.1,
};

export class TrackingEngine {
  private sttProvider: STTProvider;
  private audioCapture: AudioCapture;
  private jumpToLine: (index: number) => void;
  private getCurrentIndex: () => number;
  private getLyrics: () => string[];
  private getLrcTimestamps: () => number[] | undefined;
  private onErrorCallback: ((error: Error) => void) | null;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null;
  private matchConfig: MatchConfig;
  private cooldownMs: number;

  private _isActive = false;
  private _cooldownUntil: number | null = null;
  private _lastAiLineIndex: number | null = null;
  private _startTime: number | null = null;

  constructor(config: TrackingEngineConfig) {
    this.sttProvider = config.sttProvider;
    this.audioCapture = config.audioCapture;
    this.jumpToLine = config.jumpToLine;
    this.getCurrentIndex = config.getCurrentIndex;
    this.getLyrics = config.getLyrics;
    this.getLrcTimestamps = config.getLrcTimestamps;
    this.onErrorCallback = config.onError ?? null;
    this.onTranscriptCallback = config.onTranscript ?? null;
    this.matchConfig = { ...DEFAULT_MATCH_CONFIG, ...config.matchConfig };
    this.cooldownMs = config.cooldownMs ?? 5000;
  }

  async start(sttConfig: STTConfig, deviceId?: string, gainDb?: number): Promise<void> {
    await this.audioCapture.start(deviceId, gainDb);

    // 用實際 AudioContext 取樣率覆蓋設定（避免 44100→16000 不匹配）
    const actualSampleRate = this.audioCapture.getSampleRate();
    // 將歌詞作為 keywords 提示，提升中文辨識準確度
    const lyrics = this.getLyrics();
    const resolvedConfig: STTConfig = {
      ...sttConfig,
      sampleRate: actualSampleRate,
      keywords: lyrics,
    };

    this.sttProvider.onTranscript((text, isFinal) => {
      this.handleTranscript(text, isFinal);
    });

    this.sttProvider.onError((error) => {
      this.onErrorCallback?.(error);
    });

    await this.sttProvider.connect(resolvedConfig);

    // 將音訊資料從 AudioCapture 串入 STT Provider
    this.audioCapture.onAudioData((chunk) => {
      this.sttProvider.sendAudio(chunk);
    });

    this._isActive = true;
    this._startTime = Date.now();
  }

  stop(): void {
    this.sttProvider.disconnect();
    this.audioCapture.stop();
    this._isActive = false;
    this._cooldownUntil = null;
    this._lastAiLineIndex = null;
    this._startTime = null;
  }

  onManualOverride(): void {
    this._cooldownUntil = Date.now() + this.cooldownMs;
    this._lastAiLineIndex = null;
  }

  shouldIgnoreLineChange(lineIndex: number): boolean {
    return this._lastAiLineIndex === lineIndex;
  }

  isActive(): boolean {
    return this._isActive;
  }

  updateMatchConfig(partial: Partial<MatchConfig>): void {
    this.matchConfig = { ...this.matchConfig, ...partial };
  }

  updateCooldownMs(ms: number): void {
    this.cooldownMs = ms;
  }

  private handleTranscript(text: string, isFinal: boolean): void {
    // 所有辨識結果（含 interim）都傳出去供 UI 顯示
    this.onTranscriptCallback?.(text, isFinal);

    if (!isFinal) return;

    if (this._cooldownUntil && Date.now() < this._cooldownUntil) return;
    if (this._cooldownUntil && Date.now() >= this._cooldownUntil) {
      this._cooldownUntil = null;
    }

    const lyrics = this.getLyrics();
    const currentIndex = this.getCurrentIndex();
    const timestamps = this.getLrcTimestamps();
    const elapsedMs = this._startTime ? Date.now() - this._startTime : undefined;

    const result = matchLyrics(
      text,
      lyrics,
      currentIndex,
      this.matchConfig,
      timestamps,
      elapsedMs
    );

    if (result) {
      this._lastAiLineIndex = result.lineIndex;
      this.jumpToLine(result.lineIndex);
    }
  }
}
