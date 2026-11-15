/*
 * Phase 3 step 1: explainable, rule-based lens suggestions from the screening results and (later) a short
 * interview. Pure functions: the results screen shows the output and the report exports it.
 *
 * PROVISIONAL: every rule here is a first draft, to be reviewed with an optometrist before real-world use.
 * A screening aid, never a prescription: it names lens TYPES and options to discuss, never lens powers.
 * Powers come only from an optometrist's refraction.
 *
 * Rules, in order:
 * - Red flags (session.safetyFlags) override everything: 'refer-first', no items, see an eye doctor first.
 * - Lens type (at most one main lens, plus an office lens as a second pair):
 *   - age 40+ and (small-print complaint or either eye's near acuity below 6/6) -> progressive;
 *   - age 40+ and more than 6 h a day at screens -> office (near-intermediate) lens;
 *   - otherwise, when triage advises a lens (level 'advise' or 'refer') -> single vision.
 *   Without an interview the age is unknown, so only single vision is considered, with a note saying so.
 * - Status: triage 'refer' (without red flags) -> 'after-check' (items kept, to discuss after the eye check);
 *   else 'suggest' when a lens is indicated, else 'none'.
 * - Duochrome (red-green) per eye: red clearer -> myopic tendency, green clearer -> hyperopic tendency,
 *   equal/unanswered -> nothing. Notes, and a reason on the lens. The test is at 50 cm (near), where green
 *   also looks clearer when near focusing lags, so these are worded as hints.
 * - Under 18 with a myopic tendency -> a myopia-management note (ask the optometrist); no product item.
 * - Line dial "some darker" -> a note that lenses can correct astigmatism and the optometrist measures it.
 * - Lens options: anti-reflective whenever a lens is suggested; night driving or glare -> night-driving lens;
 *   more than 6 h of screens or eye strain -> blue-light filter; lots of time outdoors -> photochromic.
 *   Interview-driven options can appear with status 'none' (glasses chosen anyway).
 * - Frame: a captured frame fit gives one 'frame' item from lib/face.ts frameFit (not recomputed here).
 *
 * Language: recommend(..., lang) changes only the words (categories, reasons, notes), never the items or status.
 * The report and history always store the English one; ZEISS family names are never translated.
 */
import { FACE_SHAPE_TEXT, FRAME_SIZE_TEXT, fitText, type FitCapture } from './face';
import { fmt, inLang, listText, type Lang, type Text } from './i18n';
import { snellenOf, type Triage } from './triage';
import type { Duochrome, Eye, EyeResult, Session } from './types';

export type AgeBand = 'under18' | '18-39' | '40-59' | '60+';
export type ScreenHours = 'lt2' | '2to6' | 'gt6';
export type Outdoors = 'little' | 'some' | 'lots';
export type Complaint = 'headache' | 'glare' | 'small-print' | 'eye-strain';

/** Answers of the short interview (questions in lib/interview.ts); recommend() gets null when it was skipped. */
export interface Interview {
  ageBand: AgeBand;
  /** Hours a day at screens (phone, computer, TV). */
  screenHours: ScreenHours;
  nightDriving: boolean;
  outdoors: Outdoors;
  complaints: Complaint[];
}

/**
 * - 'refer-first': red flags; see an eye doctor before any lens choice (no items).
 * - 'after-check': triage refers for other reasons; the items are to discuss after the optometrist's check.
 * - 'suggest': a lens is indicated.
 * - 'none': no lens is indicated (interview-driven lens options and a frame may still be listed).
 */
export type RecStatus = 'refer-first' | 'after-check' | 'suggest' | 'none';
/** 'coating' covers every lens option on top of the lens type: coatings, filters, light-adaptive lenses. */
export type RecKind = 'lens' | 'coating' | 'frame';

export interface RecItem {
  kind: RecKind;
  /** Generic name, e.g. "Progressive lens". */
  category: string;
  /** ZEISS product family from ZEISS_FAMILY; null for a frame. */
  zeissFamily: string | null;
  /** Plain "Because …" sentences. */
  reasons: string[];
}

export interface Recommendation {
  status: RecStatus;
  items: RecItem[];
  notes: string[];
}

