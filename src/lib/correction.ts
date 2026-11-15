import { fmt, type Lang, type Text } from './i18n';
import type { Correction, TestedWith } from './types';

/** A contact lens wearer's answer on the safety screen: lenses taken out for the test, or kept in. */
export type ContactLenses = 'out' | 'in';

/**
 * What the eyes are tested with, from the safety answers. The test is always done without glasses;
 * a contact lens wearer either takes them out or keeps them in.
 * null = not answered yet: no usual-wear answer, or a contact lens wearer who has not said whether they are out.
 */
export function testedWithFrom(usual: Correction | null, lenses: ContactLenses | null): TestedWith | null {
  if (usual === null) return null;
  if (usual !== 'contacts') return 'none';
  if (lenses === null) return null;
  return lenses === 'in' ? 'contacts' : 'none';
}

/** Results-screen words (the staff screen uses the English ones). */
export const CORRECTION_TEXT = {
  withContacts: { en: 'Tested with contact lenses', hi: 'कॉन्टैक्ट लेंस लगाकर जाँच हुई' },
  withoutGlasses: { en: 'Tested without glasses', hi: 'बिना चश्मे के जाँच हुई' },
  withUnknown: { en: 'Tested with: not recorded', hi: 'किसके साथ जाँच हुई: दर्ज नहीं' },
  usually: { en: 'Usually wears: {what}', hi: 'आमतौर पर पहनते हैं: {what}' },
  notRecorded: { en: 'not recorded', hi: 'दर्ज नहीं' },
} satisfies Record<string, Text>;

/** Results screen: what the test was done with. */
export function testedWithText(t: TestedWith | null, lang: Lang = 'en'): string {
  if (t === 'contacts') return CORRECTION_TEXT.withContacts[lang];
  if (t === 'none') return CORRECTION_TEXT.withoutGlasses[lang];
  return CORRECTION_TEXT.withUnknown[lang];
}

export const USUAL_TEXT: Record<Correction, Text> = {
  none: { en: 'nothing', hi: 'कुछ नहीं' },
  glasses: { en: 'glasses', hi: 'चश्मा' },
  contacts: { en: 'contact lenses', hi: 'कॉन्टैक्ट लेंस' },
};

/** Results screen: the usual-wear history answer. */
export function usualWearText(c: Correction | null, lang: Lang = 'en'): string {
  return fmt(CORRECTION_TEXT.usually[lang], { what: c ? USUAL_TEXT[c][lang] : CORRECTION_TEXT.notRecorded[lang] });
}
