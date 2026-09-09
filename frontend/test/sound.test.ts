// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('mobile audio unlock', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('resumes a suspended context and primes it from a user interaction', async () => {
    const start = vi.fn();
    const connect = vi.fn();
    class MobileAudioContext {
      state: AudioContextState = 'suspended';
      sampleRate = 44100;
      destination = {} as AudioDestinationNode;
      async resume() { this.state = 'running'; }
      createBuffer() { return {} as AudioBuffer; }
      createBufferSource() { return { connect, start, buffer: null }; }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: MobileAudioContext });

    const { unlockAudio } = await import('../src/services/sound');
    await expect(unlockAudio()).resolves.toBe(true);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
