/**
 * Audio Engine for the Shieldbiter Lyre Companion.
 * Uses Karplus-Strong synthesis for realistic plucked string sounds.
 * 
 * Karplus-Strong works by:
 * 1. Filling a delay buffer with noise (the "pluck" excitation)
 * 2. Feeding the buffer through a low-pass filter and back into itself
 * 3. The delay length determines the pitch, the filter creates natural decay
 * 
 * This produces a warm, organic plucked-string sound that's far more
 * realistic than simple oscillator-based synthesis.
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
 * Generate a Karplus-Strong plucked string buffer.
 * 
 * @param {AudioContext} ctx - The audio context
 * @param {number} frequency - Fundamental frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {object} options - Synthesis options
 * @returns {AudioBuffer} The generated audio buffer
 */
function generateKarplusStrong(ctx, frequency, duration, options = {}) {
    const {
        brightness = 0.5,     // 0 = dark/mellow, 1 = bright/metallic
        damping = 0.996,      // How slowly the string decays (0.99 = fast, 0.999 = long)
        pluckPosition = 0.5,  // Where the string is plucked (0 = bridge, 1 = middle)
        bodyResonance = 0.3,  // Amount of body resonance to add
    } = options;

    const sampleRate = ctx.sampleRate;
    const numSamples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const output = buffer.getChannelData(0);

    // Delay line length = samples per period
    const delayLength = Math.round(sampleRate / frequency);
    const delayLine = new Float32Array(delayLength);

    // Initialize delay line with shaped noise (the "pluck")
    // Shape the noise based on pluck position to filter out certain harmonics
    for (let i = 0; i < delayLength; i++) {
        let noise = Math.random() * 2 - 1;

        // Apply pluck position shaping — attenuates harmonics that have
        // a node at the pluck point, simulating real string excitation
        const pluckSample = Math.round(pluckPosition * delayLength);
        if (pluckSample > 0) {
            const harmonic = Math.round(delayLength / pluckSample);
            if (harmonic > 1 && i % harmonic === 0) {
                noise *= 0.3;
            }
        }

        delayLine[i] = noise;
    }

    // Lowpass filter coefficient based on brightness
    // Lower = darker/warmer, higher = brighter
    const filterCoeff = 0.3 + brightness * 0.5;

    // Previous sample for the one-pole lowpass filter
    let prevSample = 0;
    let readIndex = 0;

    // Body resonance filter state
    let bodyState1 = 0;
    let bodyState2 = 0;
    const bodyFreq = 180; // Lyre body resonance ~180 Hz
    const bodyQ = 3;
    const bodyW = 2 * Math.PI * bodyFreq / sampleRate;
    const bodyAlpha = Math.sin(bodyW) / (2 * bodyQ);
    const bodyA0 = 1 + bodyAlpha;
    const bodyB0 = bodyAlpha / bodyA0;
    const bodyB2 = -bodyAlpha / bodyA0;
    const bodyA1 = -2 * Math.cos(bodyW) / bodyA0;
    const bodyA2 = (1 - bodyAlpha) / bodyA0;

    for (let i = 0; i < numSamples; i++) {
        // Read from delay line
        const currentSample = delayLine[readIndex];

        // One-pole lowpass filter (string damping)
        // Averages current and previous sample, weighted by brightness
        const filtered = filterCoeff * currentSample + (1 - filterCoeff) * prevSample;
        prevSample = filtered;

        // Apply damping (energy loss per cycle)
        const damped = filtered * damping;

        // Write back to delay line
        delayLine[readIndex] = damped;

        // Add subtle body resonance
        let bodySample = 0;
        if (bodyResonance > 0) {
            const bodyInput = currentSample;
            bodySample = bodyB0 * bodyInput + bodyState1;
            bodyState1 = -bodyA1 * bodySample + bodyState2;
            bodyState2 = bodyB2 * bodyInput - bodyA2 * bodySample;
            bodySample *= bodyResonance;
        }

        // Output is the delay line sample + body resonance
        output[i] = currentSample + bodySample;

        // Advance read pointer (circular buffer)
        readIndex = (readIndex + 1) % delayLength;
    }

    return buffer;
}

/**
 * Apply an amplitude envelope to shape the attack and release.
 */
function applyEnvelope(ctx, gainNode, now, duration) {
    const attack = 0.003;  // Very fast attack (pluck)
    const decay = 0.08;    // Quick initial decay
    const sustainLevel = 0.6;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel, now + attack + decay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
}

/**
 * Play a single plucked string sound using Karplus-Strong synthesis.
 * 
 * @param {number} frequency - The fundamental frequency of the string
 * @param {number} duration - Duration in seconds (default 2.0s)
 * @param {number} volume - Volume 0-1 (default 0.3)
 */
export function playString(frequency, duration = 2.0, volume = 0.3) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Vary synthesis parameters slightly for natural feel
    const brightness = 0.35 + Math.random() * 0.15;
    const pluckPos = 0.4 + Math.random() * 0.2;
    const damping = 0.995 + Math.random() * 0.003;

    // Generate the Karplus-Strong buffer
    const ksBuf = generateKarplusStrong(ctx, frequency, duration, {
        brightness,
        damping,
        pluckPosition: pluckPos,
        bodyResonance: 0.25,
    });

    // Create source and play
    const source = ctx.createBufferSource();
    source.buffer = ksBuf;

    // Envelope shaping
    const envelope = ctx.createGain();
    envelope.gain.value = volume;
    applyEnvelope(ctx, envelope, now, duration);

    // Subtle high-frequency rolloff for warmth
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.setValueAtTime(3000 + frequency * 2, now);
    warmth.Q.setValueAtTime(0.7, now);

    // Connect: source → warmth → envelope → output
    source.connect(warmth);
    warmth.connect(envelope);
    envelope.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);
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
                playString(str.frequency, 2.5, 0.22);
            }, i * strumSpeed);
        }
    });
}

/**
 * Play a single string by index (used for individual plucks and reference tones).
 * 
 * @param {number} frequency - Frequency to play
 */
export function pluckString(frequency) {
    resumeAudio();
    playString(frequency, 2.2, 0.35);
}