/**
 * The ZEISS product family for each option: the only place these names appear. Never translated.
 * Verify every name against ZEISS India's current catalogue and the hackathon rules before the demo.
 */
export const ZEISS_FAMILY = {
  progressive: 'ZEISS SmartLife Progressive',
  singleVision: 'ZEISS SmartLife Single Vision',
  office: 'ZEISS Officelens',
  nightDriving: 'ZEISS DriveSafe',
  blueLight: 'ZEISS BlueGuard',
  photochromic: 'ZEISS PhotoFusion X',
  antiReflective: 'ZEISS DuraVision Platinum',
  myopiaManagement: 'ZEISS MyoCare',
} as const;

export type LensOption = keyof typeof ZEISS_FAMILY;

/** Generic category for each option, shown above the ZEISS family. */
export const CATEGORY_TEXT: Record<LensOption, Text> = {
  progressive: { en: 'Progressive lens', hi: 'प्रोग्रेसिव लेंस' },
  singleVision: { en: 'Single-vision lens', hi: 'सिंगल-विज़न लेंस' },
  office: { en: 'Office lens (desk and screen distance)', hi: 'ऑफ़िस लेंस (मेज़ और स्क्रीन की दूरी के लिए)' },
  nightDriving: { en: 'Night-driving lens', hi: 'रात में गाड़ी चलाने का लेंस' },
  blueLight: { en: 'Blue-light filter', hi: 'ब्लू-लाइट फ़िल्टर' },
  photochromic: { en: 'Photochromic lens (darkens in sunlight)', hi: 'फ़ोटोक्रोमिक लेंस (धूप में गहरा हो जाता है)' },
  antiReflective: { en: 'Anti-reflective coating', hi: 'एंटी-रिफ़्लेक्टिव कोटिंग (चमक कम करने वाली परत)' },
  myopiaManagement: { en: 'Myopia-management lens', hi: 'मायोपिया कंट्रोल लेंस' },
};
/** English categories (report, staff screen). */
export const CATEGORY: Record<LensOption, string> = inLang(CATEGORY_TEXT, 'en');

/** One line per status for the results screen. */
export const STATUS_TEXTS: Record<RecStatus, Text> = {
  'refer-first': { en: 'See an eye doctor before choosing lenses', hi: 'लेंस चुनने से पहले आँखों के डॉक्टर को दिखाएँ' },
  'after-check': { en: 'To discuss after the eye check', hi: 'आँखों की जाँच के बाद बात करने के लिए' },
  suggest: { en: 'Options to discuss with the optometrist', hi: 'ऑप्टोमेट्रिस्ट से बात करने के लिए विकल्प' },
  none: { en: 'No lens indicated by this screening', hi: 'इस जाँच के हिसाब से लेंस की ज़रूरत नहीं दिखी' },
};
/** English status lines (staff screen). */
export const STATUS_TEXT: Record<RecStatus, string> = inLang(STATUS_TEXTS, 'en');

/**
 * Every sentence and phrase of the suggestions. Placeholders: {eyes} from EYES_TEXT, {cm} the test distance,
 * {age} from REC_TEXT.age40/age60, {why}/{list} a list joined with listText, {zeiss} a ZEISS family name.
 */
