import { describe, expect, it } from 'vitest';
import {
  checkFrame, classifyFaceShape, DEMO_FACE, demoFaceSample, distancePdFromNear, eyeOpenness, FIT_FRAMES, frameFit,
  frameIssueText, frameMm, irisSymmetric, LM, measureFit, MIN_FIT_FRAMES, mmText, PD_RANGE_MM, PUPIL_TO_ROTATION_MM,
  rollDeg, SHAPE_THRESHOLDS, STYLE_TIPS, type FaceMeasurements, type FaceSample, type FaceShape, type PointPx,
} from './face';
import { IRIS_MM } from './optics';

/* A synthetic face, projected with an ideal pinhole camera (independent of the module's demo face). */
const W = 1280, H = 720;
interface Spec {
  D: number; // camera to iris plane, mm
  f: number; // focal length, px
  pd: number; // PD on the iris plane, mm (the converged, measured PD)
  rightShare: number; // nose bridge position along the eye line, from the right iris
  cheek: number; jaw: number; forehead: number; length: number; // face sizes, mm
  offset: [number, number]; // face centre from the camera axis, mm
  depth: { bridge: number; cheeks: number; jaw: number; forehead: number; top: number; chin: number }; // mm behind the iris plane
  roll: number; // head tilt, degrees
  lidGap: number; // eyelid opening, mm (eye width is 28 mm)
  irisScale: [number, number]; // right, left iris width factors
  mirror: boolean; // selfie-mirrored image
}
type Over = Partial<Omit<Spec, 'depth'>> & { depth?: Partial<Spec['depth']> };
const BASE: Spec = {
  D: 500, f: 950, pd: 61.7, rightShare: 0.5, cheek: 138, jaw: 108, forehead: 112, length: 172, offset: [0, 0],
  depth: { bridge: 0, cheeks: 0, jaw: 0, forehead: 0, top: 0, chin: 0 }, roll: 0, lidGap: 9, irisScale: [1, 1], mirror: false,
};

function sample(over: Over = {}, distanceMm?: number | null): FaceSample {
  const s: Spec = { ...BASE, ...over, depth: { ...BASE.depth, ...over.depth } };
  const a = (s.roll * Math.PI) / 180;
  const at = (X: number, Y: number, dz = 0): PointPx => {
    const xr = X * Math.cos(a) - Y * Math.sin(a), yr = X * Math.sin(a) + Y * Math.cos(a);
    const Z = s.D + dz;
    const x = W / 2 + ((xr + s.offset[0]) * s.f) / Z;
    return { x: s.mirror ? W - x : x, y: H / 2 + ((yr + s.offset[1]) * s.f) / Z, z: (dz * s.f) / s.D };
  };
  const lm: PointPx[] = Array.from({ length: 478 }, () => at(0, 0));
  const eyeY = -15, rX = -s.pd * s.rightShare, lX = s.pd * (1 - s.rightShare);
  const ri = (IRIS_MM / 2) * s.irisScale[0], li = (IRIS_MM / 2) * s.irisScale[1];
  lm[468] = at(rX, eyeY); lm[473] = at(lX, eyeY);
  lm[469] = at(rX - ri, eyeY); lm[471] = at(rX + ri, eyeY);
  lm[474] = at(lX - li, eyeY); lm[476] = at(lX + li, eyeY);
  lm[159] = at(rX, eyeY - s.lidGap / 2); lm[145] = at(rX, eyeY + s.lidGap / 2);
  lm[386] = at(lX, eyeY - s.lidGap / 2); lm[374] = at(lX, eyeY + s.lidGap / 2);
  lm[33] = at(rX - 14, eyeY); lm[133] = at(rX + 14, eyeY);
  lm[362] = at(lX - 14, eyeY); lm[263] = at(lX + 14, eyeY);
  lm[168] = at(0, eyeY, s.depth.bridge);
  lm[234] = at(-s.cheek / 2, -10, s.depth.cheeks); lm[454] = at(s.cheek / 2, -10, s.depth.cheeks);
  lm[172] = at(-s.jaw / 2, 45, s.depth.jaw); lm[397] = at(s.jaw / 2, 45, s.depth.jaw);
  lm[54] = at(-s.forehead / 2, -60, s.depth.forehead); lm[284] = at(s.forehead / 2, -60, s.depth.forehead);
  lm[10] = at(0, -95, s.depth.top); lm[152] = at(0, -95 + s.length, s.depth.chin);
  return { landmarks: lm, width: W, height: H, distanceMm: distanceMm === undefined ? s.D : distanceMm, focalPx: s.f };
}
const frames = (n: number, over: Over = {}) => Array.from({ length: n }, () => sample(over));
const captured = (fs: FaceSample[]) => {
  const out = measureFit(fs);
  if (!out.ok) throw new Error(out.message);
  return out.fit;
};

