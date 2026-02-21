/**
 * PitchDetector — Microphone-based pitch detection using autocorrelation.
 * Optimized for single-note instruments like the lyre.
 */

import { NOTE_FREQUENCIES, CHROMATIC_NOTES } from '../data/chordData.js';

// Build a lookup table of all note frequencies across octaves 2-6
const ALL_NOTES = [];
for (let octave = 2; octave <= 6; octave++) {
    for (const note of CHROMATIC_NOTES) {
        const key = `${note}${octave}`;
        const freq = NOTE_FREQUENCIES[key];
        if (freq) {
            ALL_NOTES.push({ note, octave, key, frequency: freq });
        }
    }
}

/**
 * Find the closest note to a given frequency.
 * Returns { note, octave, frequency, cents }
 * where cents is the deviation from the target (-50 to +50).
 */
function findClosestNote(frequency) {
    if (!frequency || frequency < 50 || frequency > 2000) return null;

    let closest = null;
    let minDistance = Infinity;

    for (const n of ALL_NOTES) {
        // Calculate distance in cents
        const cents = 1200 * Math.log2(frequency / n.frequency);
        const absCents = Math.abs(cents);
        if (absCents < minDistance) {
            minDistance = absCents;
            closest = { ...n, cents: Math.round(cents) };
        }
    }

    return closest;
}

export class PitchDetector {
    constructor(options = {}) {
        this.onPitch = options.onPitch || (() => { });
        this.onError = options.onError || (() => { });
        this.onStateChange = options.onStateChange || (() => { });

        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.rafId = null;
        this.isListening = false;

        // Detection parameters
        this.fftSize = 4096;
        this.smoothingTimeConstant = 0.4;
        this.minConfidence = 0.6;   // Minimum autocorrelation confidence
        this.minVolume = 0.002;    // Minimum RMS volume to attempt detection
    }

    /**
     * Request microphone access and start listening.
     */
    async start() {
        try {
            this.onStateChange('requesting');

            // Get microphone stream
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                }
            });

            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

            // Connect microphone to analyser
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);

            this.isListening = true;
            this.onStateChange('listening');

            // Start detection loop
            this._detectLoop();

        } catch (err) {
            this.onStateChange('error');
            if (err.name === 'NotAllowedError') {
                this.onError('Microphone access was denied. Please allow microphone access to use the tuner.');
            } else if (err.name === 'NotFoundError') {
                this.onError('No microphone found. Please connect a microphone to use the tuner.');
            } else {
                this.onError(`Microphone error: ${err.message}`);
            }
        }
    }

    /**
     * Stop listening and release resources.
     */
    stop() {
        this.isListening = false;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.onStateChange('stopped');
    }

    /**
     * Main detection loop using requestAnimationFrame.
     */
    _detectLoop() {
        if (!this.isListening) return;

        const buffer = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(buffer);

        // Calculate RMS volume
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);

        if (rms > this.minVolume) {
            // Attempt pitch detection
            const result = this._autoCorrelate(buffer, this.audioContext.sampleRate);

            if (result.frequency > 0 && result.confidence > this.minConfidence) {
                const noteInfo = findClosestNote(result.frequency);
                if (noteInfo) {
                    this.onPitch({
                        frequency: Math.round(result.frequency * 10) / 10,
                        note: noteInfo.note,
                        octave: noteInfo.octave,
                        cents: noteInfo.cents,
                        targetFrequency: noteInfo.frequency,
                        confidence: result.confidence,
                        volume: rms,
                    });
                }
            } else {
                // Signal detected but pitch unclear
                this.onPitch({ frequency: 0, note: null, cents: 0, volume: rms, confidence: 0 });
            }
        } else {
            // Too quiet
            this.onPitch({ frequency: 0, note: null, cents: 0, volume: rms, confidence: 0 });
        }

        this.rafId = requestAnimationFrame(() => this._detectLoop());
    }

    /**
     * Autocorrelation pitch detection algorithm.
     * Returns { frequency, confidence }
     */
    _autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        const correlations = new Float32Array(MAX_SAMPLES);

        // Find the first positive-going zero crossing to reduce noise
        let start = 0;
        for (let i = 0; i < SIZE / 2; i++) {
            if (buffer[i] < 0 && buffer[i + 1] >= 0) {
                start = i;
                break;
            }
        }

        let bestOffset = -1;
        let bestCorrelation = 0;
        let foundGoodCorrelation = false;
        let lastCorrelation = 1;

        // Min period: ~2000 Hz, Max period: ~50 Hz
        const minPeriod = Math.floor(sampleRate / 2000);
        const maxPeriod = Math.floor(sampleRate / 50);

        for (let offset = minPeriod; offset < Math.min(maxPeriod, MAX_SAMPLES); offset++) {
            let correlation = 0;
            let norm1 = 0;
            let norm2 = 0;

            for (let i = start; i < MAX_SAMPLES; i++) {
                const val1 = buffer[i];
                const val2 = buffer[i + offset];
                correlation += val1 * val2;
                norm1 += val1 * val1;
                norm2 += val2 * val2;
            }

            // Normalized correlation
            const norm = Math.sqrt(norm1 * norm2);
            correlation = norm > 0 ? correlation / norm : 0;
            correlations[offset] = correlation;

            if (correlation > 0.9 && correlation > bestCorrelation) {
                foundGoodCorrelation = true;
                bestCorrelation = correlation;
                bestOffset = offset;
            } else if (foundGoodCorrelation) {
                // We found a good correlation and it's now getting worse
                // Use parabolic interpolation for sub-sample accuracy
                if (bestOffset > 0 && bestOffset < MAX_SAMPLES - 1) {
                    const prev = correlations[bestOffset - 1];
                    const curr = correlations[bestOffset];
                    const next = correlations[bestOffset + 1];
                    const shift = (next - prev) / (2 * (2 * curr - prev - next));
                    const refinedOffset = bestOffset + (isFinite(shift) ? shift : 0);
                    return {
                        frequency: sampleRate / refinedOffset,
                        confidence: bestCorrelation,
                    };
                }
                return {
                    frequency: sampleRate / bestOffset,
                    confidence: bestCorrelation,
                };
            }

            lastCorrelation = correlation;
        }

        if (bestCorrelation > 0.8) {
            return {
                frequency: sampleRate / bestOffset,
                confidence: bestCorrelation,
            };
        }

        return { frequency: -1, confidence: 0 };
    }
}

export { findClosestNote };
