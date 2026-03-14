import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioCapture } from "./audio-capture";

// jsdom 不提供 MediaStream，先 stub 讓模組層級常數可初始化
vi.stubGlobal("MediaStream", class MediaStream {});

// Mock Web Audio API
const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAnalyserNode = {
  fftSize: 256,
  frequencyBinCount: 128,
  connect: vi.fn(),
  disconnect: vi.fn(),
  getFloatTimeDomainData: vi.fn((arr: Float32Array) => {
    // 模擬 RMS ≈ 0.5 的訊號
    for (let i = 0; i < arr.length; i++) arr[i] = 0.5;
  }),
};

const mockMediaStreamSource = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockMediaStreamDestination = {
  stream: new MediaStream(),
};

const mockScriptProcessor = {
  onaudioprocess: null as ((e: { inputBuffer: { getChannelData: (ch: number) => Float32Array } }) => void) | null,
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAudioContext = {
  createGain: vi.fn(() => mockGainNode),
  createAnalyser: vi.fn(() => mockAnalyserNode),
  createMediaStreamSource: vi.fn(() => mockMediaStreamSource),
  createMediaStreamDestination: vi.fn(() => mockMediaStreamDestination),
  createScriptProcessor: vi.fn(() => mockScriptProcessor),
  destination: {},
  close: vi.fn(),
  state: "running",
  sampleRate: 48000,
};

vi.stubGlobal(
  "AudioContext",
  vi.fn(function () {
    return mockAudioContext;
  })
);

const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

describe("AudioCapture", () => {
  let capture: AudioCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    capture = new AudioCapture();
  });

  it("dbToLinear converts dB to linear gain correctly", () => {
    expect(AudioCapture.dbToLinear(0)).toBeCloseTo(1.0);
    expect(AudioCapture.dbToLinear(6)).toBeCloseTo(1.9953, 2);
    expect(AudioCapture.dbToLinear(20)).toBeCloseTo(10.0);
  });

  it("start initializes audio pipeline", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });

    await capture.start();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {},
    });
    expect(mockMediaStreamSource.connect).toHaveBeenCalled();
    expect(capture.isCapturing()).toBe(true);
  });

  it("start with specific deviceId passes constraint", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });

    await capture.start("device-123");

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { deviceId: { exact: "device-123" } },
    });
  });

  it("setGain updates GainNode value", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    capture.setGain(6);
    expect(mockGainNode.gain.value).toBeCloseTo(1.9953, 2);
  });

  it("getVolume returns normalized volume from analyser", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    const volume = capture.getVolume();
    expect(volume).toBeGreaterThan(0.4);
    expect(volume).toBeLessThanOrEqual(1.0);
  });

  it("stop cleans up all resources", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    capture.stop();
    expect(capture.isCapturing()).toBe(false);
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it("getOutputStream returns MediaStream for STT provider", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    const stream = capture.getOutputStream();
    expect(stream).toBe(mockMediaStreamDestination.stream);
  });

  it("throws when not started and getVolume is called", () => {
    expect(() => capture.getVolume()).toThrow();
  });

  it("onAudioData callback receives PCM chunks from ScriptProcessor", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });

    const callback = vi.fn();
    capture.onAudioData(callback);
    await capture.start();

    // 模擬 ScriptProcessor 的 onaudioprocess 事件
    const fakeData = new Float32Array([0.1, -0.2, 0.3]);
    mockScriptProcessor.onaudioprocess?.({
      inputBuffer: {
        getChannelData: () => fakeData,
      },
    });

    expect(callback).toHaveBeenCalledTimes(1);
    // 應該收到 Float32Array 的拷貝
    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(Float32Array);
  });
});
