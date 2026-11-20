// ============================================================================
// MOTOR DE AUDIO SINTETIZADO (Web Audio API)
// Sin archivos externos: sonidos retro-modernos suaves con botón de silencio.
// ============================================================================

class TactileAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    endFreq?: number,
    delay = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // Ignora bloqueos en entornos headless
    }
  }

  public playMarkSafe(): void {
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(540 * jitter, 0.055, 'triangle', 0.06, 420 * jitter);
  }

  public playMarkFlag(): void {
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(220 * jitter, 0.09, 'sine', 0.11, 310 * jitter);
  }

  public playMarkQuestion(): void {
    this.playTone(460, 0.06, 'sine', 0.055, 560);
  }

  public playClearMark(): void {
    this.playTone(340, 0.045, 'sine', 0.045, 250);
  }

  public playLineComplete(): void {
    this.playTone(587.33, 0.11, 'sine', 0.055, undefined, 0);
    this.playTone(880, 0.14, 'sine', 0.05, undefined, 0.055);
  }

  public playHint(): void {
    this.playTone(440, 0.12, 'triangle', 0.06, 660);
  }

  public playScanner(): void {
    this.playTone(320, 0.09, 'triangle', 0.07, 640, 0);
    this.playTone(640, 0.11, 'sine', 0.06, 920, 0.07);
  }

  public playUndo(): void {
    this.playTone(390, 0.06, 'sine', 0.05, 290);
  }

  public playError(): void {
    this.playTone(170, 0.16, 'sawtooth', 0.07, 115);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, 'triangle', 0.075, undefined, idx * 0.075);
    });
  }

  public playDefeat(): void {
    this.playTone(260, 0.18, 'triangle', 0.07, 190, 0);
    this.playTone(185, 0.28, 'triangle', 0.07, 130, 0.14);
  }
}

export const soundFx = new TactileAudioEngine();