export const REC_TEXT = {
  referFirst: {
    en: 'Please see an eye doctor before choosing lenses: the symptoms you reported need a check first. Lens options can wait until after that visit.',
    hi: 'लेंस चुनने से पहले आँखों के डॉक्टर को दिखाएँ: आपने जो परेशानी बताई, उसकी पहले जाँच ज़रूरी है। लेंस के विकल्प उसके बाद देखे जा सकते हैं।',
  },
  afterCheck: {
    en: 'The screening suggests an eye check by an optometrist first. These options are to discuss after the check, once your prescription is measured.',
    hi: 'इस जाँच के हिसाब से पहले ऑप्टोमेट्रिस्ट से आँखों की जाँच करवाएँ। ये विकल्प उस जाँच के बाद बात करने के लिए हैं, जब आपका चश्मे का नंबर नप जाए।',
  },
  noneWithOptions: {
    en: 'No lens is indicated by this screening. The options below match your answers, if you choose glasses anyway (for example for screens or sun); ask the optician which are available.',
    hi: 'इस जाँच के हिसाब से लेंस की ज़रूरत नहीं दिखी। अगर आप फिर भी चश्मा लेना चाहें (जैसे स्क्रीन या धूप के लिए), तो नीचे के विकल्प आपके जवाबों से मेल खाते हैं; दुकान पर पूछें कि इनमें से कौन-से मिलते हैं।',
  },
  noInterview: {
    en: 'Age was not asked, so progressive and office lenses (for near focus from about 40) are not considered; they need the age question.',
    hi: 'उम्र नहीं पूछी गई, इसलिए प्रोग्रेसिव और ऑफ़िस लेंस (लगभग 40 की उम्र के बाद पास के काम के लिए) नहीं देखे गए; इनके लिए उम्र का सवाल ज़रूरी है।',
  },
  astigmatism: {
    en: 'The line dial hinted at astigmatism in {eyes}. Spectacle lenses can correct astigmatism; the optometrist measures how much and at which angle.',
    hi: 'लाइनों वाले गोले से {eyes} में एस्टिग्मैटिज़्म (सिलेंडर नंबर) का संकेत मिला। चश्मे के लेंस इसे ठीक कर सकते हैं; ऑप्टोमेट्रिस्ट नापेंगे कि यह कितना है और किस कोण पर है।',
  },
  myopiaManagement: {
    en: 'Myopia management: short sight in children and teens often increases as they grow. Ask the optometrist whether a myopia-management lens (for example {zeiss}) suits you.',
    hi: 'मायोपिया कंट्रोल: बच्चों और किशोरों में दूर का कम दिखना अक्सर बड़े होने के साथ बढ़ता है। ऑप्टोमेट्रिस्ट से पूछें कि क्या मायोपिया कंट्रोल लेंस (जैसे {zeiss}) आपके लिए ठीक है।',
  },
  eyeStrain: {
    en: 'Eye strain: regular screen breaks help most. Tell the optometrist about it, as an uncorrected prescription can also cause it.',
    hi: 'आँखों में थकान: स्क्रीन से बार-बार छोटा ब्रेक लेना सबसे ज़्यादा मदद करता है। ऑप्टोमेट्रिस्ट को इसके बारे में बताएँ, क्योंकि सही नंबर का चश्मा न होने से भी ऐसा होता है।',
  },
  headache: {
    en: 'Headaches: tell the optometrist. Uncorrected vision is one possible cause among many.',
    hi: 'सिर दर्द: ऑप्टोमेट्रिस्ट को बताएँ। नज़र की कमी ठीक न होना इसके कई कारणों में से एक हो सकता है।',
  },
  duoRed: {
    en: 'Red-green test: red looked clearer in {eyes}, a possible myopic (short-sighted) tendency.',
    hi: 'लाल-हरा टेस्ट: {eyes} में लाल ज़्यादा साफ़ दिखा, यानी दूर का कम दिखने (मायोपिया) का झुकाव हो सकता है।',
  },
  duoGreen: {
    en: 'Red-green test: green looked clearer in {eyes}, a possible hyperopic (long-sighted) tendency.',
    hi: 'लाल-हरा टेस्ट: {eyes} में हरा ज़्यादा साफ़ दिखा, यानी पास का कम दिखने (हाइपरोपिया) का झुकाव हो सकता है।',
  },
  duoNear: {
    en: 'The red-green test was done at {cm} cm (near), where green can also look clearer simply because near focusing lags, more so from about 40. Treat these as hints only; the optometrist\'s refraction decides.',
    hi: 'लाल-हरा टेस्ट {cm} cm (पास) पर हुआ, जहाँ पास पर फ़ोकस थोड़ा पीछे रहने से भी हरा ज़्यादा साफ़ दिख सकता है, खासकर लगभग 40 की उम्र के बाद। इन्हें सिर्फ़ संकेत मानें; असली फ़ैसला ऑप्टोमेट्रिस्ट की नंबर-जाँच से होगा।',
  },
  myopicPart: { en: 'a myopic (short-sighted) tendency in {eyes}', hi: '{eyes} में दूर का कम दिखने (मायोपिया) का झुकाव' },
  hyperopicPart: { en: 'a hyperopic (long-sighted) tendency in {eyes}', hi: '{eyes} में पास का कम दिखने (हाइपरोपिया) का झुकाव' },
  tendency: {
    en: "Because the red-green test hinted at {list}: only the optometrist's refraction can confirm it and set the lens strength.",
    hi: 'क्योंकि लाल-हरे टेस्ट के हिसाब से {list} हो सकता है: सिर्फ़ ऑप्टोमेट्रिस्ट की नंबर-जाँच ही इसे पक्का कर सकती है और लेंस का नंबर तय कर सकती है।',
  },
  frameCategory: { en: '{size} frame, front {lo}–{hi} mm', hi: '{size} फ़्रेम, आगे की चौड़ाई {lo}–{hi} mm' },
  frameWidth: {
    en: 'Because your face is about {w} mm wide at the cheekbones: a frame front of {lo}–{hi} mm neither pinches nor overhangs.',
    hi: 'क्योंकि गालों पर आपका चेहरा लगभग {w} mm चौड़ा है: {lo}–{hi} mm का फ़्रेम न कसेगा, न बाहर निकलेगा।',
  },
  frameShape: {
    en: 'Because your face shape looks {shape}: try {style}. {reason}',
    hi: 'क्योंकि आपका चेहरा {shape} लगता है: {style} आज़माएँ। {reason}',
  },
  nearBelow: { en: 'your near vision at {cm} cm is below 6/6 in {where}', hi: '{cm} cm पर आपकी पास की नज़र {where} में 6/6 से कम है' },
  whereBoth: { en: 'both eyes (right {right}, left {left})', hi: 'दोनों आँखों (दाईं {right}, बाईं {left})' },
  whereOne: { en: '{eye} ({snellen})', hi: '{eye} ({snellen})' },
  age40: { en: '40 or over', hi: '40 या उससे ज़्यादा' },
  age60: { en: '60 or over', hi: '60 या उससे ज़्यादा' },
  youAre: { en: 'you are {age}', hi: 'आपकी उम्र {age} है' },
  smallPrint: { en: 'find small print hard to read', hi: 'छोटे अक्षर पढ़ने में दिक्कत होती है' },
  progressive: {
    en: "Because {why}: focusing up close usually gets harder from about 40, and a progressive lens gives clear vision far away, at arm's length and up close in one lens.",
    hi: 'क्योंकि {why}: लगभग 40 की उम्र के बाद पास की चीज़ों पर फ़ोकस करना अक्सर मुश्किल होता है, और प्रोग्रेसिव लेंस एक ही लेंस में दूर, हाथ भर की दूरी पर और पास, तीनों जगह साफ़ दिखाता है।',
  },
  office: {
    en: 'Because you are {age} and spend more than 6 hours a day at screens: an office lens is made for desk and screen distances, with a wider clear zone there than a progressive lens.',
    hi: 'क्योंकि आपकी उम्र {age} है और आप दिन में 6 घंटे से ज़्यादा स्क्रीन देखते हैं: ऑफ़िस लेंस मेज़ और स्क्रीन की दूरी के लिए बना है, और वहाँ प्रोग्रेसिव लेंस से ज़्यादा चौड़ा साफ़ हिस्सा देता है।',
  },
  officeSecond: {
    en: 'Because a progressive lens has only a narrow zone for screen distance: an office lens works well as a second pair for long screen work.',
    hi: 'क्योंकि प्रोग्रेसिव लेंस में स्क्रीन की दूरी के लिए सिर्फ़ पतला हिस्सा होता है: लंबे समय के स्क्रीन के काम के लिए ऑफ़िस लेंस दूसरे चश्मे के रूप में अच्छा रहता है।',
  },
  svNear: {
    en: "Because {near}: a single-vision lens made to the optometrist's prescription can sharpen it.",
    hi: 'क्योंकि {near}: ऑप्टोमेट्रिस्ट के बताए नंबर से बना सिंगल-विज़न लेंस इसे साफ़ कर सकता है।',
  },
  svAstig: {
    en: 'Because the line dial hinted at astigmatism in {eyes}, which a lens can correct.',
    hi: 'क्योंकि लाइनों वाले गोले से {eyes} में एस्टिग्मैटिज़्म (सिलेंडर नंबर) का संकेत मिला, जिसे लेंस ठीक कर सकता है।',
  },
  svGeneric: {
    en: 'Because the screening suggests a lens is likely to help: a single-vision lens has one focus across the whole lens.',
    hi: 'क्योंकि इस जाँच के हिसाब से लेंस से मदद मिल सकती है: सिंगल-विज़न लेंस में पूरे लेंस पर एक ही फ़ोकस होता है।',
  },
  antiReflective: {
    en: 'Because a lens is suggested: an anti-reflective coating cuts reflections from lights and screens, so vision is clearer and the lens is easier to keep clean.',
    hi: 'क्योंकि लेंस सुझाया गया है: एंटी-रिफ़्लेक्टिव कोटिंग लाइट और स्क्रीन की चमक कम करती है, जिससे साफ़ दिखता है और लेंस साफ़ रखना आसान होता है।',
  },
  nightDrive: { en: 'you drive at night', hi: 'आप रात में गाड़ी चलाते हैं' },
  glare: { en: 'glare from lights bothers you', hi: 'रोशनी की चौंध से परेशानी होती है' },
  night: {
    en: 'Because {list}: a night-driving lens is designed to reduce glare from headlights and street lights.',
    hi: 'क्योंकि {list}: रात में गाड़ी चलाने का लेंस गाड़ियों और सड़क की लाइटों की चौंध कम करने के लिए बना है।',
  },
  screens6: { en: 'you spend more than 6 hours a day at screens', hi: 'आप दिन में 6 घंटे से ज़्यादा स्क्रीन देखते हैं' },
  strain: { en: 'you reported eye strain', hi: 'आपने आँखों में थकान बताई' },
  blue: {
    en: 'Because {list}: a blue-light filter cuts part of the blue-violet light from screens and LED lights.',
    hi: 'क्योंकि {list}: ब्लू-लाइट फ़िल्टर स्क्रीन और LED लाइट से आने वाली नीली-बैंगनी रोशनी का कुछ हिस्सा रोकता है।',
  },
  photochromic: {
    en: 'Because you spend a lot of time outdoors: photochromic lenses darken in sunlight, clear again indoors and block UV.',
    hi: 'क्योंकि आप काफ़ी समय बाहर धूप में रहते हैं: फ़ोटोक्रोमिक लेंस धूप में गहरे हो जाते हैं, अंदर आकर फिर साफ़ हो जाते हैं और UV रोकते हैं।',
  },
} satisfies Record<string, Text>;

