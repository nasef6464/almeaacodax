import { estimateNarrationMs } from './boardState';
import { spokenTeachingText } from './spokenMath';

export type NarrationState = 'idle' | 'preparing' | 'speaking' | 'paused' | 'blocked' | 'unavailable' | 'error';
export const narrationNeedsRecovery = (state: NarrationState) => state === 'blocked' || state === 'unavailable' || state === 'error';
export interface NarrationEngine {
  speak(text: string, language: string, onEnd: () => void, speed?: number): void;
  pause(): void; resume(): void; cancel(): void;
}

/** Browser speech owns audio only; failure never pretends that narration finished. */
export class BrowserNarrationEngine implements NarrationEngine {
  private static owner?: BrowserNarrationEngine;
  private timer?: ReturnType<typeof setTimeout>;
  private startTimer?: ReturnType<typeof setTimeout>;
  private stopWaiting?: () => void;
  private remaining = 0;
  private startedAt = 0;
  private completion?: () => void;
  private speech?: SpeechSynthesisUtterance;
  private text = '';
  private language = '';
  private speed = 1;
  private interrupted = false;
  private speechStarted = false;
  private state: NarrationState = 'idle';
  constructor(private onState: (state: NarrationState) => void = () => {}) {}
  private report(state: NarrationState) { this.state = state; this.onState(state); }
  private clearTimers() {
    if (this.timer) clearTimeout(this.timer);
    if (this.startTimer) clearTimeout(this.startTimer);
    this.timer = undefined; this.startTimer = undefined;
    this.stopWaiting?.(); this.stopWaiting = undefined;
  }
  private releaseSpeech() {
    if (this.speech) { this.speech.onend = null; this.speech.onerror = null; this.speech.onstart = null; }
    if (BrowserNarrationEngine.owner === this) {
      window.speechSynthesis?.cancel(); BrowserNarrationEngine.owner = undefined;
    }
    this.speech = undefined; this.speechStarted = false;
  }
  private fail(state: NarrationState) {
    this.clearTimers(); this.releaseSpeech(); this.interrupted = true; this.report(state);
  }
  private suspendForBranch() { this.pause(); this.releaseSpeech(); this.interrupted = true; }
  private startWatchdog(speech: SpeechSynthesisUtterance) {
    this.startTimer = setTimeout(() => {
      this.startTimer = undefined;
      if (this.speech === speech && !this.speechStarted) this.fail('blocked');
    }, 4000);
  }
  private attachSpeech() {
    const previous = BrowserNarrationEngine.owner;
    if (previous && previous !== this) previous.suspendForBranch();
    BrowserNarrationEngine.owner = this;
    const speech = new SpeechSynthesisUtterance(this.text);
    this.speech = speech; this.speechStarted = false;
    speech.lang = this.language;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const matching = voices.filter(voice => voice.lang.toLowerCase().split('-')[0] === this.language.toLowerCase().split('-')[0]);
    const voice = matching.find(voice => voice.localService && voice.lang.toLowerCase() === this.language.toLowerCase())
      || matching.find(voice => voice.localService) || matching.find(voice => voice.lang.toLowerCase() === this.language.toLowerCase()) || matching[0];
    if (voice) speech.voice = voice;
    speech.rate = 0.94 * this.speed;
    speech.onstart = () => {
      if (this.speech !== speech) return;
      if (this.startTimer) clearTimeout(this.startTimer);
      this.startTimer = undefined; this.speechStarted = true;
      if (this.state === 'paused') { window.speechSynthesis.pause(); return; }
      this.report('speaking'); this.arm();
    };
    speech.onend = () => { if (this.speech === speech) this.finish(); };
    speech.onerror = event => {
      if (this.speech !== speech) return;
      this.fail(event.error === 'not-allowed' ? 'blocked'
        : ['voice-unavailable', 'language-unavailable', 'synthesis-unavailable'].includes(event.error) ? 'unavailable' : 'error');
    };
    this.startWatchdog(speech);
    window.speechSynthesis.speak(speech);
    // cancel() does not clear the synthesizer's global pause flag on all engines.
    if (this.speech === speech) window.speechSynthesis.resume();
  }
  private startSpeech(waitForVoices: boolean) {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      this.fail('unavailable'); return;
    }
    this.report('preparing');
    const synth = window.speechSynthesis;
    // Some mobile engines populate voices only after the opening tap.
    if (waitForVoices && synth.getVoices && !synth.getVoices().length && synth.addEventListener) {
      const ready = () => {
        if (!this.stopWaiting) return;
        this.stopWaiting(); this.stopWaiting = undefined;
        if (this.startTimer) clearTimeout(this.startTimer);
        this.startTimer = undefined;
        try { this.attachSpeech(); } catch { this.fail('error'); }
      };
      this.stopWaiting = () => synth.removeEventListener('voiceschanged', ready);
      synth.addEventListener('voiceschanged', ready);
      this.startTimer = setTimeout(ready, 1000);
    } else {
      try { this.attachSpeech(); } catch { this.fail('error'); }
    }
  }
  private arm() {
    if (this.timer) clearTimeout(this.timer);
    this.startedAt = Date.now();
    // Missing onend is a failure, not permission to silently skip a spoken step.
    this.timer = setTimeout(() => this.fail('error'), this.remaining);
  }
  private finish() { const callback = this.completion; this.cancel(); callback?.(); }
  speak(text: string, language: string, onEnd: () => void, speed = 1) {
    this.cancel(); this.completion = onEnd;
    this.text = spokenTeachingText(text, language); this.language = language;
    this.speed = [1, 1.25, 1.5].includes(speed) ? speed : 1;
    this.remaining = Math.min(180000, estimateNarrationMs(this.text) / this.speed * 3 + 5000);
    this.startSpeech(true);
  }
  /** Invoke directly in a tap handler, never behind an effect or await. */
  retry() {
    if (!this.completion) return;
    this.clearTimers(); this.releaseSpeech(); this.interrupted = false;
    this.remaining = Math.min(180000, estimateNarrationMs(this.text) / this.speed * 3 + 5000);
    this.startSpeech(false);
  }
  pause() {
    if (this.timer) this.remaining = Math.max(1, this.remaining - (Date.now() - this.startedAt));
    if (this.stopWaiting) this.interrupted = true;
    this.clearTimers();
    if (this.speech && typeof window !== 'undefined') window.speechSynthesis?.pause();
    if (this.state === 'speaking' || this.state === 'preparing') this.report('paused');
  }
  resume() {
    if (!this.completion || this.timer || narrationNeedsRecovery(this.state)) return;
    if (this.interrupted) { this.interrupted = false; this.startSpeech(false); }
    else if (this.speech && typeof window !== 'undefined') {
      window.speechSynthesis?.resume();
      if (this.speechStarted) { this.report('speaking'); this.arm(); }
      else this.startWatchdog(this.speech);
    }
  }
  cancel() {
    this.clearTimers(); this.completion = undefined; this.releaseSpeech();
    this.interrupted = false; this.report('idle');
  }
}
