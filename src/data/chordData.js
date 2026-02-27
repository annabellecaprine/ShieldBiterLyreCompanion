/**
 * Chord data for the 6-string Kolne Lyre by Shieldbiter Viking Crafts.
 * 
 * Supports multiple tuning modes (Major, Dorian).
 * Each key tunes the 6 strings to scale degrees 1-2-3-4-5-6 of the chosen mode.
 * Chords are formed by selectively playing (O=1) or muting (X=0) strings.
 * The O/X patterns are IDENTICAL across all keys within a mode — only note names change.
 */

// All 12 chromatic notes in order
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Note frequencies for audio synthesis
export const NOTE_FREQUENCIES = {
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
  'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00,
  'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.26, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
};

// --------------------------------------------------------------------------
//  Mode definitions
// --------------------------------------------------------------------------

/**
 * SCALE_MODES — each mode defines:
 *   label:          Display name
 *   intervals:      Semitone offsets for strings 1-6
 *   chordPatterns:  Playable chord shapes in this tuning
 *   degreeRootMap:  Maps each degree label → string index of its chord root
 */
const SCALE_MODES = {
  major: {
    label: 'Major',
    intervals: [0, 2, 4, 5, 7, 9],
    chordPatterns: [
      { pattern: [1, 0, 1, 0, 1, 0], degree: 'I', type: 'Major' },
      { pattern: [1, 0, 0, 0, 1, 0], degree: 'I5', type: 'Power' },
      { pattern: [0, 1, 0, 1, 0, 1], degree: 'ii', type: 'Minor' },
      { pattern: [0, 1, 0, 0, 0, 1], degree: 'II5', type: 'Power' },
      { pattern: [1, 1, 0, 1, 0, 1], degree: 'ii7', type: 'Minor 7th' },
      { pattern: [0, 1, 1, 0, 1, 0], degree: 'iii7', type: 'Minor 7th' },
      { pattern: [1, 1, 0, 0, 1, 0], degree: 'IV', type: 'Major' },
      { pattern: [1, 0, 0, 1, 0, 0], degree: 'IV5', type: 'Power' },
      { pattern: [0, 1, 0, 0, 1, 0], degree: 'V5', type: 'Power' },
      { pattern: [1, 0, 1, 0, 0, 1], degree: 'vi', type: 'Minor' },
      { pattern: [0, 0, 1, 0, 0, 1], degree: 'VI5', type: 'Power' },
    ],
    degreeRootMap: {
      'I': 0, 'I5': 0,
      'ii': 1, 'II5': 1, 'ii7': 1,
      'iii7': 2,
      'IV': 3, 'IV5': 3,
      'V5': 4,
      'vi': 5, 'VI5': 5,
    },
  },

  dorian: {
    label: 'Dorian',
    // Dorian: W-H-W-W-W-H  →  0, 2, 3, 5, 7, 9
    // Compared to Major, only the 3rd string is flatted (4 → 3 semitones).
    intervals: [0, 2, 3, 5, 7, 9],
    chordPatterns: [
      // ── Tonic (i) ──
      // Strings 1-♭3-5 = 0,3,7 → minor triad
      { pattern: [1, 0, 1, 0, 1, 0], degree: 'i', type: 'Minor' },
      // Strings 1-5 = 0,7 → power chord
      { pattern: [1, 0, 0, 0, 1, 0], degree: 'i5', type: 'Power' },

      // ── Supertonic (ii) ──
      // Strings 2-4-6 = 2,5,9 → from 2: 0,3,7 → minor triad
      { pattern: [0, 1, 0, 1, 0, 1], degree: 'ii', type: 'Minor' },
      // Strings 2-6 = 2,9 → from 2: 0,7 → power chord
      { pattern: [0, 1, 0, 0, 0, 1], degree: 'ii5', type: 'Power' },
      // Strings 1-2-4-6 = 0,2,5,9 → from 2: 0,3,7,10 → minor 7th
      { pattern: [1, 1, 0, 1, 0, 1], degree: 'ii7', type: 'Minor 7th' },

      // ── Mediant (♭III) ──
      // Strings 2-♭3-5 = 2,3,7 → from ♭3: 0,4,11 → major + maj7 (no 5th)
      { pattern: [0, 1, 1, 0, 1, 0], degree: '♭IIImaj7', type: 'Major 7th' },

      // ── Subdominant (IV) — the Dorian signature chord ──
      // Strings 1-2-5 = 0,2,7 → same notes as Major IV voicing
      { pattern: [1, 1, 0, 0, 1, 0], degree: 'IV', type: 'Major' },
      // Strings 1-4 = 0,5 → power chord
      { pattern: [1, 0, 0, 1, 0, 0], degree: 'IV5', type: 'Power' },
      // Strings ♭3-4-6 = 3,5,9 → from 4(5): 0,4,10 → dominant 7th (no 5th)
      { pattern: [0, 0, 1, 1, 0, 1], degree: 'IV7', type: 'Dominant 7th' },
      // Strings 1-♭3-4-6 = 0,3,5,9 → from 4(5): 0,4,7,10 → dominant 7th
      { pattern: [1, 0, 1, 1, 0, 1], degree: 'IV7', type: 'Dominant 7th' },

      // ── Dominant (v) ──
      // Strings 2-5 = 2,7 → from 5: 0,7 → power chord
      { pattern: [0, 1, 0, 0, 1, 0], degree: 'v5', type: 'Power' },

      // ── Submediant (vi°) ──
      // Strings 1-♭3-6 = 0,3,9 → from 6(9): 0,3,6 → diminished triad
      { pattern: [1, 0, 1, 0, 0, 1], degree: 'vi°', type: 'Diminished' },
    ],
    degreeRootMap: {
      'i': 0, 'i5': 0,
      'ii': 1, 'ii5': 1, 'ii7': 1,
      '♭IIImaj7': 2,
      'IV': 3, 'IV5': 3, 'IV7': 3,
      'v5': 4,
      'vi°': 5,
    },
  },
};

