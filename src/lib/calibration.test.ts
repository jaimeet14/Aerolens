import { describe, expect, it } from 'vitest';
import { parseCalibrationDistanceMm, parseSavedFocalPx, startBlocker, type CameraGate } from './calibration';

describe('parseSavedFocalPx', () => {
  it('reads a saved focal length', () => {
    expect(parseSavedFocalPx('956.9')).toBe(956.9);
  });
  it('treats missing, empty, junk, zero and negative values as not calibrated', () => {
    for (const raw of [null, '', '  ', 'abc', 'NaN', 'Infinity', '0', '-800']) expect(parseSavedFocalPx(raw)).toBeNull();
  });
});

describe('parseCalibrationDistanceMm', () => {
  it('converts cm to mm', () => {
    expect(parseCalibrationDistanceMm('50')).toBe(500);
    expect(parseCalibrationDistanceMm(' 47.5 ')).toBe(475);
    expect(parseCalibrationDistanceMm('47,5')).toBe(475);
  });
  it('accepts the ends of the range', () => {
    expect(parseCalibrationDistanceMm('25')).toBe(250);
    expect(parseCalibrationDistanceMm('100')).toBe(1000);
  });
  it('rejects empty, non-numbers and out-of-range distances', () => {
    for (const t of ['', 'abc', '50cm', '-50', '5', '24.9', '100.1', '500', '1e2']) expect(parseCalibrationDistanceMm(t)).toBeNull();
  });
});

describe('startBlocker', () => {
  const ok: CameraGate = { demo: false, status: 'ready', faceFound: true, calibrated: true };
  it('allows the tests once the camera is calibrated and sees a face', () => {
    expect(startBlocker(ok)).toBeNull();
  });
  it('requires the one-time calibration', () => {
    expect(startBlocker({ ...ok, calibrated: false })).toMatch(/Calibrate the camera first/);
    expect(startBlocker({ ...ok, calibrated: false, faceFound: false })).toMatch(/Calibrate the camera first/);
  });
  it('demo mode is exempt from calibration', () => {
    expect(startBlocker({ ...ok, demo: true, calibrated: false })).toBeNull();
  });
  it('explains camera problems, loading and a missing face', () => {
    expect(startBlocker({ ...ok, status: 'error' })).toMatch(/camera is needed/);
    expect(startBlocker({ ...ok, status: 'loading' })).toMatch(/Waiting for the camera to start/);
    expect(startBlocker({ ...ok, status: 'idle' })).toMatch(/Waiting for the camera to start/);
    expect(startBlocker({ ...ok, faceFound: false })).toMatch(/see your face/);
  });
});
