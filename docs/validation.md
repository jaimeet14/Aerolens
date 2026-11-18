# AeroLens validation log (Phase 4)

Comparing AeroLens results with each volunteer's known spectacle prescription and, where possible, a printed Snellen chart.
**Anonymised:** volunteers are numbered; no names, photos or contact details are kept here.

## Protocol
1. Record the volunteer's current prescription (SPH / CYL / AXIS / PD) from their spectacle card or optometrist slip.
2. Run AeroLens on a phone (not a laptop: coarse screens stop at about 6/9.5 at 50 cm), screen brightness at maximum.
3. The app always tests **without** glasses (from export v8). Answer the usual-wear question ("Do you usually wear glasses or contact lenses?") honestly, and take glasses off when the app asks. Contact lens wearers take them out if they can ("I've taken them out"). A with-glasses run is no longer part of the protocol. In v8 exports `correction` is the usual wear and `testedWith` is what the test was done with; in v7 and earlier exports `correction` meant what was worn during the test (the with-glasses runs below are from then).
4. Copy the result JSON from the results screen for each run and add it under the volunteer.
5. Where possible, also read a printed Snellen chart at 6 m and a near card at 40 cm, each eye, with and without glasses.
6. **Keep it blind:** collect the prescription *after* the AeroLens runs, and never tell the volunteer which line or score to expect. (V1 run 3 was not blind: the expected 3 o'clock line had been mentioned beforehand.)
7. **Dial control (head tilt):** if a darker line is reported, ask the volunteer to tilt their head 90° (ear to shoulder). Real astigmatism turns with the eye, so the darker line should move to the perpendicular line (e.g. 3–9 → 12–6). If it doesn't move, record it as suggestion or a screen artefact.
8. **Landolt C needs its own volunteer comparison** (chart `'C'`, from export v12; automatic after a Hindi interview). Every run below used the letter chart (or the E on a laptop), so none of it validates the C: compare C runs with a printed Landolt C or Snellen chart on their own volunteers before trusting C results like the letter chart's.
9. **Turn off night mode / blue-light filter** (Night Light, Eye Comfort, Reading mode, etc.) during the tests. These filters dim the green and blue light, so the duochrome's red and green halves are no longer equally bright.

## Summary

| # | Date | Rx R (SPH/CYL×AXIS) | Rx L | AeroLens without glasses (R / L) | AeroLens with glasses (R / L) | Dial without glasses (R / L) | Agrees? |
|---|---|---|---|---|---|---|---|
| V1 | 14 Nov 2026 | 0.00 / −0.50 × 80 | 0.00 / −1.00 × 80 | run 2: 6/9.5 / 6/7.5 · run 3: 6/7.5 / 6/7.5 · run 4: 6/7.5 / 6/9.5 | 6/6+ / 6/6+ | run 2: Even / Even · runs 3–4 (thin lines): 3–9 / 3–9 (axis ≈ 90°) | Yes after dial update; runs 3–4 not blind |
| V2 | 14 Nov 2026 | −0.25 / 0.00 | −0.50 / 0.00 | 6/6+ / 6/7.5 | not run | 4–10 (≈120°) / 2–8 & 3–9 (≈75°) | Acuity plausible; **dial false positive** in both eyes |
| V3 | 14 Nov 2026 | −3.00 / 0.00 | −3.50 / 0.00 | 6/19 / 6/12 (Tumbling E), triage refer | 6/7.5+ / 6/7.5+ (screen limit) | Even / Even | **Detects the −3 D myopia** (refer, R as predicted). L better than predicted; **duochrome green, not red** |
| V4 | 15 Nov 2026 | −0.25 / −2.00 × 80, ADD +1.75 | 0.00 / −1.75 × 90, ADD +1.75 | 6/12 / 6/19 (Tumbling E), triage refer | not run | 1–7 & 2–8 (≈45°) / 5–11 & 6–12 (≈165°) | **Astigmatism detected in both eyes**, refer and progressive as predicted; **axis wrong** (≈90° expected); L worse than predicted |
| V5 | 15 Nov 2026 | **not yet given** | **not yet given** | 6/12 / 6/19 (Sloan), triage refer | not run | 3–9 & 5–11 (unclear) / 3–9 & 4–10 (≈105°) | Can't judge without the prescription |
| V6 | 18 Nov 2026 | +1.00 / −0.50 × 70 | +1.75 / −0.50 × 100 | 6/6 / 6/6 (Sloan), far point still clear at 46 / 45 cm, triage ok | not run | Even / Even | **Misses the hyperopia** (expected: a young eye focuses through +1.75 D at 50 cm); cyl −0.50 not flagged, like V1 |

`6/6+` = 6/6 or better (the screen could not draw a smaller line).

- **Triage rule changed 15 Nov 2026:** a two-line difference between the eyes is now 'advise' (refer from three lines). Under the new rule V3, V4 and V5 would be 'advise'. (The "triage refer" entries above and in the runs below are what the app showed at the time; `triage.test.ts` replays all three.)

---

## V1 — 14 Nov 2026

**Prescription (single vision):** R 0.00 / −0.50 × 80 · L 0.00 / −1.00 × 80 · PD 31.5 / 31 mm (62.5 mm total). Pure astigmatism, no sphere. Spherical equivalent R −0.25 D, L −0.50 D.

**Conditions:** Android phone, screen 360×800 CSS px, dpr 2. Card scale 5.42 px/mm (card step on run 1, reused from the saved calibration on run 2). Camera not tape-calibrated (`focalCalibrated: false`). Letter chart (Sloan). AeroLens export version 4.

### Run 1: with glasses (14:17 UTC)
| Line | Right | Left |
|---|---|---|
| 6/19 to 6/7.5 | 15/15 correct | 15/15 correct |
| 6/6 | R✓ D✓ C→O ✗ R→can't see ✗ N✓ = pass | O✓ N✓ O✓ = pass |
| 6/4.8 | not drawable (screen limit) | not drawable |
| **Result** | **6/6 or better** | **6/6 or better** |

Dial: even both eyes. Duochrome: equal both eyes. Distance median R 497 mm, L 504 mm (range 477–523). Triage: no concern.

### Run 2: without glasses (14:20 UTC)
| Line | Right | Left |
|---|---|---|
| 6/19 to 6/12 | 9/9 correct | 9/9 correct |
| 6/9.5 | 3/3 correct = pass | Z✓ D→R ✗ V→R ✗ Z✓ S✓ = pass (3/5) |
| 6/7.5 | O can't see ✗, C can't see ✗, N✓, Z✓, O can't see ✗ = fail | O→D ✗ S✓ H→N ✗ Z✓ S✓ = pass (3/5) |
| 6/6 | not tested | H, C, V can't see = fail |
| **Result** | **6/9.5** | **6/7.5** |

Dial: even both eyes. Duochrome: equal both eyes. Distance median R 474 mm (range 462–489, leaned closer without glasses), L 492 mm (479–528). Triage: "A lens recommendation is likely to help".

### Run 3: without glasses, after the 14 Nov update (14:50 UTC)
Export v5. The thin dial lines are now derived from acuity. The camera **is** tape-calibrated (`focalCalibrated: true`). Saved card scale.
| Line | Right | Left |
|---|---|---|
| 6/19 to 6/9.5 | 12/12 correct | 6/19 & 6/15: 6/6; 6/12: O✓ D✓ H can't see ✗ O✓ = pass; 6/9.5: 3/3 |
| 6/7.5 | D✓ O✓ D✓ = pass | R✓ V✓ H→R ✗ V✓ = pass |
| 6/6 | R, C, N can't see = fail | H✓, then S, Z, N can't see = fail |
| **Result** | **6/7.5** | **6/7.5** |

Dial: **darker line in both eyes**, recorded as 9 o'clock (R) and 3 o'clock (L). These are the two ends of the **same 3–9 (horizontal) line**. By the rule of 30 (lower number × 30), 3 × 30 = **90°**, against a prescribed axis of **80°**. That is within the dial's 30° resolution, so it **matches the prescription**. Duochrome: equal. Distance median R 502 mm (495–516), L 460 mm (452–531, leaning close). Triage: advise (below 6/6, astigmatism in both eyes).

Volunteer feedback: "I saw lines 3 and 9 darker but could select only one". The dial labels both ends of each line, so one line looks like two. Fixed 14 Nov (export v6): the person now selects whole lines (1–5); one line gives axis = lower hour × 30, two neighbouring lines give the midpoint. Mapping for v5 exports: line = ((hour − 1) mod 6) + 1, so V1 run 3's 9 and 3 are both line 3 (3–9).

### Run 4: without glasses, multi-line dial (15:39 UTC)
Export v6. Camera tape-calibrated, saved card scale, letter chart.
| Line | Right | Left |
|---|---|---|
| 6/19, 6/15 | 6/6 | 6/6 |
| 6/12 | K✓ C→O ✗ Z✓ O✓ = pass | O→D ✗ N✓ S✓ O✓ = pass |
| 6/9.5 | 3/3 | 3/3 |
| 6/7.5 | 3/3 | H, R, S can't see = fail |
| 6/6 | R✓ D✓, then Z, K, S can't see = fail | not tested |
| **Result** | **6/7.5** | **6/9.5** |

Dial: line 3–9 selected in both eyes, axis ≈ 90° (prescribed 80°). Duochrome: R equal, **L green**. At 50 cm a "green clearer" answer is common in normal eyes because accommodation lags slightly behind the target, so it is not read as long-sightedness here; duochrome is still not interpreted by the app. Distance median R 479 mm (470–490), L 512 mm (493–525). Triage: advise.

**Head-tilt control (after run 4):** the volunteer tilted their head sideways and reported that the darker line **changed**. That fits real astigmatism fixed to the eye rather than suggestion or a screen artefact. The exact new line (expected 12–6) was not recorded.

**Repeatability (without glasses, runs 2–4):** R 6/9.5, 6/7.5, 6/7.5 · L 6/7.5, 6/7.5, 6/9.5. That is within ±1 line, typical chart test–retest. In run 4 the left eye (more astigmatism) scored worse, matching the prescription. The dial gave the same line (3–9) in runs 3 and 4, but neither was blind.

### Findings
- **Agrees:** needs correction. Below 6/6 in both eyes without glasses, 6/6 or better with them.
- **Disagrees: eye ranking.** The left eye has more astigmatism (−1.00 vs −0.50), so it should read worse, but it scored one line better. It is within the usual ±1 line test–retest variation, and both left-eye passes were the narrowest possible (3/5). The left eye was also tested second (practice effect). Needs a repeat.
- **Astigmatism dial: missed in run 2, detected in run 3.** With the old 0.7 mm lines it read "Even" in both eyes despite −1.00 D in the left eye. After the change to thin, acuity-derived lines (run 3), both eyes reported the **3–9 line darker**, matching the prescribed axis 80° (the rule of 30 gives 90°). It also caught the right eye's −0.50 D. One volunteer, so not yet proof.
- **Eye ranking in run 3:** both eyes 6/7.5. The expected "left worse" difference was not seen, but that is within test–retest variation.
- **Duochrome "equal"** is consistent with the very small spherical equivalent.
- **Possible keypad mis-tap:** "D → R" on the 6/9.5 line. On the 5×2 Sloan keypad, D is directly above R.
- **PD 62.5 mm** is reference data for Phase 2 (selfie PD).
- An earlier laptop run by V1 (screen 1920×1080, dpr 1, Tumbling E, with glasses) stopped at "6/9.5 or better (screen limit)" with all answers correct. It is excluded: the screen could not draw finer lines.

---

## V2 — 14 Nov 2026

**Prescription (single vision, card last used Apr 2026):** R −0.25 / 0.00 · L −0.50 / 0.00 · PD 31.5 / 31.5 mm (63 mm total). Very mild short-sightedness, **no astigmatism prescribed**. Spherical equivalent R −0.25 D, L −0.50 D. Note that cards often omit astigmatism below 0.25–0.50 D.

**Conditions:** same Android phone as V1 (360×800, dpr 2, saved card scale 5.42 px/mm), camera tape-calibrated, letter chart, export v6, **without glasses**. Blind for the dial: no expected line was mentioned to the volunteer.

| Line | Right | Left |
|---|---|---|
| 6/19 to 6/12 | 9/9 | 9/9 |
| 6/9.5 | H✓ N✓ O can't see ✗ H✓ = pass | 3/3 |
| 6/7.5 | Z✓ V✓ D can't see ✗ Z✓ = pass | 3/3 |
| 6/6 | R✓ H✓ R✓ = pass | Z✓, then K, N, O can't see = fail |
| 6/4.8 | not drawable (screen limit) | not tested |
| **Result** | **6/6 or better** | **6/7.5** |

Dial: R line 4–10 (axis ≈ 120°), L lines 2–8 & 3–9 (axis ≈ 75°). Duochrome: R green, L equal. Distance median R 493 mm (479–505), L 487 mm (470–497). Triage: advise (left below 6/6; dial lines darker in both eyes).

### Findings
- **Acuity plausible.** With −0.25 / −0.50 D, near vision at 50 cm should be near normal. Right 6/6+ and left one line lower is consistent, and the left eye is the slightly more myopic one, though one line is within retest noise. "A lens may help" is borderline for a −0.25/−0.50 prescription. Distance vision without glasses would be the better measure, but the app does not test distance.
- **Dial: flagged in both eyes although none is prescribed.** Darker lines were reported in both eyes, in **different** directions (120° and 75°). **Head-tilt re-check (one eye, presumably the right):** the volunteer first named line 10 (the 4–10 line). After a slight head tilt to the right, line 11 (5–11) looked darker. The line moved one step (30°) clockwise, the same direction as the tilt. That fits **small real astigmatism not on the card** rather than a screen artefact. Caveats: it was a slight tilt rather than a full 90°; the volunteer said "brighter", which needs confirming as "darker"; the left eye was not re-checked; and the volunteer knew the line might move. If confirmed, this is a **clinically minor true positive** (the optometrist did not prescribe it), so the dial cannot judge *how much* astigmatism there is. Possible causes considered before the re-check:
  - **Specificity cost:** the thinner, near-threshold lines (14 Nov change) make the test more sensitive, but also more prone to false positives.
  - **Rendering:** diagonal thin lines are anti-aliased differently from horizontal and vertical ones on the screen.
  - **Small real astigmatism** (≤0.25 D) not written on the card.
  - **Tear film or blinking** during the dial.
- **Takeaway:** V1 (astigmatism −0.50/−1.00) was detected. V2 (none prescribed) was flagged, and the head tilt suggests small real astigmatism. The dial detects astigmatism but can't tell "worth correcting" from "too small to prescribe". With normal acuity (V2 right eye 6/6+), a dial-only flag probably shouldn't raise triage to "a lens is likely to help". Proposed fix: an in-app rotation re-check. Show the dial rotated and ask again; real astigmatism stays at the same physical direction, while artefacts and guesses don't.
- **Duochrome "green" again in one eye.** This is consistent with accommodative lag at 50 cm, and it is uninformative for myopia at near.
- **PD 63 mm** is reference data for Phase 2.

## V3 — 14 Nov 2026

**Prescription (single vision, optometrist test 08 Nov 2024, two years old):** R −3.00 / 0.00 · L −3.50 / 0.00 · PD 33 / 31 mm (64 mm total). Moderate short-sightedness, no astigmatism. The prescription may have changed since 2024.

**Conditions:** a different Android phone (450×1000 CSS px, dpr 1.6), saved card scale 6.33 px/mm, camera tape-calibrated, letter chart, export v7, **with glasses** (glasses question: "Glasses"). Run 2 without glasses is below.

| | Right | Left |
|---|---|---|
| Acuity (50 cm) | 6/7.5 or better (screen limit) | 6/7.5 or better (screen limit) |
| Errors | 1 at 6/12, 1 at 6/7.5 | 2 at 6/12, 1 at 6/7.5 |
| Dial | Even | Even |
| Duochrome | green | green |
| Distance median (range) | 492 mm (459–517) | 476 mm (454–511) |
| Triage | ok, no reasons, no notes | |

### Findings
- **With glasses, it agrees.** The glasses correct him fully, so near vision should be normal, the dial even and triage "no concern". All three match. The dial gave no false positive this time (unlike V2), and there is no cylinder on the prescription.
- **Screen limit at 6/7.5.** At 6.33 px/mm and dpr 1.6, a 6/6 letter at 50 cm has strokes about 1.5 device px wide, too thin to draw. This phone can't confirm 6/6. For validation, use a phone with a denser screen, or note the cap.
- **Duochrome green in both eyes, with full distance glasses at 50 cm.** This is expected from accommodative lag (or slight over-minus), not a sign of long-sightedness. It is the third "green" in three volunteers (V2 R, V3 R+L). For backlog item 3: at 50 cm, green is uninformative. Only **red** is meaningful: it means the eye is still more than about 2 D short-sighted at that distance, either uncorrected or under-corrected.
- **Prediction for the run without glasses (written down before the run):** at 50 cm, a −3.00 D eye has about 1.00 D of blur left (far point 33 cm) and a −3.50 D eye about 1.50 D. Expect the right eye at roughly 6/12–6/19 and the left one about a line worse (6/19–6/24). Expect duochrome **red** in both eyes, the dial even, and triage "advise" or "refer" (refer if the left eye is worse than 6/18 or the eyes differ by two lines). Unlike V1/V2, this volunteer is myopic enough for the 50 cm test to detect (known issue 1: up to about −2 D reads normal).
- **PD 64 mm (33 / 31)** is reference data for Phase 2.

### Run 2: without glasses (20:14 UTC)

**Conditions:** same phone (450×1000 CSS px, dpr 1.6), saved card scale 6.33 px/mm, camera tape-calibrated, **Tumbling E** chart, export v7, no glasses (`correction: "none"`).

| | Right | Left |
|---|---|---|
| Acuity (50 cm) | **6/19** (logMAR 0.5) | **6/12** (logMAR 0.3) |
| Answers | 0.5: 3/3 · 0.4: 2/5 (fail) | 0.5: 3/3 · 0.4: 4/5 · 0.3: 3/4 · 0.2: 0/3 (two "can't see") |
| Dial | Even | Even |
| Duochrome | green | green |
| Distance median (range) | 501 mm (493–525) | 512 mm (493–549) |
| Triage | **refer**: both eyes below 6/6, and the eyes differ by two lines | |

### Findings (run 2), checked against the prediction above
- **The main question is answered: yes.** Without glasses, a −3 D myope is clearly caught at 50 cm: acuity dropped from 6/7.5+ (with glasses) to 6/19 and 6/12, and triage went from "ok" to "refer". This is the evidence that the 50 cm test detects moderate myopia (known issue 1 limits only up to about −2 D).
- **Right eye matches the prediction** (6/12–6/19 expected, 6/19 measured).
- **Left eye was better than predicted** (6/19–6/24 expected, 6/12 measured), although its prescription is stronger. Possible reasons: the prescription is two years old and may have changed; squinting (not controlled); a 4-choice E gives 25% guessing per answer. Repeat the left eye with the letter chart, and ask the volunteer not to squint.
- **Duochrome green in both eyes, where red was predicted.** This is the important miss: an uncorrected −3 D eye at 50 cm should see red clearer. Together with the earlier greens it suggests the phone's duochrome is biased towards green, perhaps because the green half looks brighter on this screen, or because the instruction is misread. Until it is checked, **don't present duochrome as evidence of myopia**: the triage and acuity carried this case, not the duochrome. Follow-up: compare the red and green halves' brightness on the phone, and re-run V3 without glasses, asking "Which side are the letters blacker and sharper on?"
- **Fixed 15 Nov 2026:** the halves were not luminance-matched (red 0.233 vs green 0.444, so 5.7:1 vs 9.9:1 contrast for the black E's). They now match (0.213 each). All duochrome answers before this fix (V1–V3) are unreliable. Re-run V3 without glasses to check red.
- **Dial even, as predicted** (no cylinder on the prescription).
- **Distance gating held:** every answer was given at 493–549 mm (within ±10% of 500 mm).
- Not blind in the strict sense: the prediction was written down before the run, but the volunteer's prescription was already known.

---

## V4 — 15 Nov 2026

**Prescription (bifocal, dated 29 Jun 2024, more than two years old):** R −0.25 / −2.00 × 80 · L 0.00 / −1.75 × 90 · ADD +1.75 both · PD 30 / 30 mm (60 mm total). Strong astigmatism (about 2 D, minus-cyl axis 80–90°, against the rule) with almost no sphere, and presbyopia (ADD +1.75, so age 40+). Spherical equivalent R −1.25 D, L −0.875 D. A contact-lens prescription from the same date has R cyl −1.75 instead of −2.00; the spectacle one is used here.

**Why this volunteer matters:** the first strong astigmatism (V1 had −0.50 / −1.00) and the first presbyope. It checks the dial on a real cylinder, the progressive-lens rule in the lens suggestions, and the duochrome after the 15 Nov colour fix.

**Not blind:** the prescription was known before the run. Don't show the volunteer this prediction or the expected dial line.

### Prediction (written down before the run)
- **Acuity at 50 cm without glasses:** the cylinder dominates. Its blur is about half the cylinder, roughly 1 D, at best focus; the small sphere and remaining accommodation (ADD +1.75 suggests about 1.5 D) should cover the 50 cm distance. Expect **R 6/12–6/19, L 6/9.5–6/15**, R a little worse.
- **Dial:** the darker line should be **3–9 in both eyes** (rule of 30: 90° ÷ 30 = 3 o'clock; R axis 80° may also show 2–8). The app's axis estimate should be about **90°** (R maybe 75–90°). Head-tilt control (protocol step 7): tilting the head 90° should move the darker line to 12–6.
- **Duochrome (new balanced colours):** **equal or green**, not red. At 50 cm the spherical equivalent and accommodation leave little myopic defocus. A weak prediction: this run checks for a new bias, not myopia.
- **Triage:** **advise or refer**, with astigmatism among the reasons.
- **Lens suggestions:** answering the age question 40–59 or 60+ should give a **progressive lens** (age 40+ and near acuity below 6/6), with an astigmatism note.
- **PD:** the app should show about **60 mm** (±2.5 mm), monocular about 30 / 30.

### How to run
Phone with a dense screen, brightness at maximum, night mode off, the newest version (welcome screen says "✓ Ready offline", no "Update ready"). Answer the glasses question with the usual wear, take the glasses off when asked, answer the interview honestly (age!), do both eyes and the frame-fit step, then copy the JSON from the results screen.

### Run 1: without glasses (15 Nov 2026, 17:59–18:04 local)

**Source:** printed staff summary (session 84f44f3f), not the JSON, so per-answer distances and the device aren't recorded. Tumbling E chart, tested without glasses (usual wear answered "nothing"), interview answered (age 40–59, screens 2–6 h, drives at night, a lot outdoors, tired eyes). Frame fit skipped, so PD is not checked. Whether the phone was already on the 15 Nov duochrome colour fix isn't known.

| | Right | Left |
|---|---|---|
| Acuity (50 cm) | **6/12** (logMAR 0.3) | **6/19** (logMAR 0.5) |
| Dial | darker 1–7 & 2–8 (axis ≈ 45°) | darker 5–11 & 6–12 (axis ≈ 165°) |
| Duochrome | same | same |
| Triage | **refer**: both eyes below 6/6, astigmatism hinted in both, eyes differ by two lines | |
| Lens suggestions | **Progressive lens** (age 40+, near vision below 6/6), plus anti-reflective, night-driving, blue-light and photochromic options; astigmatism note | |

### Findings (run 1), checked against the prediction above
- **Astigmatism detected in both eyes: yes.** The prescription has −2.00 and −1.75 cylinder, and the dial flagged both eyes. This is the main check, and it passed.
- **Axis: no.** Expected ≈ 90° in both eyes (3–9 line). The app gave ≈ 45° (R) and ≈ 165° (L). The left eye's 6–12 line is the meridian *perpendicular* to the prescribed axis, which a fan dial shows when the retina lies between the two focal lines: at 50 cm without fogging, this eye's more short-sighted meridian (170°, −2.25 D) focuses at least 0.25 D in front of the retina and the other (80°, −0.25 D) behind it unless he accommodates about 1.75 D, so either line can look darker and it changes with accommodation. The right eye's 1–7 / 2–8 is oblique and matches neither. **Conclusion: the dial shows that astigmatism is present, but its axis estimate isn't reliable** and shouldn't be shown to staff as a measurement.
- **Acuity: both reduced, as predicted.** Right 6/12 is inside the predicted 6/12–6/19. Left 6/19 is worse than the predicted 6/9.5–6/15, and worse than the right although the cylinders are almost the same (−1.75 vs −2.00). The prescription is from June 2024. A repeat with the letter chart would show whether it's real.
- **Triage refer and progressive lens: as predicted.** The age question drove the progressive suggestion, and the astigmatism note appeared.
- **Duochrome "same" in both eyes:** inside the prediction ("equal or green"). No sign of the old green bias, but it's unclear whether this phone already had the fix.
- **Not checked:** PD (frame fit skipped), head-tilt control on the dial.

---

## V5 — 15 Nov 2026

**Prescription:** not yet given. Without it this run can't be judged; add it here when available.

### Run 1: without glasses (15 Nov 2026, 18:12–18:15 local)

**Source:** printed staff summary (session 52d52332). Letter chart (Sloan), tested without glasses (usual wear answered "nothing"), interview answered (age 40–59, screens 2–6 h, no night driving, some time outdoors; headaches, glare, small print hard to read, tired eyes). Frame fit skipped.

| | Right | Left |
|---|---|---|
| Acuity (50 cm) | **6/12** (logMAR 0.3) | **6/19** (logMAR 0.5) |
| Dial | darker 3–9 & 5–11 (direction unclear) | darker 3–9 & 4–10 (axis ≈ 105°) |
| Duochrome | same | same |
| Triage | **refer**: both eyes below 6/6, astigmatism hinted in both, eyes differ by two lines | |
| Lens suggestions | **Progressive lens** (age 40+, small print hard, near vision below 6/6), anti-reflective, night-driving (glare), blue-light; astigmatism and headache notes | |

- Acuity happens to be identical to V4 (6/12 / 6/19).
- The right eye's two darker lines (3–9 and 5–11) aren't next to each other, so the app correctly gave no axis.

---

## V6 — 18 Nov 2026

**Prescription (eye-hospital patient report, distance, corrected 6/6 each eye, no near addition):** R +1.00 / −0.50 × 70 · L +1.75 / −0.50 × 100. PD not given. Long sight (hyperopia) with a small cylinder, and the eyes differ by 0.75 D (spherical equivalent R +0.75 D, L +1.50 D).

**Why this volunteer matters:** the first long-sighted volunteer. V1–V5 were short-sighted, astigmatic or presbyopic.

**Not blind:** the report was open on the phone (screenshots 12:50) a few minutes before the run (12:56).

### Run 1: without glasses (18 Nov 2026, 12:56–13:00 local)

**Source:** printed staff summary (session f2e418b7), not the JSON. Letter chart (Sloan), tested without glasses (usual wear answered "glasses"), interview answered (age 18–39, screens 2–6 h, no night driving, very little time outdoors; headaches). Frame fit done.

| | Right | Left |
|---|---|---|
| Acuity (50 cm) | **6/6** (logMAR 0.0) | **6/6** (logMAR 0.0) |
| Dial | even | even |
| Duochrome | same | same |
| Far point | "Still clear at arm's length" at **46 cm**: short sight weaker than about −2.00 D | same, at **45 cm** |
| Triage | **ok**, "No concern found today" | |
| Lens suggestions | No lens indicated; headache note ("tell the optometrist") | |
| Frame fit | PD 56.0 mm distance (R 27.5 / L 28.0), 54.5 mm measured at 46 cm; round face; narrow frame 120–128 mm | |

### Findings
- **Hyperopia missed: triage ok against a +1.00 / +1.75 prescription.** Expected for this design: at 50 cm the eye needs 2 D of focusing plus 1.0–1.75 D for the long sight, 3–3.75 D in all, well inside what an eye aged 18–39 can do (about 7 D or more). Uncorrected distance vision is often 6/6 too. Neither the acuity test nor the far-point step (which only looks for short sight) can find low hyperopia in a young adult. Optometrists find it with retinoscopy or plus lenses. **The app should not claim "no concern" covers long sight.**
- **Duochrome "same" in both eyes:** the eyes focus through the test, so no green answer is expected. Not a failure, but no help either.
- **Cylinder −0.50 not flagged (dial even):** as in V1 run 2. The dial does not detect 0.50 D cylinders. Not clinically important on its own.
- **Anisometropia 0.75 D not seen:** both eyes 6/6.
- **Far point: correct (no short sight), but the bound is weaker than the triage threshold.** Arm's length was only 45–46 cm, so "still clear" only rules out short sight stronger than about −2.00 D. A −1.5 to −2 D myope tapping at the same distance would also pass as ok, although `farPointAdvises` raises ok → advise from a measured −1.5 D.
- **Usual wear "glasses" + 6/6 unaided + headaches → "no concern":** a combination the app could use. Someone who wears glasses but reads 6/6 at 50 cm without them likely has long sight, a small cylinder or a near prescription that this screening cannot measure.
- **PD 56.0 mm:** plausible for an adult, but not checked (no PD on the report).
- **Not checked:** head-tilt control (dial even), PD.
- **Fixed 18 Nov 2026:** under the new rules this run is **advise** ("You usually wear glasses but read well without them at 50 cm…"), with a note per eye that the far point was checked only out to 46 / 45 cm, so short sight up to about −2.00 D is not ruled out. The far-point step now also asks to hold the phone out to 65 cm before accepting "Still clear". `triage.test.ts` replays V6. Hyperopia itself is still not measured.
