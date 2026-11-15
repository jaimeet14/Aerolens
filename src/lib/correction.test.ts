import { describe, expect, it } from 'vitest';
import { testedWithFrom, testedWithText, usualWearText } from './correction';

describe('testedWithFrom', () => {
  it('is null until the usual-wear question is answered', () => {
    expect(testedWithFrom(null, null)).toBeNull();
    expect(testedWithFrom(null, 'in')).toBeNull();
  });
  it('tests without glasses for people who wear nothing or glasses', () => {
    expect(testedWithFrom('none', null)).toBe('none');
    expect(testedWithFrom('glasses', null)).toBe('none');
  });
  it('ignores a stale contact lens answer once the usual wear is not contacts', () => {
    expect(testedWithFrom('glasses', 'in')).toBe('none');
    expect(testedWithFrom('none', 'in')).toBe('none');
  });
  it('needs the follow-up answer for contact lens wearers', () => {
    expect(testedWithFrom('contacts', null)).toBeNull();
    expect(testedWithFrom('contacts', 'out')).toBe('none');
    expect(testedWithFrom('contacts', 'in')).toBe('contacts');
  });
});

describe('result labels', () => {
  it('says what the test was done with', () => {
    expect(testedWithText('none')).toBe('Tested without glasses');
    expect(testedWithText('contacts')).toBe('Tested with contact lenses');
    expect(testedWithText(null)).toBe('Tested with: not recorded');
  });
  it('says what the person usually wears', () => {
    expect(usualWearText('none')).toBe('Usually wears: nothing');
    expect(usualWearText('glasses')).toBe('Usually wears: glasses');
    expect(usualWearText('contacts')).toBe('Usually wears: contact lenses');
    expect(usualWearText(null)).toBe('Usually wears: not recorded');
  });
});
