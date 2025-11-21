// Sound effect utilities using Web Audio API
export const playSuccessSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Success sound: Two ascending notes
  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
  oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

// Sad/disappointed sound - descending notes
export const playSadSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Sad descending tones
  oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
  oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.15); // F4
  oscillator.frequency.setValueAtTime(293.66, audioContext.currentTime + 0.3); // D4

  oscillator.type = 'triangle';
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.6);
};

// Frustrated/angry sound - sharp dissonant tones
export const playFrustratedSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Sharp dissonant tones
  oscillator.frequency.setValueAtTime(220.00, audioContext.currentTime); // A3
  oscillator.frequency.setValueAtTime(233.08, audioContext.currentTime + 0.08); // A#3
  oscillator.frequency.setValueAtTime(246.94, audioContext.currentTime + 0.16); // B3

  oscillator.type = 'square';
  gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
};

// Worried/anxious sound - oscillating tone
export const playWorriedSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Oscillating worried tones
  oscillator.frequency.setValueAtTime(440.00, audioContext.currentTime); // A4
  oscillator.frequency.setValueAtTime(415.30, audioContext.currentTime + 0.1); // G#4
  oscillator.frequency.setValueAtTime(440.00, audioContext.currentTime + 0.2); // A4
  oscillator.frequency.setValueAtTime(415.30, audioContext.currentTime + 0.3); // G#4

  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

// Neutral/calm acknowledgment sound
export const playNeutralSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Simple neutral tone
  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5

  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};
