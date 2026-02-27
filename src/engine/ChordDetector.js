/**
 * Chord Detector for the Shieldbiter Lyre Companion.
 * Takes current string states and finds the matching chord.
 */

import { TUNINGS } from '../data/chordData.js';

/**
 * Detect which chord matches the current string open/mute pattern.
 * 
 * @param {string} currentKey - The current tuning key (e.g., "C", "G#")
 * @param {number[]} stringStates - Array of 6 values, 1=open, 0=muted
 * @param {string} mode - The current tuning mode (e.g., "major", "dorian")
 * @returns {{ name: string, degree: string, type: string } | null} - The matched chord or null
 */
export function detectChord(currentKey, stringStates, mode = 'major') {
    const tuning = TUNINGS[mode]?.[currentKey];
    if (!tuning) return null;

    for (const chord of tuning.chords) {
        const matches = chord.pattern.every((val, i) => val === stringStates[i]);
        if (matches) {
            return {
                name: chord.name,
                degree: chord.degree,
                type: chord.type,
            };
        }
    }

    // No exact match found — check if any strings are open at all
    const anyOpen = stringStates.some(s => s === 1);
    if (!anyOpen) {
        return { name: 'Muted', degree: '-', type: 'All strings muted' };
    }

    return null; // Unknown pattern
}

/**
 * Get the count of open strings.
 * @param {number[]} stringStates 
 * @returns {number}
 */
export function countOpenStrings(stringStates) {
    return stringStates.filter(s => s === 1).length;
}