/** "the right eye", "the left eye", "both eyes" (Hindi in the form used before में, "in"). */
export const EYES_TEXT = {
  right: { en: 'the right eye', hi: 'दाईं आँख' },
  left: { en: 'the left eye', hi: 'बाईं आँख' },
  both: { en: 'both eyes', hi: 'दोनों आँखों' },
} satisfies Record<string, Text>;

export type Tendency = 'myopic' | 'hyperopic';

/** PROVISIONAL reading of a red-green answer: red clearer -> myopic, green clearer -> hyperopic, else none. */
export function duochromeTendency(d: Duochrome | null): Tendency | null {
  if (d === 'red') return 'myopic';
  if (d === 'green') return 'hyperopic';
  return null;
}

/**
 * Near acuity shown to be below 6/6, with the same rule as triage: worse than 6/6 and not screen-limited
 * (a screen-limited result may really be better), or not able to read the largest line (null).
 */
export function belowSixSix(r: EyeResult): boolean {
  return r.logMAR === null || (r.logMAR > 1e-9 && !r.limited);
}

export const REFER_FIRST_NOTE = REC_TEXT.referFirst.en;
export const AFTER_CHECK_NOTE = REC_TEXT.afterCheck.en;
export const NONE_WITH_OPTIONS_NOTE = REC_TEXT.noneWithOptions.en;
export const NO_INTERVIEW_NOTE = REC_TEXT.noInterview.en;
export const ASTIGMATISM_NOTE = (eyes: Eye[], lang: Lang = 'en') => fmt(REC_TEXT.astigmatism[lang], { eyes: eyesText(eyes, lang) });
export const myopiaManagementNote = (lang: Lang = 'en') => fmt(REC_TEXT.myopiaManagement[lang], { zeiss: ZEISS_FAMILY.myopiaManagement });
export const MYOPIA_MANAGEMENT_NOTE = myopiaManagementNote();
export const EYE_STRAIN_NOTE = REC_TEXT.eyeStrain.en;
export const HEADACHE_NOTE = REC_TEXT.headache.en;