// Chord-name suffix map (shared across modes)
const SUFFIX_MAP = {
  'Major': '',
  'Power': '5',
  'Minor': 'm',
  'Minor 7th': 'm7',
  'Major 7th': 'maj7',
  'Dominant 7th': '7',
  'Diminished': 'dim',
};

// --------------------------------------------------------------------------
//  Public constants
// --------------------------------------------------------------------------

export const MODE_LIST = Object.keys(SCALE_MODES);
export const MODE_LABELS = Object.fromEntries(
  MODE_LIST.map(m => [m, SCALE_MODES[m].label])
);
export const KEY_LIST = [...CHROMATIC_NOTES];

// --------------------------------------------------------------------------
//  Internal helpers
// --------------------------------------------------------------------------

function getModeConfig(mode) {
  return SCALE_MODES[mode] || SCALE_MODES.major;
}

/**
 * Get the 6 string note names for a given key and mode.
 */
function getStringNotes(rootNote, mode = 'major') {
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
  const intervals = getModeConfig(mode).intervals;
  return intervals.map(interval => CHROMATIC_NOTES[(rootIndex + interval) % 12]);
}

/**
 * Get the chord name for a given pattern in a given key and mode.
 */
function getChordName(rootNote, chordDef, mode = 'major') {
  const strings = getStringNotes(rootNote, mode);
  const { degree, type } = chordDef;
  const config = getModeConfig(mode);
  const chordRoot = strings[config.degreeRootMap[degree]];
  return chordRoot + (SUFFIX_MAP[type] || '');
}

/**
 * Build the complete tuning data for a given key and mode.
 */
function buildTuning(rootNote, mode = 'major') {
  const strings = getStringNotes(rootNote, mode);
  const config = getModeConfig(mode);
  const chords = config.chordPatterns.map(chordDef => ({
    pattern: [...chordDef.pattern],
    name: getChordName(rootNote, chordDef, mode),
    degree: chordDef.degree,
    type: chordDef.type,
  }));
  return { strings, chords };
}

// --------------------------------------------------------------------------
//  Public API
// --------------------------------------------------------------------------

/**
 * Get the octave-qualified note names for strings in a given key/mode.
 * Lyre strings span roughly octave 3-4 range.
 */
export function getStringFrequencies(rootNote, mode = 'major') {
  const strings = getStringNotes(rootNote, mode);
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);

  // Lower roots start at octave 4, higher roots at octave 3
  let octave = rootIndex <= 4 ? 4 : 3;

  return strings.map((note, i) => {
    if (i > 0) {
      const prevIndex = CHROMATIC_NOTES.indexOf(strings[i - 1]);
      const currIndex = CHROMATIC_NOTES.indexOf(note);
      if (currIndex <= prevIndex) {
        octave++;
      }
    }
    const noteWithOctave = `${note}${octave}`;
    return {
      note,
      octave,
      noteWithOctave,
      frequency: NOTE_FREQUENCIES[noteWithOctave] || 440,
    };
  });
}

// Build all tunings: TUNINGS[mode][key]
export const TUNINGS = {};
for (const mode of MODE_LIST) {
  TUNINGS[mode] = {};
  for (const note of CHROMATIC_NOTES) {
    TUNINGS[mode][note] = buildTuning(note, mode);
  }
}

// Legacy flat exports for backward compatibility
export { CHROMATIC_NOTES };
