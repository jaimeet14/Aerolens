/*
 * Whole-app language: chosen first on the welcome screen (session.lang) and used on every patient screen.
 * The staff screens, the JSON export and the saved history stay English whatever the language.
 *
 * Every string is a Text, one entry per language, so adding a language (for example Odia, 'or') to Lang makes
 * `tsc` fail at every string that has no translation yet. Placeholders are written {name} and filled by fmt().
 * In a string, **bold** marks words the screen shows in bold (see richParts).
 *
 * Generated clinical sentences (triage, lens suggestions, face shape, dial and acuity text) keep their Text
 * tables next to the code that builds them (lib/triage.ts, lib/recommend.ts, ...); this file holds the
 * interface strings of the screens. Every Hindi string is listed for review in docs/hindi-review.md.
 */
import type { RecKind } from './recommend';
import type { Chart, Dir, Duochrome, Eye } from './types';

export type Lang = 'en' | 'hi';
export const LANGS: readonly Lang[] = ['en', 'hi'];
/** The language's own name, for the language buttons. */
export const LANG_NAME: Record<Lang, string> = { en: 'English', hi: 'हिन्दी' };

/** One string in every language. */
export type Text = Record<Lang, string>;

/** Fills each {name} with vars[name] (numbers as String(n)); a placeholder with no value is left as it is. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}

/** The text in `lang`, placeholders filled. */
export function tr(text: Text, lang: Lang, vars?: Record<string, string | number>): string {
  return vars ? fmt(text[lang], vars) : text[lang];
}

/** A template cut at its placeholders, so a screen can put an element in one: 'On {date}.' -> ['On ', { key: 'date' }, '.']. */
export function splitTemplate(template: string): (string | { key: string })[] {
  // split() with a capture group puts each placeholder name at the odd indexes.
  return template.split(/\{(\w+)\}/).map((s, i) => (i % 2 === 1 ? { key: s } : s)).filter((p) => p !== '');
}

/** One language's strings of a table: inLang({ a: { en: 'x', hi: 'y' } }, 'en') -> { a: 'x' }. */
export function inLang<K extends string>(table: Record<K, Text>, lang: Lang): Record<K, string> {
  return Object.fromEntries(Object.entries<Text>(table).map(([k, t]) => [k, t[lang]])) as Record<K, string>;
}

/** A string cut at its **bold** markers: 'Tap **Go**.' -> [{ text: 'Tap ', bold: false }, { text: 'Go', bold: true }, ...]. */
export function richParts(s: string): { text: string; bold: boolean }[] {
  return s.split('**').map((text, i) => ({ text, bold: i % 2 === 1 })).filter((p) => p.text !== '');
}

/** The word that joins the last two items of a list. */
export const AND: Text = { en: 'and', hi: 'और' };