describe('landmarks', () => {
  it('uses the Face Mesh indices from the spec', () => {
    expect([LM.rightIris, LM.leftIris, LM.noseBridge]).toEqual([468, 473, 168]);
    expect([LM.cheeks, LM.jaw, LM.forehead]).toEqual([[234, 454], [172, 397], [54, 284]]);
    expect([LM.top, LM.chin]).toEqual([10, 152]);
    // Same iris edges as the distance measurement in useIrisDistance.
    expect([LM.rightIrisEdges, LM.leftIrisEdges]).toEqual([[469, 471], [474, 476]]);
  });
});

describe('irisSymmetric (shared with the distance measurement)', () => {
  it('accepts irises up to 25% different in width, inclusive, as before', () => {
    expect(irisSymmetric(14, 14)).toBe(true);
    expect(irisSymmetric(9, 7)).toBe(true); // exactly 25%
    expect(irisSymmetric(14, 10)).toBe(false); // 33%
  });
});

describe('checkFrame', () => {
  it('accepts a face at the target distance, straight on, level, eyes open', () => {
    expect(checkFrame(sample(), 500)).toBeNull();
    expect(checkFrame(sample({ roll: 5 }), 500)).toBeNull();
    expect(checkFrame(sample({ mirror: true }), 500)).toBeNull();
  });
  it('needs a full mesh and a measured distance', () => {
    expect(checkFrame({ ...sample(), landmarks: sample().landmarks.slice(0, 468) }, 500)).toBe('no-face');
    expect(checkFrame(sample({}, null), 500)).toBe('no-distance');
    expect(checkFrame({ ...sample(), focalPx: null }, 500)).toBe('no-distance');
  });
  it('rejects frames outside ±10% of the target distance', () => {
    expect(checkFrame(sample({}, 540), 500)).toBeNull();
    expect(checkFrame(sample({}, 560), 500)).toBe('distance');
    expect(checkFrame(sample({}, 440), 500)).toBe('distance');
  });
  it('rejects a turned head: unequal irises, or the nose bridge off-centre', () => {
    expect(checkFrame(sample({ irisScale: [1.4, 1] }), 500)).toBe('head-turned');
    expect(checkFrame(sample({ rightShare: 0.6 }), 500)).toBe('head-turned');
    expect(checkFrame(sample({ rightShare: 0.53 }), 500)).toBeNull(); // a real 6% asymmetry is fine
  });
  it('rejects a tilted head', () => {
    expect(rollDeg(sample({ roll: 12 }).landmarks)).toBeCloseTo(12, 6);
    expect(checkFrame(sample({ roll: 12 }), 500)).toBe('head-tilted');
    expect(checkFrame(sample({ roll: -12, mirror: true }), 500)).toBe('head-tilted');
  });
  it('rejects closed eyes (a blink)', () => {
    expect(eyeOpenness(sample().landmarks, 'right')).toBeCloseTo(9 / 28, 6);
    expect(checkFrame(sample({ lidGap: 2 }), 500)).toBe('eyes-closed');
  });
  it('has a plain-words hint for every issue', () => {
    expect(frameIssueText('distance', 500)).toContain('50 cm');
    for (const i of ['no-face', 'no-distance', 'head-turned', 'head-tilted', 'eyes-closed'] as const) expect(frameIssueText(i, 500)).not.toBe('');
  });
});

