/**
 * Chord data for the 6-string Kolne Lyre by Shieldbiter Viking Crafts.
 * 
 * Each key tunes the 6 strings to the major scale degrees 1-2-3-4-5-6.
 * Chords are formed by selectively playing (O=1) or muting (X=0) strings.
 * The O/X patterns are IDENTICAL across all keys - only note names change.
 */

// The universal chord patterns (same for every key)
// pattern: [string1, string2, string3, string4, string5, string6]
// 1 = Open (played), 0 = Muted
const CHORD_PATTERNS = [
  { pattern: [1, 0, 1, 0, 1, 0], degree: 'I',     type: 'Major' },
  { pattern: [1, 0, 0, 0, 1, 0], degree: 'I5',    type: 'Power' },
  { pattern: [0, 1, 0, 1, 0, 1], degree: 'ii',    type: 'Minor' },
  { pattern: [0, 1, 0, 0, 0, 1], degree: 'II5',   type: 'Power' },
  { pattern: [1, 1, 0, 1, 0, 1], degree: 'ii7',   type: 'Minor 7th' },
  { pattern: [0, 1, 1, 0, 1, 0], degree: 'iii7',  type: 'Minor 7th' },
  { pattern: [1, 1, 0, 0, 1, 0], degree: 'IV',    type: 'Major' },
  { pattern: [1, 0, 0, 1, 0, 0], degree: 'IV5',   type: 'Power' },
  { pattern: [0, 1, 0, 0, 1, 0], degree: 'V5',    type: 'Power' },
  { pattern: [1, 0, 1, 0, 0, 1], degree: 'vi',    type: 'Minor' },
  { pattern: [0, 0, 1, 0, 0, 1], degree: 'VI5',   type: 'Power' },
];

// All 12 chromatic notes in order
const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Major scale intervals (semitones from root): W-W-H-W-W-W-H
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9];

// Note frequencies (4th octave) for audio synthesis
export const NOTE_FREQUENCIES = {
  'C3':  130.81, 'C#3': 138.59, 'D3':  146.83, 'D#3': 155.56,
  'E3':  164.81, 'F3':  174.61, 'F#3': 185.00, 'G3':  196.00,
  'G#3': 207.65, 'A3':  220.00, 'A#3': 233.08, 'B3':  246.94,
  'C4':  261.63, 'C#4': 277.18, 'D4':  293.66, 'D#4': 311.13,
  'E4':  329.63, 'F4':  349.23, 'F#4': 369.99, 'G4':  392.00,
  'G#4': 415.30, 'A4':  440.00, 'A#4': 466.16, 'B4':  493.88,
  'C5':  523.25, 'C#5': 554.37, 'D5':  587.33, 'D#5': 622.25,
  'E5':  659.26, 'F5':  698.46, 'F#5': 739.99, 'G5':  783.99,
  'G#5': 830.61, 'A5':  880.00, 'A#5': 932.33, 'B5':  987.77,
};

/**
 * Get the 6 string note names for a given key.
 * Strings are tuned to scale degrees 1-2-3-4-5-6 of the major scale.
 */
function getStringNotes(rootNote) {
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
  return MAJOR_SCALE_INTERVALS.map(interval => {
    return CHROMATIC_NOTES[(rootIndex + interval) % 12];
  });
}

/**
 * Get the chord name for a given pattern in a given key.
 * Maps scale degree chord types to proper chord names.
 */
function getChordName(rootNote, chordDef) {
  const strings = getStringNotes(rootNote);
  const { degree, type } = chordDef;

  // Determine the chord root note based on the degree
  const degreeRootMap = {
    'I': 0, 'I5': 0,
    'ii': 1, 'II5': 1, 'ii7': 1, 
    'iii7': 2,
    'IV': 3, 'IV5': 3,
    'V5': 4,
    'vi': 5, 'VI5': 5,
  };

  const chordRoot = strings[degreeRootMap[degree]];

  // Build chord name suffix
  const suffixMap = {
    'Major': '',
    'Power': '5',
    'Minor': 'm',
    'Minor 7th': 'm7',
  };

  return chordRoot + (suffixMap[type] || '');
}

/**
 * Build the complete tuning data for a given key.
 */
function buildTuning(rootNote) {
  const strings = getStringNotes(rootNote);
  const chords = CHORD_PATTERNS.map(chordDef => ({
    pattern: [...chordDef.pattern],
    name: getChordName(rootNote, chordDef),
    degree: chordDef.degree,
    type: chordDef.type,
  }));

  return { strings, chords };
}

/**
 * Get the octave-qualified note names for strings in a given key.
 * Lyre strings span roughly octave 3-4 range.
 */
export function getStringFrequencies(rootNote) {
  const strings = getStringNotes(rootNote);
  const rootIndex = CHROMATIC_NOTES.indexOf(rootNote);
  
  // Start octave: lower roots start at octave 4, higher roots at octave 3
  // to keep the range comfortable
  let octave = rootIndex <= 4 ? 4 : 3; // C-E start at 4, F-B start at 3
  
  return strings.map((note, i) => {
    // If this note is lower in chromatic order than the previous,
    // we've wrapped around — bump the octave
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

// Build all 12 tunings
export const TUNINGS = {};
export const KEY_LIST = [...CHROMATIC_NOTES];

for (const note of CHROMATIC_NOTES) {
  TUNINGS[note] = buildTuning(note);
}

export { CHORD_PATTERNS, CHROMATIC_NOTES, MAJOR_SCALE_INTERVALS };