const EYES: Eye[] = ['right', 'left'];

/** "the right eye", "the left eye", "both eyes". */
function eyesText(eyes: Eye[], lang: Lang): string {
  return (eyes.length === 2 ? EYES_TEXT.both : EYES_TEXT[eyes[0]])[lang];
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1);

const item = (kind: RecKind, option: LensOption, reasons: string[], lang: Lang): RecItem => ({
  kind, category: CATEGORY_TEXT[option][lang], zeissFamily: ZEISS_FAMILY[option], reasons,
});

function duochromeNotes(myopic: Eye[], hyperopic: Eye[], cm: number, lang: Lang): string[] {
  const notes: string[] = [];
  if (myopic.length) notes.push(fmt(REC_TEXT.duoRed[lang], { eyes: eyesText(myopic, lang) }));
  if (hyperopic.length) notes.push(fmt(REC_TEXT.duoGreen[lang], { eyes: eyesText(hyperopic, lang) }));
  if (notes.length) notes.push(fmt(REC_TEXT.duoNear[lang], { cm }));
  return notes;
}

function tendencyReason(myopic: Eye[], hyperopic: Eye[], lang: Lang): string | null {
  const parts: string[] = [];
  if (myopic.length) parts.push(fmt(REC_TEXT.myopicPart[lang], { eyes: eyesText(myopic, lang) }));
  if (hyperopic.length) parts.push(fmt(REC_TEXT.hyperopicPart[lang], { eyes: eyesText(hyperopic, lang) }));
  if (!parts.length) return null;
  return fmt(REC_TEXT.tendency[lang], { list: listText(parts, lang) });
}

