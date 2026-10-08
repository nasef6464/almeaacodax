import { estimateNarrationMs } from './boardState';

export interface NarrationEngine {
  speak(text: string, language: string, onEnd: () => void): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}

/** One owner of browser speech. The board is independent of this implementation. */
export class BrowserNarrationEngine implements NarrationEngine {
  private static owner?: BrowserNarrationEngine;
  private timer?: ReturnType<typeof setTimeout>;
  private remaining = 0;
  private startedAt = 0;
  private completion?: () => void;
  private speech?: SpeechSynthesisUtterance;
  private text = '';
  private language = '';
  private interrupted = false;

  private releaseSpeech() {
    if (this.speech) { this.speech.onend = null; this.speech.onerror = null; }
    if (BrowserNarrationEngine.owner === this) {
      window.speechSynthesis.cancel();
      BrowserNarrationEngine.owner = undefined;
    }
    this.speech = undefined;
  }
  private suspendForBranch() {
    this.pause();
    this.releaseSpeech();
    this.interrupted = true;
  }
  private attachSpeech() {
    const previous = BrowserNarrationEngine.owner;
    if (previous && previous !== this) previous.suspendForBranch();
    BrowserNarrationEngine.owner = this;
    this.speech = new SpeechSynthesisUtterance(this.text);
    this.speech.lang = this.language;
    this.speech.rate = 0.94;
    this.speech.onend = () => this.finish();
    this.speech.onerror = () => {
      if (this.timer) clearTimeout(this.timer);
      this.remaining = estimateNarrationMs(this.text);
      this.arm();
    };
    window.speechSynthesis.speak(this.speech);
    window.speechSynthesis.resume();
  }

  private arm() {
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.finish(), this.remaining);
  }
  private finish() {
    const callback = this.completion;
    this.cancel();
    callback?.();
  }
  speak(text: string, language: string, onEnd: () => void) {
    this.cancel();
    this.completion = onEnd;
    this.text = text;
    this.language = language;
    this.interrupted = false;
    this.remaining = estimateNarrationMs(text);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Some devices never dispatch end/error. This is a content-sized watchdog.
      this.remaining = Math.min(180000, this.remaining * 3 + 5000);
      try { this.attachSpeech(); }
      catch { this.releaseSpeech(); this.remaining = estimateNarrationMs(text); }
    }
    this.arm();
  }
  pause() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.remaining = Math.max(1, this.remaining - (Date.now() - this.startedAt));
    }
    if (this.speech && typeof window !== 'undefined') window.speechSynthesis?.pause();
  }
  resume() {
    if (!this.completion || this.timer) return;
    if (this.interrupted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Browser TTS cannot reliably seek audio. Replay only this short narration
      // segment; the board keeps its precise saved action/elapsed position.
      this.interrupted = false;
      try { this.attachSpeech(); }
      catch { this.releaseSpeech(); this.remaining = estimateNarrationMs(this.text); }
    }
    if (this.speech && typeof window !== 'undefined') window.speechSynthesis?.resume();
    this.arm();
  }
  cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.completion = undefined;
    this.releaseSpeech();
    this.interrupted = false;
  }
}