describe('frameMm (scale = distanceMm / focalPx on the iris plane)', () => {
  it('recovers PD, monocular share and face sizes from a centred face', () => {
    const m = frameMm(sample({ rightShare: 0.52 }))!;
    expect(m.pdMm).toBeCloseTo(61.7, 6);
    expect(m.rightShare).toBeCloseTo(0.52, 6);
    expect(m.cheekWidthMm).toBeCloseTo(138, 6);
    expect(m.jawWidthMm).toBeCloseTo(108, 6);
    expect(m.foreheadWidthMm).toBeCloseTo(112, 6);
    expect(m.faceLengthMm).toBeCloseTo(172, 6);
  });
  it('does not depend on the focal length when the distance comes from the iris (D = f × 11.7 / irisPx)', () => {
    const s = sample();
    const irisPx = Math.hypot(s.landmarks[469].x - s.landmarks[471].x, s.landmarks[469].y - s.landmarks[471].y);
    const f2 = s.focalPx! * 1.15; // a focal length 15% off
    const m = frameMm({ ...s, focalPx: f2, distanceMm: (f2 * IRIS_MM) / irisPx })!;
    expect(m.pdMm).toBeCloseTo(61.7, 6);
  });
  it('corrects for depth: the sides of the face are behind the iris plane and look smaller', () => {
    const deep = sample({ depth: { cheeks: 60, jaw: 45, forehead: 15, top: 10, chin: -5 } });
    const m = frameMm(deep)!;
    expect(m.cheekWidthMm).toBeCloseTo(138, 6);
    expect(m.jawWidthMm).toBeCloseTo(108, 6);
    expect(m.faceLengthMm).toBeCloseTo(172, 1);
    // Without the depth (z) the cheek width would read about 11% small.
    const flat = frameMm({ ...deep, landmarks: deep.landmarks.map((p) => ({ ...p, z: 0 })) })!;
    expect(flat.cheekWidthMm).toBeLessThan(125);
  });
  it('keeps the monocular PDs right with the face off the camera axis and the bridge in front of the irises', () => {
    const m = frameMm(sample({ offset: [60, 30], rightShare: 0.52, depth: { bridge: -12 } }))!;
    expect(m.pdMm).toBeCloseTo(61.7, 6);
    expect(m.rightShare).toBeCloseTo(0.52, 6);
  });
  it('is null without a distance or focal length', () => {
    expect(frameMm(sample({}, null))).toBeNull();
    expect(frameMm({ ...sample(), focalPx: 0 })).toBeNull();
  });
});

describe('distancePdFromNear (convergence correction)', () => {
  it('adds about 2% at 50 cm', () => {
    expect(distancePdFromNear(61.7, 500)).toBeCloseTo((61.7 * (500 + PUPIL_TO_ROTATION_MM)) / 500, 9);
    expect(distancePdFromNear(61.7, 500)).toBeCloseTo(63.0, 1);
  });
  it('grows as the screen comes closer, and vanishes far away', () => {
    expect(distancePdFromNear(60, 400)).toBeGreaterThan(distancePdFromNear(60, 500));
    expect(distancePdFromNear(60, 1e9)).toBeCloseTo(60, 4);
  });
});