/** One 'frame' item from the captured frame fit (lib/face.ts frameFit), reworded as reasons. */
function frameItem(fit: FitCapture, lang: Lang): RecItem {
  const { frame, shape, face } = fit;
  const [lo, hi] = frame.totalWidthMm;
  const shapeName = FACE_SHAPE_TEXT[shape.shape][lang].toLowerCase();
  return {
    kind: 'frame',
    category: fmt(REC_TEXT.frameCategory[lang], { size: cap(FRAME_SIZE_TEXT[frame.size][lang]), lo, hi }),
    zeissFamily: null,
    reasons: [
      fmt(REC_TEXT.frameWidth[lang], { w: Math.round(face.cheekWidthMm), lo, hi }),
      ...fitText(fit, lang).suggest.map((t) => fmt(REC_TEXT.frameShape[lang], { shape: shapeName, style: lowerFirst(t.style), reason: t.reason })),
    ],
  };
}

/**
 * Explainable lens, lens-option and frame suggestions. PROVISIONAL rules (see the top of this file).
 * `triage` is triage(session.safetyFlags, session.results, session.targetMm); only its level is used.
 * `interview` is session.interview (null when the questions were skipped). Never outputs lens powers.
 * `lang` changes the words only; the report stores the English ('en', the default).
 */
