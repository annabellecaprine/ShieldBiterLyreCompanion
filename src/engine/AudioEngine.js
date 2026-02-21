/**
 * Audio Engine for the Shieldbiter Lyre Companion.
 * Uses Web Audio API to synthesize plucked lyre string sounds.
 */

let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Resume audio context (required after user interaction for autoplay policy).
 */
export function resumeAudio() {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
}

/**
 * Play a single plucked string sound.
 * Uses a combination of harmonics with exponential decay to simulate a lyre string.
 * 
 * @param {number} frequency - The fundamental frequency of the string
 * @param {number} duration - Duration in seconds (default 1.5s)
 * @param {number} volume - Volume 0-1 (default 0.3)
 */
export function playString(frequency, duration = 1.5, volume = 0.3) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create a merger for multiple harmonics
    const merger = ctx.createGain();
    merger.gain.setValueAtTime(volume, now);
    merger.gain.exponentialRampToValueAtTime(0.001, now + duration);
    merger.connect(ctx.destination);

    // Harmonics for a plucked string timbre
    const harmonics = [
        { ratio: 1, amplitude: 1.0 },  // Fundamental
        { ratio: 2, amplitude: 0.5 },  // 2nd harmonic
        { ratio: 3, amplitude: 0.25 },  // 3rd harmonic
        { ratio: 4, amplitude: 0.12 },  // 4th harmonic
        { ratio: 5, amplitude: 0.06 },  // 5th harmonic
    ];

    harmonics.forEach(({ ratio, amplitude }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency * ratio, now);

        // Higher harmonics decay faster (natural string behavior)
        gain.gain.setValueAtTime(amplitude * volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration / ratio);

        osc.connect(gain);
        gain.connect(merger);

        osc.start(now);
        osc.stop(now + duration);
    });

    // Add a subtle "pluck" attack with noise burst
    const noiseLength = 0.03;
    const bufferSize = ctx.sampleRate * noiseLength;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(frequency * 2, now);
    noiseFilter.Q.setValueAtTime(1, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLength);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + noiseLength);
}

/**
 * Strum all open strings with a slight delay between each (arpeggiated).
 * 
 * @param {Array} stringFrequencies - Array of { frequency, isOpen } objects
 * @param {number} strumSpeed - Delay between strings in ms (default 50ms)
 * @param {string} direction - 'down' (low to high) or 'up' (high to low)
 */
export function strumChord(stringFrequencies, strumSpeed = 50, direction = 'down') {
    resumeAudio();

    const strings = direction === 'up'
        ? [...stringFrequencies].reverse()
        : stringFrequencies;

    strings.forEach((str, i) => {
        if (str.isOpen) {
            setTimeout(() => {
                playString(str.frequency, 2.0, 0.25);
            }, i * strumSpeed);
        }
    });
}

/**
 * Play a single string by index.
 * 
 * @param {number} frequency - Frequency to play
 */
export function pluckString(frequency) {
    resumeAudio();
    playString(frequency, 1.8, 0.35);
}