describe('measureFit', () => {
  it('reports the measured PD at the viewing distance and the distance-PD estimate, labelled apart', () => {
    const fit = captured(frames(FIT_FRAMES, { rightShare: 0.51 }));
    expect(fit.status).toBe('captured');
    expect(fit.frames).toBe(FIT_FRAMES);
    expect(fit.pd.viewingDistanceMm).toBe(500);
    expect(fit.pd.measured.totalMm).toBe(61.7);
    expect(fit.pd.distanceEstimate.totalMm).toBe(63.0);
    expect(fit.pd.rotationMm).toBe(PUPIL_TO_ROTATION_MM);
    expect(fit.pd.spreadMm).toBe(0);
    // Monocular PDs add up to the total.
    for (const p of [fit.pd.measured, fit.pd.distanceEstimate]) expect(p.rightMm + p.leftMm).toBeCloseTo(p.totalMm, 6);
    expect(fit.pd.distanceEstimate.rightMm).toBe(32.1);
    expect(fit.face).toEqual({ cheekWidthMm: 138, jawWidthMm: 108, foreheadWidthMm: 112, faceLengthMm: 172 });
    expect(fit.shape.shape).toBe('oval');
    expect(fit.frame).toEqual(frameFit(fit.face, 'oval', 63.0));
    expect(fit.notes).toEqual([]);
  });
  it('takes the median, so a few bad frames do not move the result', () => {
    const fs = [...frames(26), ...frames(4, { pd: 70, cheek: 160 })];
    const fit = captured(fs);
    expect(fit.pd.measured.totalMm).toBe(61.7);
    expect(fit.face.cheekWidthMm).toBe(138);
  });
  it('rejects a PD outside the adult range with a clear message', () => {
    for (const pd of [44, 82]) {
      const out = measureFit(frames(FIT_FRAMES, { pd }));
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.message).toContain(`${PD_RANGE_MM[0]}–${PD_RANGE_MM[1]} mm`);
    }
    expect(measureFit(frames(FIT_FRAMES, { pd: 49.5 })).ok).toBe(true); // 50.5 mm for distance: inside
  });
  it('rejects an unsteady capture', () => {
    const fs = Array.from({ length: FIT_FRAMES }, (_, i) => sample({ pd: i % 2 ? 58 : 66 }));
    const out = measureFit(fs);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toMatch(/varied too much/);
  });
  it('rejects too few usable frames', () => {
    const out = measureFit([...frames(MIN_FIT_FRAMES - 1), ...Array.from({ length: 10 }, () => sample({}, null))]);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toContain(`${MIN_FIT_FRAMES - 1} usable`);
    expect(measureFit(frames(MIN_FIT_FRAMES)).ok).toBe(true);
  });
  it('rejects a missed nose bridge or face outline', () => {
    const bridge = measureFit(frames(FIT_FRAMES, { rightShare: 0.2 }));
    expect(bridge.ok).toBe(false);
    if (!bridge.ok) expect(bridge.message).toMatch(/nose bridge/);
    const outline = measureFit(frames(FIT_FRAMES, { cheek: 90 }));
    expect(outline.ok).toBe(false);
    if (!outline.ok) expect(outline.message).toMatch(/outline of the face/);
  });
  it('notes a large right/left difference', () => {
    const fit = captured(frames(FIT_FRAMES, { rightShare: 0.535 }));
    expect(fit.notes).toHaveLength(1);
    expect(fit.notes[0]).toMatch(/Right and left PD differ by 4\.\d mm/);
  });
});

const face = (cheek: number, jaw: number, forehead: number, length: number): FaceMeasurements =>
  ({ cheekWidthMm: cheek, jawWidthMm: jaw, foreheadWidthMm: forehead, faceLengthMm: length });

describe('classifyFaceShape (provisional thresholds)', () => {
  const cases: [FaceShape, FaceMeasurements][] = [
    ['oval', face(138, 108, 112, 172)], // 1.25, jaw 78%, forehead 81%
    ['oblong', face(138, 108, 112, 200)], // 1.45
    ['heart', face(138, 100, 125, 172)], // forehead 91% vs jaw 72%
    ['square', face(138, 122, 118, 160)], // jaw 88%
    ['round', face(138, 105, 110, 155)], // 1.12, jaw 76%
  ];
  it.each(cases)('%s', (shape, m) => {
    const r = classifyFaceShape(m);
    expect(r.shape).toBe(shape);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
    // Reasons quote the measured ratio, so the decision is explainable.
    expect(r.reasons.join(' ')).toContain(`${r.ratios.lengthToWidth.toFixed(2)}×`);
  });
  it('returns the ratios it used', () => {
    expect(classifyFaceShape(face(138, 108, 112, 172)).ratios).toEqual({ lengthToWidth: 1.25, jawToCheek: 0.78, foreheadToCheek: 0.81 });
  });
  it('applies the rules in order: long wins over a tapering forehead', () => {
    expect(classifyFaceShape(face(138, 100, 125, 200)).shape).toBe('oblong');
  });
  it('treats a ratio exactly on a threshold as meeting it', () => {
    expect(classifyFaceShape(face(100, 78, 88, 125)).shape).toBe('heart'); // gap exactly 10%
    expect(classifyFaceShape(face(100, 85, 80, 125)).shape).toBe('square'); // jaw exactly 85%
    expect(classifyFaceShape(face(100, 78, 80, SHAPE_THRESHOLDS.longMin * 100)).shape).toBe('oblong');
  });
  it('names a close neighbouring shape near a threshold', () => {
    const r = classifyFaceShape(face(140, 108, 112, 193.2)); // 1.38: oval, close to oblong
    expect(r.shape).toBe('oval');
    expect(r.nearby).toContain('oblong');
    expect(classifyFaceShape(face(138, 108, 112, 172)).nearby).toEqual([]);
  });
});