/** "a", "a and b", "a, b and c" (English), "a और b", "a, b और c" (Hindi). */
export function listText(parts: string[], lang: Lang): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} ${AND[lang]} ${parts[parts.length - 1]}`;
}

/** Locale for dates (Intl); undefined = the browser's own, which English has always used. */
export const DATE_LOCALE: Record<Lang, string | undefined> = { en: undefined, hi: 'hi-IN' };

/* ---------------- Shared words ---------------- */

/** "Right eye" / "दाईं आँख": screen headers and the per-eye result cards. */
export const EYE: Record<Eye, Text> = {
  right: { en: 'Right eye', hi: 'दाईं आँख' },
  left: { en: 'Left eye', hi: 'बाईं आँख' },
};

/** Answer-key directions, for screen readers (English: the bare direction, as before). */
export const DIR_TEXT: Record<Dir, Text> = {
  up: { en: 'up', hi: 'ऊपर' },
  right: { en: 'right', hi: 'दाईं ओर' },
  down: { en: 'down', hi: 'नीचे' },
  left: { en: 'left', hi: 'बाईं ओर' },
};

/** Chart names on the patient results screen (the staff screen keeps lib/history CHART_TEXT). */
export const CHART_NAME: Record<Chart, Text> = {
  E: { en: 'Tumbling E', hi: 'E चार्ट' },
  letters: { en: 'Letters (Sloan)', hi: 'अंग्रेज़ी अक्षर (Sloan)' },
  C: { en: 'Landolt C', hi: 'छल्ला (Landolt C)' },
};

/** Red-green answers on the patient results screen. */
export const DUO_ANSWER: Record<Duochrome, Text> = {
  red: { en: 'Red clearer', hi: 'लाल में ज़्यादा साफ़' },
  green: { en: 'Green clearer', hi: 'हरे में ज़्यादा साफ़' },
  equal: { en: 'Same', hi: 'दोनों बराबर' },
};

/** Lens-suggestion item kinds on the patient results screen. */
export const KIND_NAME: Record<RecKind, Text> = {
  lens: { en: 'Lens', hi: 'लेंस' },
  coating: { en: 'Lens option', hi: 'लेंस का विकल्प' },
  frame: { en: 'Frame', hi: 'फ़्रेम' },
};

/* ---------------- Screens ---------------- */

export const WELCOME = {
  chooseLang: { en: 'Choose a language', hi: 'भाषा चुनें' },
  title: { en: "Let's check your vision", hi: 'आइए, आपकी नज़र जाँचें' },
  tagline: { en: 'Device-free eye check for the optical counter', hi: 'चश्मे की दुकान पर, बिना किसी मशीन के आँखों की जाँच' },
  intro: {
    en: 'A guided check on this phone. It uses the camera to measure how far your face is from the screen, then shows eye-chart tests at the correct physical size.',
    hi: 'इस फ़ोन पर कदम-दर-कदम जाँच। कैमरा नापता है कि आपका चेहरा स्क्रीन से कितनी दूर है, फिर आँखों के चार्ट सही आकार में दिखाता है।',
  },
  minutes: { en: 'Takes a few minutes, one eye at a time', hi: 'कुछ मिनट लगते हैं, एक बार में एक आँख' },
  card: {
    en: 'You need an ID-size card (Aadhaar, PAN, licence or debit card)',
    hi: 'पहचान पत्र जितना बड़ा एक कार्ड चाहिए (आधार, पैन, लाइसेंस या डेबिट कार्ड)',
  },
  brightness: { en: 'Turn the screen brightness up', hi: 'स्क्रीन की रोशनी (ब्राइटनेस) पूरी कर दें' },
  disclaimer: {
    en: 'This is a screening aid. It is not a prescription and does not replace an eye examination.',
    hi: 'यह सिर्फ़ एक शुरुआती जाँच है। यह चश्मे का नंबर (पर्चा) नहीं है और आँखों की पूरी जाँच की जगह नहीं लेती।',
  },
  start: { en: 'Start', hi: 'शुरू करें' },
  demo: { en: 'Demo mode: camera disabled, distance fixed at 50 cm.', hi: 'डेमो मोड: कैमरा बंद है, दूरी 50 cm पर तय है।' },
  recent: { en: 'Recent sessions (staff)', hi: 'पिछली जाँचें (स्टाफ़ के लिए)' },
  offlineDownloading: { en: 'Downloading for offline use…', hi: 'ऑफ़लाइन उपयोग के लिए डाउनलोड हो रहा है…' },
  offlineReady: { en: '✓ Ready offline', hi: '✓ ऑफ़लाइन तैयार' },
  offlineUpdating: { en: 'Updating…', hi: 'अपडेट हो रहा है…' },
  offlineUpdateReady: { en: 'Update ready — reload to use it', hi: 'अपडेट तैयार है — इस्तेमाल के लिए रीलोड करें' },
  reloadNow: { en: 'Reload now', hi: 'अभी रीलोड करें' },
  version: { en: 'Version: {time}', hi: 'संस्करण: {time}' },
} satisfies Record<string, Text>;

export const SAFETY = {
  title: { en: 'Before we begin', hi: 'शुरू करने से पहले' },
  ask: { en: 'Do any of these apply to you right now?', hi: 'क्या अभी आपको इनमें से कोई परेशानी है?' },
  usualQ: { en: 'Do you usually wear glasses or contact lenses?', hi: 'क्या आप आमतौर पर चश्मा या कॉन्टैक्ट लेंस पहनते हैं?' },
  wearNone: { en: 'No', hi: 'नहीं' },
  wearGlasses: { en: 'Glasses', hi: 'चश्मा' },
  wearContacts: { en: 'Contact lenses', hi: 'कॉन्टैक्ट लेंस' },
  glassesOff: {
    en: 'Please take your glasses off now. This test checks your eyes without them.',
    hi: 'कृपया अभी अपना चश्मा उतार दें। यह जाँच बिना चश्मे के आपकी आँखें देखती है।',
  },
  contactsQ: { en: 'Can you take your contact lenses out for this test?', hi: 'क्या आप इस जाँच के लिए कॉन्टैक्ट लेंस निकाल सकते हैं?' },
  contactsNote: {
    en: 'The test checks your eyes without them. If you keep them in, it shows how well you see with them.',
    hi: 'यह जाँच बिना लेंस के आँखें देखती है। अगर लेंस लगे रहते हैं, तो पता चलेगा कि लेंस के साथ आप कितना अच्छा देखते हैं।',
  },
  lensesOut: { en: "I've taken them out", hi: 'लेंस निकाल दिए हैं' },
  lensesIn: { en: "I'm keeping them in", hi: 'लेंस लगे रहेंगे' },
  chooseOne: { en: 'Choose one option to continue.', hi: 'आगे बढ़ने के लिए एक विकल्प चुनें।' },
  continue: { en: 'Continue', hi: 'आगे बढ़ें' },
  noneApply: { en: 'None of these apply', hi: 'इनमें से कुछ नहीं' },
} satisfies Record<string, Text>;

export const REFERRAL = {
  title: { en: 'Please see an eye doctor first', hi: 'पहले आँखों के डॉक्टर को दिखाएँ' },
  told: { en: 'You told us about:', hi: 'आपने बताया:' },
  body: {
    en: 'These can need prompt medical attention. We have stopped the test. Choosing lenses is not the right next step.',
    hi: 'इनके लिए जल्दी डॉक्टर को दिखाना ज़रूरी हो सकता है। हमने जाँच रोक दी है। अभी लेंस चुनना सही कदम नहीं है।',
  },
  restart: { en: 'Start over', hi: 'फिर से शुरू करें' },
} satisfies Record<string, Text>;

export const SCALE = {
  title: { en: 'Match your card', hi: 'अपने कार्ड से मिलाएँ' },
  step1: {
    en: 'Take any ID-size card: Aadhaar, PAN, driving licence, or a debit/credit card.',
    hi: 'पहचान पत्र जितना बड़ा कोई भी कार्ड लें: आधार, पैन, ड्राइविंग लाइसेंस, या डेबिट/क्रेडिट कार्ड।',
  },
  step2: {
    en: 'Lay it flat against the screen, with its **short edge** across the box.',
    hi: 'कार्ड को स्क्रीन पर सपाट रखें, ताकि उसका **छोटा किनारा** बॉक्स के आर-पार रहे।',
  },
  step3: {
    en: "Drag the slider until the box's outer edges line up exactly with the card's edges.",
    hi: 'स्लाइडर को तब तक खिसकाएँ, जब तक बॉक्स के बाहरी किनारे कार्ड के किनारों से ठीक न मिल जाएँ।',
  },
  step4: { en: 'Tap **The box matches my card**.', hi: '**बॉक्स मेरे कार्ड से मिल गया** दबाएँ।' },
  slider: { en: 'Box width', hi: 'बॉक्स की चौड़ाई' },
  done: { en: 'The box matches my card', hi: 'बॉक्स मेरे कार्ड से मिल गया' },
  why: { en: 'Why is this needed?', hi: 'यह क्यों ज़रूरी है?' },
  why1: {
    en: "Every phone's screen is a different size, with different-sized pixels, so the app can't tell how big a letter really looks on this screen.",
    hi: 'हर फ़ोन की स्क्रीन और उसके पिक्सेल अलग आकार के होते हैं, इसलिए ऐप खुद नहीं जान सकता कि इस स्क्रीन पर अक्षर असल में कितना बड़ा दिखता है।',
  },
  why2: {
    en: 'An eye chart only works if each letter is an exact physical size: a 6/6 letter seen from 50 cm is under 1 mm tall.',
    hi: 'आँखों का चार्ट तभी सही काम करता है, जब हर अक्षर ठीक सही आकार का हो: 50 cm से देखा जाने वाला 6/6 अक्षर 1 mm से भी छोटा होता है।',
  },
  why3: {
    en: "All ID cards are the same standard size (85.6 × {mm} mm), so matching the box to the card's short edge tells the app how many pixels make a millimetre.",
    hi: 'सभी पहचान पत्र एक ही तय आकार (85.6 × {mm} mm) के होते हैं, इसलिए बॉक्स को कार्ड के छोटे किनारे से मिलाने पर ऐप को पता चलता है कि एक मिलीमीटर में कितने पिक्सेल हैं।',
  },
  why4: { en: "You do this once per phone; it's remembered.", hi: 'यह हर फ़ोन पर एक ही बार करना होता है; फ़ोन इसे याद रखता है।' },
  why5: {
    en: "If the box doesn't match, the letters are the wrong size and the result will be wrong.",
    hi: 'अगर बॉक्स नहीं मिला, तो अक्षर गलत आकार के होंगे और नतीजा भी गलत आएगा।',
  },
} satisfies Record<string, Text>;

export const CAMERA = {
  title: { en: 'Distance check', hi: 'दूरी की जाँच' },
  intro: {
    en: 'The camera measures your iris (about 11.7 mm wide) as a ruler. Hold the phone at about {cm} cm, at eye level.',
    hi: 'कैमरा आपकी आँख के रंगीन हिस्से (आइरिस, लगभग 11.7 mm चौड़ा) को पैमाने की तरह इस्तेमाल करता है। फ़ोन को लगभग {cm} cm दूर, आँखों की ऊँचाई पर पकड़ें।',
  },
  demoCamera: { en: 'camera off (demo)', hi: 'कैमरा बंद (डेमो)' },
  starting: { en: 'Starting camera and face tracking…', hi: 'कैमरा और चेहरे की पहचान शुरू हो रही है…' },
  denied: {
    en: 'Camera permission was denied. Allow camera access and reload.',
    hi: 'कैमरे की अनुमति नहीं मिली। कैमरे की अनुमति दें और पेज दोबारा खोलें।',
  },
  failed: { en: '{error}', hi: 'कैमरा शुरू नहीं हो सका। ({error})' },
  looking: { en: 'Looking for your face…', hi: 'आपका चेहरा ढूँढ रहे हैं…' },
  screenSaved: { en: 'Screen calibrated on {date}.', hi: '{date} को स्क्रीन सेट की गई थी।' },
  recalScreen: { en: 'Recalibrate screen', hi: 'स्क्रीन फिर से सेट करें' },
  limit: {
    en: 'This screen can only show letters down to {snellen} at {cm} cm, so results will stop there. For a full test, use a phone.',
    hi: 'यह स्क्रीन {cm} cm पर सिर्फ़ {snellen} तक के अक्षर दिखा सकती है, इसलिए नतीजा वहीं रुक जाएगा। पूरी जाँच के लिए फ़ोन इस्तेमाल करें।',
  },
  tooCoarse: {
    en: 'This screen is too coarse to show the test letters at {cm} cm. For a full test, use a phone.',
    hi: 'यह स्क्रीन {cm} cm पर जाँच के अक्षर ठीक से नहीं दिखा सकती। पूरी जाँच के लिए फ़ोन इस्तेमाल करें।',
  },
  start: { en: 'Start the eye tests', hi: 'आँखों की जाँच शुरू करें' },
} satisfies Record<string, Text>;

export const CALIBRATION = {
  demo: { en: 'Demo mode: no camera, so camera calibration is skipped.', hi: 'डेमो मोड: कैमरा नहीं है, इसलिए कैमरा सेट करने का कदम छोड़ दिया गया है।' },
  calibrated: { en: 'Camera calibrated', hi: 'कैमरा सेट है' },
  recalibrate: { en: 'Recalibrate camera', hi: 'कैमरा फिर से सेट करें' },
  badDistance: {
    en: 'Enter the distance you measured, in cm ({min} to {max}).',
    hi: 'आपने जो दूरी नापी, वह cm में लिखें ({min} से {max})।',
  },
  noFace: { en: 'No face found. Look at the screen and try again.', hi: 'चेहरा नहीं दिखा। स्क्रीन की ओर देखें और फिर से कोशिश करें।' },
  saved: { en: 'Saved on this phone, so this step is not needed again here.', hi: 'इस फ़ोन में सेव हो गया, अब यहाँ यह कदम दोबारा नहीं करना होगा।' },
  notSaved: {
    en: 'Applied for this test, but this browser could not save it: calibrate again next time.',
    hi: 'इस जाँच के लिए लागू हो गया, पर यह ब्राउज़र इसे सेव नहीं कर सका: अगली बार फिर से सेट करें।',
  },
  titleEdit: { en: 'Recalibrate the camera', hi: 'कैमरा फिर से सेट करें' },
  titleFirst: { en: 'Calibrate the camera (once per phone)', hi: 'कैमरा सेट करें (हर फ़ोन पर एक बार)' },
  why: {
    en: 'Phone cameras differ, so the distance reading must be set once with a tape measure before the first test on this phone.',
    hi: 'हर फ़ोन का कैमरा अलग होता है, इसलिए इस फ़ोन पर पहली जाँच से पहले एक बार नापने वाले फ़ीते से दूरी सेट करनी होगी।',
  },
  step1: {
    en: 'Hold the phone so your eyes are exactly {cm} cm from the screen, measured with a tape or ruler. A helper can hold the tape.',
    hi: 'फ़ोन ऐसे पकड़ें कि आपकी आँखें स्क्रीन से ठीक {cm} cm दूर हों, फ़ीते या स्केल से नापकर। कोई दूसरा व्यक्ति फ़ीता पकड़ सकता है।',
  },
  step2: { en: 'Keep still and look at the screen.', hi: 'हिलें नहीं और स्क्रीन की ओर देखें।' },
  step3: { en: 'Enter the distance you measured and tap **Calibrate**.', hi: 'नापी हुई दूरी लिखें और **सेट करें** दबाएँ।' },
  input: { en: 'Measured distance in centimetres', hi: 'नापी हुई दूरी, सेंटीमीटर में' },
  button: { en: 'Calibrate', hi: 'सेट करें' },
  needFace: { en: 'The camera needs to see your face before you can calibrate.', hi: 'सेट करने से पहले कैमरे को आपका चेहरा दिखना चाहिए।' },
  keep: { en: 'Keep the current calibration', hi: 'पहले वाली सेटिंग ही रखें' },
} satisfies Record<string, Text>;

export const ZOOM = {
  changed: {
    en: 'The page zoom changed, so the test sizes are no longer correct.',
    hi: 'पेज का ज़ूम बदल गया है, इसलिए जाँच के अक्षरों का आकार अब सही नहीं है।',
  },
  recalibrate: { en: 'Recalibrate', hi: 'फिर से सेट करें' },
} satisfies Record<string, Text>;

export const PROGRESS = {
  setup: { en: 'Setup', hi: 'तैयारी' },
  calibrate: { en: 'Calibrate', hi: 'सेटिंग' },
  right: { en: 'Right eye', hi: 'दाईं आँख' },
  left: { en: 'Left eye', hi: 'बाईं आँख' },
  fit: { en: 'Frame fit', hi: 'फ़्रेम का नाप' },
  results: { en: 'Results', hi: 'नतीजे' },
  aria: { en: 'Progress: {label}, {done} of {total} sections done', hi: 'प्रगति: {label}, {total} में से {done} हिस्से पूरे' },
} satisfies Record<string, Text>;

export const COVER = {
  testingRight: { en: 'Testing the right eye', hi: 'दाईं आँख की जाँच' },
  testingLeft: { en: 'Testing the left eye', hi: 'बाईं आँख की जाँच' },
  coverLeft: { en: 'Cover your LEFT eye', hi: 'अपनी बाईं आँख ढकें' },
  coverRight: { en: 'Cover your RIGHT eye', hi: 'अपनी दाईं आँख ढकें' },
  howRight: {
    en: 'Use your palm, without pressing on the eye. Keep the right eye open, and keep your glasses off.',
    hi: 'हथेली से ढकें, आँख को दबाएँ नहीं। दाईं आँख खुली रखें और चश्मा न पहनें।',
  },
  howLeft: {
    en: 'Use your palm, without pressing on the eye. Keep the left eye open, and keep your glasses off.',
    hi: 'हथेली से ढकें, आँख को दबाएँ नहीं। बाईं आँख खुली रखें और चश्मा न पहनें।',
  },
  letters: { en: 'I can read English letters', hi: 'मुझे अंग्रेज़ी अक्षर पढ़ने आते हैं' },
  e: { en: 'Show me the E', hi: 'मुझे E दिखाएँ' },
  ring: { en: 'Show me the ring (Landolt C)', hi: 'मुझे छल्ला (Landolt C) दिखाएँ' },
  eHelp: {
    en: "Choose the E if you don't read English letters: you only show which way it points.",
    hi: 'अगर आप अंग्रेज़ी अक्षर नहीं पढ़ते, तो E चुनें: बस बताना है कि वह किस ओर खुला है।',
  },
  ringHelp: {
    en: 'The ring works the same way: you only show which side its gap is on.',
    hi: 'छल्ला भी ऐसे ही काम करता है: बस बताना है कि उसका खुला हिस्सा किस ओर है।',
  },
  ready: { en: 'Ready', hi: 'तैयार हूँ' },
} satisfies Record<string, Text>;

export const ACUITY = {
  tooCoarse: {
    en: 'This screen is too coarse to draw the test letters at this distance. Please use a phone with a sharper display.',
    hi: 'यह स्क्रीन इस दूरी पर जाँच के अक्षर ठीक से नहीं बना सकती। कृपया ज़्यादा साफ़ स्क्रीन वाला फ़ोन इस्तेमाल करें।',
  },
  askLetter: { en: 'which letter is this?', hi: 'यह कौन-सा अक्षर है?' },
  askRing: { en: 'which side is the gap on?', hi: 'छल्ला किस ओर से खुला है?' },
  askE: { en: 'which way does the E open?', hi: 'E किस ओर खुला है?' },
  cantSeeBlurry: { en: "Can't see / blurry", hi: 'नहीं दिख रहा / धुंधला है' },
  cantSee: { en: "Can't see", hi: 'नहीं दिखा' },
  gapKey: { en: 'Gap {dir}', hi: 'खुला हिस्सा {dir}' },
  ringLabel: { en: 'Ring with the gap {dir}', hi: 'छल्ला, खुला हिस्सा {dir}' },
  eLabel: { en: 'E opening {dir}', hi: 'E, खुला हिस्सा {dir}' },
} satisfies Record<string, Text>;

export const DIAL = {
  header: { en: 'line dial', hi: 'लाइनों वाला गोला' },
  svg: { en: 'Astigmatism line dial', hi: 'एस्टिग्मैटिज़्म जाँच का लाइनों वाला गोला' },
  numberKey: { en: 'Line {line}, number {hour}', hi: 'लाइन {line}, अंक {hour}' },
  allSix: {
    en: "If every line looks equally dark, go back and choose 'All look the same'.",
    hi: "अगर सभी लाइनें एक जैसी गहरी दिखती हैं, तो पीछे जाकर 'सब एक जैसी हैं' चुनें।",
  },
  noneYet: { en: 'Tap the darker line(s) first.', hi: 'पहले गहरी दिखने वाली लाइन (या लाइनें) दबाएँ।' },
  ask: { en: 'Do some of the lines look darker or sharper than the others?', hi: 'क्या कुछ लाइनें बाकी लाइनों से ज़्यादा गहरी या साफ़ दिखती हैं?' },
  same: { en: 'All look the same', hi: 'सब एक जैसी हैं' },
  darker: { en: 'Some are darker', hi: 'कुछ ज़्यादा गहरी हैं' },
  unsure: { en: 'Not sure', hi: 'पक्का नहीं पता' },
  pick: {
    en: 'Tap each darker line, or the number at either end of it. Tap again to undo.',
    hi: 'हर गहरी लाइन को, या उसके किसी भी सिरे का अंक दबाएँ। हटाने के लिए फिर से दबाएँ।',
  },
  selected: { en: 'Selected:', hi: 'चुनी गईं:' },
  none: { en: 'none', hi: 'कोई नहीं' },
  back: { en: 'Back', hi: 'पीछे' },
  done: { en: 'Done', hi: 'हो गया' },
} satisfies Record<string, Text>;

export const DUO = {
  header: { en: 'red-green test ({size} size)', hi: 'लाल-हरा टेस्ट ({size} आकार)' },
  ask: { en: 'Which side are the letters clearer and blacker?', hi: 'किस तरफ़ अक्षर ज़्यादा साफ़ और काले दिखते हैं?' },
  red: { en: 'Red', hi: 'लाल' },
  same: { en: 'Same', hi: 'बराबर' },
  green: { en: 'Green', hi: 'हरा' },
} satisfies Record<string, Text>;

export const GUARD = {
  badge: { en: '{distance} · target {cm} cm', hi: '{distance} · सही दूरी {cm} cm' },
  noFace: { en: 'no face', hi: 'चेहरा नहीं दिखा' },
  notFound: { en: 'Face not found', hi: 'चेहरा नहीं दिखा' },
  closer: { en: 'Move closer', hi: 'थोड़ा पास आएँ' },
  back: { en: 'Move back a little', hi: 'थोड़ा पीछे हटें' },
  look: { en: 'Look at the screen so the camera can see your face.', hi: 'स्क्रीन की ओर देखें, ताकि कैमरा आपका चेहरा देख सके।' },
  hold: {
    en: 'Hold the screen about {cm} cm from your face. The chart returns when you are in range.',
    hi: 'स्क्रीन को चेहरे से लगभग {cm} cm दूर रखें। सही दूरी पर आते ही चार्ट फिर दिखेगा।',
  },
} satisfies Record<string, Text>;

export const FIT = {
  header: { en: 'Frame fit · PD and face shape', hi: 'फ़्रेम का नाप · PD और चेहरे का आकार' },
  title: { en: 'Measure for frames', hi: 'फ़्रेम के लिए नाप' },
  intro: {
    en: 'The camera measures the distance between your pupils (PD) and the shape of your face, to suggest frame sizes and styles.',
    hi: 'कैमरा आपकी दोनों पुतलियों के बीच की दूरी (PD) और चेहरे का आकार नापता है, ताकि फ़्रेम का साइज़ और स्टाइल सुझाया जा सके।',
  },
  step1: { en: 'Take your glasses off.', hi: 'चश्मा उतार दें।' },
  step2: { en: 'Look straight at the screen, with both eyes open.', hi: 'दोनों आँखें खुली रखकर सीधे स्क्रीन की ओर देखें।' },
  step3: { en: 'Keep your head level and still until it finishes.', hi: 'पूरा होने तक सिर सीधा और स्थिर रखें।' },
  demoCamera: { en: 'camera off (demo)', hi: 'कैमरा बंद (डेमो)' },
  measuring: { en: 'Measuring', hi: 'नाप रहे हैं' },
  holdStill: { en: 'Hold still…', hi: 'हिलें नहीं…' },
  retake: { en: 'Retake', hi: 'फिर से नापें' },
  measure: { en: 'Measure', hi: 'नापें' },
  seeResults: { en: 'See results', hi: 'नतीजे देखें' },
  skip: { en: 'Skip this step', hi: 'यह कदम छोड़ें' },
} satisfies Record<string, Text>;

export const FIT_SUMMARY = {
  title: { en: 'Frame fit', hi: 'फ़्रेम का नाप' },
  pdDistance: { en: 'PD, distance', hi: 'PD, दूर के लिए' },
  pdSides: { en: '(R {right} / L {left})', hi: '(दायाँ {right} / बायाँ {left})' },
  pdAt: { en: 'PD at {cm} cm', hi: '{cm} cm पर PD' },
  asMeasured: { en: '{mm} mm, as measured', hi: '{mm} mm, जैसा नापा गया' },
  shape: { en: 'Face shape', hi: 'चेहरे का आकार' },
  frameWidth: { en: 'Frame width', hi: 'फ़्रेम की चौड़ाई' },
  lensWidth: { en: 'Lens width', hi: 'लेंस की चौड़ाई' },
  bridge: { en: 'Bridge', hi: 'ब्रिज (नाक पर)' },
  pdNote: {
    en: 'The distance PD is estimated from the PD measured at {cm} cm, where the eyes turn in slightly to look at the screen.',
    hi: 'दूर के लिए PD का अंदाज़ा {cm} cm पर नापी गई PD से लगाया गया है, जहाँ स्क्रीन देखते समय आँखें थोड़ा अंदर की ओर मुड़ती हैं।',
  },
  why: { en: 'Why {shape}', hi: 'चेहरा {shape} क्यों माना गया' },
  close: { en: 'Close to: {shapes}.', hi: 'इसके करीब: {shapes}।' },
  tryStyles: { en: 'Styles to try', hi: 'आज़माने लायक स्टाइल' },
  avoidStyles: { en: 'Usually less flattering', hi: 'आमतौर पर कम जँचते हैं' },
  how: { en: 'How the sizes were chosen', hi: 'साइज़ कैसे चुने गए' },
  disclaimer: {
    en: 'Suggestions for choosing frames, not a prescription. The optician should confirm the PD before lenses are made.',
    hi: 'ये फ़्रेम चुनने के सुझाव हैं, चश्मे का नंबर नहीं। लेंस बनने से पहले दुकान वाले PD दोबारा जाँच लें।',
  },
} satisfies Record<string, Text>;

export const RESULTS = {
  alsoNoted: { en: 'Also noted', hi: 'यह भी देखा गया' },
  lensTitle: { en: 'Lens suggestions', hi: 'लेंस के सुझाव' },
  lensDisclaimer: {
    en: "Screening aid, not a prescription. Lens powers come only from an optometrist's eye test.",
    hi: 'यह शुरुआती जाँच है, चश्मे का नंबर नहीं। लेंस का नंबर सिर्फ़ ऑप्टोमेट्रिस्ट की आँखों की जाँच से तय होता है।',
  },
  chart: { en: 'Chart: {chart}', hi: 'चार्ट: {chart}' },
  notRecorded: { en: 'not recorded', hi: 'दर्ज नहीं' },
  near: { en: 'Near vision ({cm} cm)', hi: 'पास की नज़र ({cm} cm)' },
  dial: { en: 'Line dial', hi: 'लाइनों वाला गोला' },
  redGreen: { en: 'Red-green', hi: 'लाल-हरा टेस्ट' },
  limited: {
    en: "Your screen can't draw smaller letters, so this is the best this phone can measure.",
    hi: 'आपकी स्क्रीन इससे छोटे अक्षर नहीं बना सकती, इसलिए यह फ़ोन इससे बेहतर नहीं नाप सकता।',
  },
  nearNote: {
    en: 'Near vision at {cm} cm can differ from distance vision. This is a screening aid, not a prescription.',
    hi: '{cm} cm पर पास की नज़र, दूर की नज़र से अलग हो सकती है। यह शुरुआती जाँच है, चश्मे का नंबर नहीं।',
  },
  fitSkipped: { en: 'Frame fit (PD and face shape): skipped.', hi: 'फ़्रेम का नाप (PD और चेहरे का आकार): छोड़ दिया गया।' },
  demo: { en: 'Demo mode: the camera was off, so these are not real measurements.', hi: 'डेमो मोड: कैमरा बंद था, इसलिए ये असली नाप नहीं हैं।' },
  provisional: {
    en: 'Screening aid only; not a prescription. Thresholds are provisional until reviewed with an optometrist.',
    hi: 'सिर्फ़ शुरुआती जाँच; चश्मे का नंबर नहीं। नतीजे तय करने के नियम तब तक अस्थायी हैं, जब तक ऑप्टोमेट्रिस्ट इन्हें जाँच न लें।',
  },
  copy: { en: 'Copy result JSON', hi: 'नतीजा कॉपी करें (JSON)' },
  copied: { en: 'Copied', hi: 'कॉपी हो गया' },
  newTest: { en: 'New test', hi: 'नई जाँच' },
  staff: { en: 'Staff view', hi: 'स्टाफ़ के लिए सारांश' },
  notSaved: {
    en: 'Not saved to recent sessions: storage on this phone is unavailable or full.',
    hi: 'पिछली जाँचों में सेव नहीं हुआ: इस फ़ोन की स्टोरेज उपलब्ध नहीं है या भर गई है।',
  },
  copyFailed: { en: "Couldn't copy automatically. Select the text below.", hi: 'अपने-आप कॉपी नहीं हो सका। नीचे का टेक्स्ट चुनकर कॉपी करें।' },
  showData: { en: 'Show result data', hi: 'नतीजे का डेटा दिखाएँ' },
} satisfies Record<string, Text>;

/** Every screen table, by screen, in the order the screens appear (tests and docs/hindi-review.md walk this). */
export const SCREENS = {
  welcome: WELCOME, safety: SAFETY, referral: REFERRAL, scale: SCALE, camera: CAMERA, calibration: CALIBRATION, zoom: ZOOM,
  progress: PROGRESS, cover: COVER, acuity: ACUITY, dial: DIAL, duochrome: DUO, distance: GUARD, fit: FIT, fitSummary: FIT_SUMMARY,
  results: RESULTS, eye: EYE, direction: DIR_TEXT, chart: CHART_NAME, duoAnswer: DUO_ANSWER, kind: KIND_NAME,
} satisfies Record<string, Record<string, Text>>;