export function recommend(session: Session, triage: Triage, interview: Interview | null, lang: Lang = 'en'): Recommendation {
  const T = REC_TEXT;
  if (session.safetyFlags.length > 0) return { status: 'refer-first', items: [], notes: [T.referFirst[lang]] };

  const cm = Math.round(session.targetMm / 10);
  const results = session.results;
  const eyesWith = (pred: (r: EyeResult) => boolean) => EYES.filter((e) => pred(results[e]));
  const myopic = eyesWith((r) => duochromeTendency(r.duochrome) === 'myopic');
  const hyperopic = eyesWith((r) => duochromeTendency(r.duochrome) === 'hyperopic');
  const below = eyesWith(belowSixSix);
  const astig = eyesWith((r) => r.astigmatism?.present === true);
  const complaints = new Set(interview?.complaints ?? []);
  const over40 = interview?.ageBand === '40-59' || interview?.ageBand === '60+';
  const ageText = (interview?.ageBand === '60+' ? T.age60 : T.age40)[lang];
  const heavyScreens = interview?.screenHours === 'gt6';
  const tendency = tendencyReason(myopic, hyperopic, lang);
  const nearBelow = () => {
    const v = (e: Eye) => snellenOf(results[e].logMAR, lang);
    const where = below.length === 2
      ? fmt(T.whereBoth[lang], { right: v('right'), left: v('left') })
      : fmt(T.whereOne[lang], { eye: EYES_TEXT[below[0]][lang], snellen: v(below[0]) });
    return fmt(T.nearBelow[lang], { cm, where });
  };

  /* ---- Lens type ---- */
  const lenses: RecItem[] = [];
  const progressive = over40 && (complaints.has('small-print') || below.length > 0);
  if (progressive) {
    const why = [fmt(T.youAre[lang], { age: ageText })];
    if (complaints.has('small-print')) why.push(T.smallPrint[lang]);
    if (below.length) why.push(nearBelow());
    const reasons = [fmt(T.progressive[lang], { why: listText(why, lang) })];
    if (tendency) reasons.push(tendency);
    lenses.push(item('lens', 'progressive', reasons, lang));
  }
  if (over40 && heavyScreens) {
    const reasons = [fmt(T.office[lang], { age: ageText })];
    if (progressive) reasons.push(T.officeSecond[lang]);
    else if (tendency) reasons.push(tendency);
    lenses.push(item('lens', 'office', reasons, lang));
  }
  if (lenses.length === 0 && triage.level !== 'ok') {
    const reasons: string[] = [];
    if (below.length) reasons.push(fmt(T.svNear[lang], { near: nearBelow() }));
    if (astig.length) reasons.push(fmt(T.svAstig[lang], { eyes: eyesText(astig, lang) }));
    if (!reasons.length) reasons.push(T.svGeneric[lang]);
    if (tendency) reasons.push(tendency);
    lenses.push(item('lens', 'singleVision', reasons, lang));
  }

  /* ---- Lens options ---- */
  const options: RecItem[] = [];
  if (lenses.length) options.push(item('coating', 'antiReflective', [T.antiReflective[lang]], lang));
  if (interview) {
    const night: string[] = [];
    if (interview.nightDriving) night.push(T.nightDrive[lang]);
    if (complaints.has('glare')) night.push(T.glare[lang]);
    if (night.length) options.push(item('coating', 'nightDriving', [fmt(T.night[lang], { list: listText(night, lang) })], lang));
    const blue: string[] = [];
    if (heavyScreens) blue.push(T.screens6[lang]);
    if (complaints.has('eye-strain')) blue.push(T.strain[lang]);
    if (blue.length) options.push(item('coating', 'blueLight', [fmt(T.blue[lang], { list: listText(blue, lang) })], lang));
    if (interview.outdoors === 'lots') options.push(item('coating', 'photochromic', [T.photochromic[lang]], lang));
  }

  const items = [...lenses, ...options];
  if (session.fit?.status === 'captured') items.push(frameItem(session.fit, lang));

  const status: RecStatus = triage.level === 'refer' ? 'after-check' : lenses.length ? 'suggest' : 'none';

  /* ---- Notes ---- */
  const notes: string[] = [];
  if (status === 'after-check') notes.push(T.afterCheck[lang]);
  if (status === 'none' && options.length) notes.push(T.noneWithOptions[lang]);
  notes.push(...duochromeNotes(myopic, hyperopic, cm, lang));
  if (astig.length) notes.push(ASTIGMATISM_NOTE(astig, lang));
  if (interview?.ageBand === 'under18' && myopic.length) notes.push(myopiaManagementNote(lang));
  if (complaints.has('eye-strain')) notes.push(T.eyeStrain[lang]);
  if (complaints.has('headache')) notes.push(T.headache[lang]);
  if (!interview) notes.push(T.noInterview[lang]);

  return { status, items, notes };
}
