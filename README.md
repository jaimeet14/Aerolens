# AeroLens

Team Aero, NIT Rourkela · ZEISS India Hackathon · theme: No-Device Vision Intelligence & Accessible Clinical UX

Device-free eye assessment and lens recommendation for optical counters that have only a counter and a phone.

**Live:** https://aerolens-navy.vercel.app (open on a phone; add `?demo=1` to skip the camera)

## Status
| Phase | What | Status |
|---|---|---|
| 1 | Vision tests | Built |
| 2 | Selfie PD, face shape, frame fit | Built (demo-mode tested; real-camera check pending) |
| 3 | Lens recommendation, interview, staff screen, English/Hindi | Built (voice not yet) |
| 4 | Validation against prescriptions and a Snellen chart | In progress: 3 volunteers logged in [`docs/validation.md`](docs/validation.md), target 10–15 |

## Phase 1: vision tests
- **Safety screen**: red-flag questions (sudden vision loss, eye pain/redness, flashes/floaters, double vision) stop the flow and refer to an optometrist. Also asks whether the person usually wears glasses.
- **Screen-scale calibration**: match an on-screen box to the short edge of an ID-1 card (53.98 mm) for true px per mm. Saved per screen, so it is skipped next time.
- **Iris-based distance**: MediaPipe Face Mesh (iris landmarks, on-device, no CDN) uses the ~11.7 mm iris as a ruler. A one-time tape-measure camera calibration per phone is required.
- **Distance gating**: tests are shown only while the face is within ±10% of 50 cm.
- **Acuity, three charts**: Sloan letters, Tumbling E, or ISO 8596 Landolt C (preset in Hindi sessions). Sized by visual angle, bracketing staircase, per eye, Snellen and logMAR. Labelled near vision (50 cm).
- **Astigmatism line dial**: line width tuned to the eye's acuity; darker line(s) give a rule-of-30 axis estimate.
- **Duochrome (red-green)**: interpreted as a possible myopic or hyperopic tendency (cautious wording).

## Phase 2: frame fit
- **Selfie PD**: measured at 50 cm plus an estimated distance PD and monocular PDs (about ±2.5 mm, from the iris assumption).
- **Face shape** with the reasons shown, and **frame size and style suggestions**.

## Phase 3: recommendation and staff tools
- **Lens suggestions**: explainable rule-based engine using ZEISS lens family names; never lens powers.
- **Interview**: 5 one-tap questions (age, screen hours, night driving, time outdoors, …), skippable.
- **Whole app in English or Hindi**: chosen first; every patient screen and generated sentence is translated. Staff screens and the export stay English.
- **Staff screen**: recent sessions on this phone, a printable one-page summary, JSON export (v12).

## Phase 4: validation (in progress)
Protocol and results in [`docs/validation.md`](docs/validation.md): AeroLens results compared with each volunteer's prescription and, where possible, a printed Snellen chart. Three volunteers so far; the Landolt C still needs its own comparison.

## Not built yet
Voice for the interview, Odia, a distance-acuity mode, a multi-device staff dashboard.

## Known limits
- Testing at 50 cm measures near/intermediate acuity: mild myopes (up to about −2 D) can still read 6/6.
- Iris size varies between people, which limits distance and PD accuracy.
- Triage thresholds and recommendation rules are provisional and need review by an optometrist.
- Screening aid only, not a prescription.

## Run
```
npm install
npm run dev      # open on the phone over the LAN; camera needs HTTPS or localhost
npm test         # 368 unit tests
npm run build
```
`?demo=1` disables the camera and fixes distance at 50 cm, for UI review on a laptop.
