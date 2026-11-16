import type { FitRecord } from './face';
import type { FarPoint } from './farpoint';
// Type-only imports (erased at runtime), so the recommend.ts / i18n.ts -> types.ts imports form no runtime cycle.
import type { Lang } from './i18n';
import type { Interview } from './recommend';
import type { Letter } from './sloan';

export type Eye = 'right' | 'left';
export type Dir = 'up' | 'right' | 'down' | 'left';
export type Duochrome = 'red' | 'green' | 'equal';
/** What the person usually wears (a history question). Before export v8 it meant what was worn during the test. */
export type Correction = 'none' | 'glasses' | 'contacts';
/** What the eyes were tested with. Always without glasses; a contact lens wearer may keep them in. */
export type TestedWith = 'none' | 'contacts';
/**
 * Acuity optotype, chosen once per session: Tumbling E or Landolt C ('C', lib/landolt.ts), both answered by direction
 * with no reading needed, or Sloan letters. A Hindi-interview session gets 'C' without being asked (presetChart).
 */
export type Chart = 'E' | 'letters' | 'C';
/** Where the screen scale came from: the card step in this session, or one saved earlier on this device. */
export type ScaleSource = 'card' | 'saved';

/** One acuity answer, for validation against a printed chart. */
export interface AcuityAnswer {
  logMAR: number; // line shown
  ok: boolean; // answered correctly
  distanceMm: number | null; // measured face distance when answering
  shown?: Dir | Letter; // E opening or C gap direction, or the letter shown
  picked?: Dir | Letter | null; // what was tapped; null = "can't see"
}

/**
 * Line-dial answer. Each of the 6 dial lines is named by its lower clock hour (see lib/dial.ts):
 * 1 = 1–7, 2 = 2–8, 3 = 3–9 (horizontal), 4 = 4–10, 5 = 5–11, 6 = 6–12 (vertical).
 * - "Some are darker": { present: true, lines: [1 to 5 lines, ascending], axisDeg: axisEstimate(lines) }
 * - "All look the same": { present: false, lines: [], axisDeg: null }
 * - "Not sure": { present: false, lines: [], axisDeg: null, unsure: true }, so triage treats it like "All look the same".
 */
export interface DialAnswer {
  present: boolean;
  lines: number[];
  /** Provisional rule-of-30 axis estimate in degrees (15 to 180); null when there are no lines or the direction is unclear. */
  axisDeg: number | null;
  unsure?: true;
}

export interface EyeResult {
  /** Best line passed, in logMAR. null = could not read the coarsest line (worse than 6/60). */
  logMAR: number | null;
  /** True if the screen could not draw a finer line, so the real acuity may be better. */
  limited: boolean;
  /** Line dial; null until answered. */
  astigmatism: DialAnswer | null;
  duochrome: Duochrome | null;
  acuityAnswers: AcuityAnswer[];
  /**
   * Far-point estimate of short sight (lib/farpoint.ts), after the red-green test; null when skipped or not reached.
   * PROVISIONAL, never a prescription. Absent in reports before v13.
   */
  farPoint: FarPoint | null;
}

export interface Session {
  safetyFlags: string[];
  /** Usual wear; null until answered on the safety screen. */
  correction: Correction | null;
  /** What the test was done with; null until answered on the safety screen. */
  testedWith: TestedWith | null;
  pxPerMm: number; // CSS px per millimetre, from the ID-card step
  dpr: number; // devicePixelRatio when the scale was calibrated
  scaleSource: ScaleSource;
  /** ISO time of the saved card step when scaleSource is 'saved'; null when the card step was done in this session. */
  scaleSavedAt: string | null;
  targetMm: number;
  /** Camera focal length was set with the tape-measure step (otherwise the default FOV guess). */
  focalCalibrated: boolean;
  /** Demo mode: camera off, distance fixed at the target. Results are not real measurements. */
  demo: boolean;
  /** Acuity chart used for both eyes; null until chosen before the first eye. */
  chart: Chart | null;
  results: Record<Eye, EyeResult>;
  /** Frame-fit step (selfie PD, face shape, frame fit) after both eyes; null until it is reached. */
  fit: FitRecord | null;
  /** Short interview after the safety screen (lib/interview.ts); null when skipped, not reached, or after red flags. */
  interview: Interview | null;
  /**
   * Language of every patient screen and the interview, chosen first on the welcome screen (lib/i18n.ts). The app
   * always sets it; null only in sessions from before the welcome-screen choice. Display only: the report text,
   * staff screens and history stay English.
   */
  lang: Lang | null;
}