describe('frameFit (advice)', () => {
  it('sizes the frame from the cheekbone width and the PD', () => {
    const f = frameFit(face(138, 108, 112, 172), 'oval', 63);
    expect(f.totalWidthMm).toEqual([132, 140]);
    expect(f.size).toBe('medium');
    expect(f.lensWidthMm).toEqual([51, 55]);
    expect(f.bridgeMm).toEqual([16, 20]);
    expect(f.framePdMm).toEqual([63, 71]);
    expect(f.hints).toHaveLength(3);
    expect(f.hints[0]).toContain('132–140 mm');
  });
  it('bands the front width: narrow below 130 mm, wide from 140 mm', () => {
    const size = (cheek: number) => frameFit(face(cheek, 100, 100, 170), 'oval', 63).size;
    expect(size(130)).toBe('narrow'); // front 124–132, middle 128
    expect(size(132)).toBe('medium'); // middle 130
    expect(size(141)).toBe('medium'); // middle 139
    expect(size(142)).toBe('wide'); // middle 140
  });
  it('gives each face shape styles to try and to avoid, each with a one-line reason, as advice', () => {
    for (const shape of Object.keys(STYLE_TIPS) as FaceShape[]) {
      const f = frameFit(face(138, 108, 112, 172), shape, 63);
      expect(f.suggest.length).toBeGreaterThanOrEqual(2);
      expect(f.avoid.length).toBeGreaterThanOrEqual(1);
      for (const t of [...f.suggest, ...f.avoid]) {
        expect(t.style).not.toBe('');
        expect(t.reason).toMatch(/^[A-Z].*\.$/);
      }
      expect([...f.hints, ...f.suggest.map((t) => t.reason), ...f.avoid.map((t) => t.reason)].join(' ')).not.toMatch(/prescri/i);
    }
  });
});

describe('mmText', () => {
  it('rounds to the nearest 0.5 mm', () => {
    expect(mmText(62.74)).toBe('62.5');
    expect(mmText(62.76)).toBe('63.0');
    expect(mmText(31.25)).toBe('31.5');
  });
});

describe('demo face (?demo=1)', () => {
  it('gives usable frames and a plausible oval face with a PD of about 63 mm', () => {
    const fs = Array.from({ length: FIT_FRAMES }, (_, i) => demoFaceSample(i));
    for (const s of fs) expect(checkFrame(s, DEMO_FACE.distanceMm)).toBeNull();
    const fit = captured(fs);
    expect(mmText(fit.pd.distanceEstimate.totalMm)).toBe('63.0');
    expect(fit.pd.measured.totalMm).toBeCloseTo(DEMO_FACE.nearPdMm, 1);
    expect(fit.shape.shape).toBe('oval');
    expect(fit.frame.size).toBe('medium');
  });
  it('has the iris size the hook reports in demo mode (14 px at 50 cm)', () => {
    const lm = demoFaceSample(0).landmarks;
    expect(Math.hypot(lm[469].x - lm[471].x, lm[469].y - lm[471].y)).toBeCloseTo(14, 0);
  });
});
