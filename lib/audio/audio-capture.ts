/**
 * AudioCapture — Web Audio API 音訊擷取模組
 *
 * 負責：麥克風/Line-in 音訊擷取、Gain 控制、即時音量分析
 * 不知道 STT 的存在——只提供音訊串流和音量數據。
 */

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private mediaStream: MediaStream | null = null;
  private _isCapturing = false;

  static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  async start(deviceId?: string, gainDb: number = 0): Promise<void> {
    const audioConstraints: MediaTrackConstraints = deviceId
      ? { deviceId: { exact: deviceId } }
      : {};
    const constraints: MediaStreamConstraints = { audio: audioConstraints };
    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    this.audioContext = new AudioContext();
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.gainNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    this.analyserNode.fftSize = 256;

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.destinationNode);

    this.gainNode.gain.value = AudioCapture.dbToLinear(gainDb);

    this._isCapturing = true;
  }

  stop(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.destinationNode = null;
    this._isCapturing = false;
  }

  setGain(db: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = AudioCapture.dbToLinear(db);
    }
  }

  getVolume(): number {
    if (!this.analyserNode) {
      throw new Error("AudioCapture not started");
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] ?? 0;
    }
    return sum / (dataArray.length * 255);
  }

  getOutputStream(): MediaStream | null {
    return this.destinationNode?.stream ?? null;
  }

  isCapturing(): boolean {
    return this._isCapturing;
  }
}
