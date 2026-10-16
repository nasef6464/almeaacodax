let openingCue: SpeechSynthesisUtterance | undefined;
/** Run in the opening tap, before lazy imports/API waits lose user activation. */
export function prepareTeachingAudio() {
  if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const synth = window.speechSynthesis;
    synth.getVoices?.();
    const cue = new SpeechSynthesisUtterance('نبدأ');
    openingCue = cue;
    const release = () => { if (openingCue === cue) openingCue = undefined; };
    cue.onend = release; cue.onerror = release;
    cue.lang = 'ar-SA';
    cue.rate = 1;
    // A real, brief utterance: empty/silent audio is not a reliable mobile unlock.
    synth.cancel();
    synth.speak(cue);
    synth.resume();
  } catch { /* The actual narrator reports failures and offers a direct retry. */ }
}
