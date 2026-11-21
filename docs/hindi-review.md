# Hindi review: every patient-facing string

For a native Hindi speaker to check. Each table lists one screen: the key (where the string lives in the code), the English
source, and the Hindi shown when the customer picks हिन्दी on the welcome screen. Aim: simple everyday Hindi that a small-town
customer at an optical counter understands, in the same style as the interview text (section 4), which was already approved.

422 strings in 20 sections. Generated from the string tables on 15 Nov 2026 (triage headlines, the two difference
reasons and REC_TEXT.eyeTestFirst changed later the same day; the three interview sound buttons UI.playAgain, UI.soundOff and
UI.soundOn added later the same day, not yet checked; the 26 far-point strings in section 18 added 16 Nov 2026, not yet
checked; the 5 strings in section 19 added 18 Nov 2026, not yet checked; the 4 strings in section 20 added 21 Nov 2026 with the
redesign, not yet checked); if you change a Hindi string,
change it in the file named under the section title (the key says which entry) and update this file.

## How to read the tables

- `{name}` is filled in by the app: a number (`{cm}` = 50, `{snellen}` = 6/9.5, `{mm}`), an eye name, or another phrase from the same
  table (`{near}`, `{eyes}`, `{why}`, `{list}`). Keep every `{name}` in the Hindi; the order may change. The tests check that each
  Hindi string has the same `{name}`s and the same numbers as the English.
- `**words**` are shown in bold.
- Sentences built from several pieces: in the triage table, `{eye}` is दाईं आँख / बाईं आँख and `{near}` is
  "पास की नज़र (50 cm)", so `{eye} की {near} 6/6 से कम है ({snellen})` reads "दाईं आँख की पास की नज़र (50 cm) 6/6 से कम है (6/9.5)".
  In the lens table `{eyes}` is दाईं आँख / बाईं आँख / दोनों आँखों (the form used before में).
- Lists are joined with "," and "और".

## Kept in English (Latin script) on purpose

- Numbers and units: 6/6, 6/9.5, logMAR, cm, mm, D (dioptre, as in −2.25 D), °, ×, %.
- PD (optical shops say PD; the first mention explains it as पुतलियों के बीच की दूरी).
- The chart letters themselves: E and the Landolt C (shown as छल्ला (Landolt C)), and Sloan (English letters chart, only offered in English).
- ZEISS lens family names (e.g. ZEISS SmartLife Progressive): product names, never translated.
- LED, UV, JSON (the export button).

## Word choices to check

| English | Hindi used | Note |
|---|---|---|
| screening aid, not a prescription | शुरुआती जाँच, चश्मे का नंबर (पर्चा) नहीं | from the approved interview text |
| eye doctor / optometrist / optician | आँखों के डॉक्टर / ऑप्टोमेट्रिस्ट / दुकान वाले | optometrist as in the interview |
| near vision (50 cm) | पास की नज़र (50 cm) | |
| worse than 6/18, below 6/6 | 6/18 से कम, 6/6 से कम | "कम" = poorer vision |
| astigmatism | एस्टिग्मैटिज़्म (सिलेंडर नंबर) | shops often say "सिलेंडर नंबर" |
| line dial | लाइनों वाला गोला | |
| horizontal / vertical line | आड़ी / खड़ी | |
| axis (of the dial lines) | दिशा | |
| red-green test | लाल-हरा टेस्ट | |
| short-sighted (myopic) / long-sighted (hyperopic) tendency | दूर का कम दिखने (मायोपिया) / पास का कम दिखने (हाइपरोपिया) का झुकाव | |
| refraction (optometrist's) | ऑप्टोमेट्रिस्ट की नंबर-जाँच | |
| far point (where the letters start to blur) | धुंधला होने की दूरी | new, 16 Nov 2026 |
| short sight (myopia) | दूर का कम दिखना (मायोपिया) | as in the red-green notes |
| rough estimate | मोटा अंदाज़ा | |
| (short sight) is not ruled out | (मायोपिया) न होने की बात पक्की नहीं है | new, 18 Nov 2026 |
| calibrate | सेट करना | |
| Landolt C ring, its gap | छल्ला, खुला हिस्सा | |
| cheekbone width | गालों की चौड़ाई | |
| frame size narrow / medium / wide | कम चौड़ा / मध्यम / ज़्यादा चौड़ा | |
| face shapes oval / round / square / heart / oblong | अंडाकार / गोल / चौकोर / दिल के आकार का / लंबा | |

## 1. Welcome (language choice)

Code: src/lib/i18n.ts WELCOME

| Key | English | Hindi |
|---|---|---|
| WELCOME.chooseLang | Choose a language | भाषा चुनें |
| WELCOME.title | Let's check your vision | आइए, आपकी नज़र जाँचें |
| WELCOME.tagline | Device-free eye check for the optical counter | चश्मे की दुकान पर, बिना किसी मशीन के आँखों की जाँच |
| WELCOME.intro | A guided check on this phone. It uses the camera to measure how far your face is from the screen, then shows eye-chart tests at the correct physical size. | इस फ़ोन पर कदम-दर-कदम जाँच। कैमरा नापता है कि आपका चेहरा स्क्रीन से कितनी दूर है, फिर आँखों के चार्ट सही आकार में दिखाता है। |
| WELCOME.minutes | Takes a few minutes, one eye at a time | कुछ मिनट लगते हैं, एक बार में एक आँख |
| WELCOME.card | You need an ID-size card (Aadhaar, PAN, licence or debit card) | पहचान पत्र जितना बड़ा एक कार्ड चाहिए (आधार, पैन, लाइसेंस या डेबिट कार्ड) |
| WELCOME.brightness | Turn the screen brightness up | स्क्रीन की रोशनी (ब्राइटनेस) पूरी कर दें |
| WELCOME.disclaimer | This is a screening aid. It is not a prescription and does not replace an eye examination. | यह सिर्फ़ एक शुरुआती जाँच है। यह चश्मे का नंबर (पर्चा) नहीं है और आँखों की पूरी जाँच की जगह नहीं लेती। |
| WELCOME.start | Start | शुरू करें |
| WELCOME.demo | Demo mode: camera disabled, distance fixed at 50 cm. | डेमो मोड: कैमरा बंद है, दूरी 50 cm पर तय है। |
| WELCOME.recent | Recent sessions (staff) | पिछली जाँचें (स्टाफ़ के लिए) |
| WELCOME.offlineDownloading | Downloading for offline use… | ऑफ़लाइन उपयोग के लिए डाउनलोड हो रहा है… |
| WELCOME.offlineReady | ✓ Ready offline | ✓ ऑफ़लाइन तैयार |
| WELCOME.offlineUpdating | Updating… | अपडेट हो रहा है… |
| WELCOME.offlineUpdateReady | Update ready — reload to use it | अपडेट तैयार है — इस्तेमाल के लिए रीलोड करें |
| WELCOME.reloadNow | Reload now | अभी रीलोड करें |
| WELCOME.version | Version: {time} | संस्करण: {time} |

## 2. Safety questions (red flags, glasses)

Code: src/lib/i18n.ts SAFETY; src/lib/triage.ts RED_FLAG_TEXT

| Key | English | Hindi |
|---|---|---|
| SAFETY.title | Before we begin | शुरू करने से पहले |
| SAFETY.ask | Do any of these apply to you right now? | क्या अभी आपको इनमें से कोई परेशानी है? |
| SAFETY.usualQ | Do you usually wear glasses or contact lenses? | क्या आप आमतौर पर चश्मा या कॉन्टैक्ट लेंस पहनते हैं? |
| SAFETY.wearNone | No | नहीं |
| SAFETY.wearGlasses | Glasses | चश्मा |
| SAFETY.wearContacts | Contact lenses | कॉन्टैक्ट लेंस |
| SAFETY.glassesOff | Please take your glasses off now. This test checks your eyes without them. | कृपया अभी अपना चश्मा उतार दें। यह जाँच बिना चश्मे के आपकी आँखें देखती है। |
| SAFETY.contactsQ | Can you take your contact lenses out for this test? | क्या आप इस जाँच के लिए कॉन्टैक्ट लेंस निकाल सकते हैं? |
| SAFETY.contactsNote | The test checks your eyes without them. If you keep them in, it shows how well you see with them. | यह जाँच बिना लेंस के आँखें देखती है। अगर लेंस लगे रहते हैं, तो पता चलेगा कि लेंस के साथ आप कितना अच्छा देखते हैं। |
| SAFETY.lensesOut | I've taken them out | लेंस निकाल दिए हैं |
| SAFETY.lensesIn | I'm keeping them in | लेंस लगे रहेंगे |
| SAFETY.chooseOne | Choose one option to continue. | आगे बढ़ने के लिए एक विकल्प चुनें। |
| SAFETY.continue | Continue | आगे बढ़ें |
| SAFETY.noneApply | None of these apply | इनमें से कुछ नहीं |
| RED_FLAG_TEXT.Sudden loss or sudden change of vision | Sudden loss or sudden change of vision | अचानक दिखना बंद होना या नज़र में अचानक बदलाव |
| RED_FLAG_TEXT.Eye pain or a red eye | Eye pain or a red eye | आँख में दर्द या आँख लाल होना |
| RED_FLAG_TEXT.Flashes of light or new floaters | Flashes of light or new floaters | रोशनी की चमक या नए तैरते धब्बे दिखना |
| RED_FLAG_TEXT.Double vision | Double vision | एक चीज़ दो-दो दिखना |

## 3. Referral (after a red flag)

Code: src/lib/i18n.ts REFERRAL

| Key | English | Hindi |
|---|---|---|
| REFERRAL.title | Please see an eye doctor first | पहले आँखों के डॉक्टर को दिखाएँ |
| REFERRAL.told | You told us about: | आपने बताया: |
| REFERRAL.body | These can need prompt medical attention. We have stopped the test. Choosing lenses is not the right next step. | इनके लिए जल्दी डॉक्टर को दिखाना ज़रूरी हो सकता है। हमने जाँच रोक दी है। अभी लेंस चुनना सही कदम नहीं है। |
| REFERRAL.restart | Start over | फिर से शुरू करें |

## 4. Interview (already approved, unchanged; listed for completeness)

Code: src/lib/interview.ts

New, to check: UI.playAgain, UI.soundOff, UI.soundOn (the read-aloud buttons, shown only when a recorded clip exists;
the sound buttons name the action). The recorded Hindi clips read the texts below word for word (docs/recording-script.md).

| Key | English | Hindi |
|---|---|---|
| UI.intro | A few quick questions about your daily routine. They help suggest lens options to discuss with the optometrist. This is a screening aid, not a prescription. | आपकी रोज़ की आदतों के बारे में कुछ छोटे सवाल। इनसे ऑप्टोमेट्रिस्ट से बात करने के लिए लेंस के विकल्प सुझाए जाते हैं। यह सिर्फ़ एक शुरुआती जाँच है, चश्मे का नंबर (पर्चा) नहीं। |
| UI.back | Back | पीछे |
| UI.next | Next | आगे |
| UI.skip | Skip questions | सवाल छोड़ें |
| UI.playAgain | Play again | फिर से सुनें |
| UI.soundOff | Sound off | आवाज़ बंद करें |
| UI.soundOn | Sound on | आवाज़ चालू करें |
| q1 | How old are you? | आपकी उम्र कितनी है? |
| q1.under18 | Under 18 | 18 से कम |
| q1.18-39 | 18 to 39 | 18 से 39 |
| q1.40-59 | 40 to 59 | 40 से 59 |
| q1.60+ | 60 or over | 60 या उससे ज़्यादा |
| q2 | How many hours a day do you look at screens (phone, computer, TV)? | आप दिन में कितने घंटे स्क्रीन देखते हैं (फ़ोन, कंप्यूटर, टीवी)? |
| q2.lt2 | Less than 2 hours | 2 घंटे से कम |
| q2.2to6 | 2 to 6 hours | 2 से 6 घंटे |
| q2.gt6 | More than 6 hours | 6 घंटे से ज़्यादा |
| q3 | Do you drive or ride at night (car, scooter, bike)? | क्या आप रात में गाड़ी चलाते हैं (कार, स्कूटर, बाइक)? |
| q3.true | Yes | हाँ |
| q3.false | No | नहीं |
| q4 | How much time do you spend outdoors in daylight? | आप दिन में कितना समय बाहर धूप में रहते हैं? |
| q4.little | Very little (mostly indoors) | बहुत कम (ज़्यादातर अंदर) |
| q4.some | Some | थोड़ा-बहुत |
| q4.lots | A lot (work or travel outside) | काफ़ी (बाहर काम या आना-जाना) |
| q5 | Do any of these bother you? Tap all that apply. | क्या इनमें से कोई परेशानी है? जितनी हों, सब चुनें। |
| q5.headache | Headaches | सिर दर्द |
| q5.glare | Glare from lights (headlights, sun) | रोशनी से आँखें चौंधियाना (गाड़ी की लाइट, धूप) |
| q5.small-print | Small print is hard to read | छोटे अक्षर पढ़ने में दिक्कत |
| q5.eye-strain | Tired or strained eyes | आँखों में थकान या खिंचाव |
| q5.none | None of these | इनमें से कोई नहीं |

## 5. Card-scale step

Code: src/lib/i18n.ts SCALE

| Key | English | Hindi |
|---|---|---|
| SCALE.title | Match your card | अपने कार्ड से मिलाएँ |
| SCALE.step1 | Take any ID-size card: Aadhaar, PAN, driving licence, or a debit/credit card. | पहचान पत्र जितना बड़ा कोई भी कार्ड लें: आधार, पैन, ड्राइविंग लाइसेंस, या डेबिट/क्रेडिट कार्ड। |
| SCALE.step2 | Lay it flat against the screen, with its **short edge** across the box. | कार्ड को स्क्रीन पर सपाट रखें, ताकि उसका **छोटा किनारा** बॉक्स के आर-पार रहे। |
| SCALE.step3 | Drag the slider until the box's outer edges line up exactly with the card's edges. | स्लाइडर को तब तक खिसकाएँ, जब तक बॉक्स के बाहरी किनारे कार्ड के किनारों से ठीक न मिल जाएँ। |
| SCALE.step4 | Tap **The box matches my card**. | **बॉक्स मेरे कार्ड से मिल गया** दबाएँ। |
| SCALE.slider | Box width | बॉक्स की चौड़ाई |
| SCALE.done | The box matches my card | बॉक्स मेरे कार्ड से मिल गया |
| SCALE.why | Why is this needed? | यह क्यों ज़रूरी है? |
| SCALE.why1 | Every phone's screen is a different size, with different-sized pixels, so the app can't tell how big a letter really looks on this screen. | हर फ़ोन की स्क्रीन और उसके पिक्सेल अलग आकार के होते हैं, इसलिए ऐप खुद नहीं जान सकता कि इस स्क्रीन पर अक्षर असल में कितना बड़ा दिखता है। |
| SCALE.why2 | An eye chart only works if each letter is an exact physical size: a 6/6 letter seen from 50 cm is under 1 mm tall. | आँखों का चार्ट तभी सही काम करता है, जब हर अक्षर ठीक सही आकार का हो: 50 cm से देखा जाने वाला 6/6 अक्षर 1 mm से भी छोटा होता है। |
| SCALE.why3 | All ID cards are the same standard size (85.6 × {mm} mm), so matching the box to the card's short edge tells the app how many pixels make a millimetre. | सभी पहचान पत्र एक ही तय आकार (85.6 × {mm} mm) के होते हैं, इसलिए बॉक्स को कार्ड के छोटे किनारे से मिलाने पर ऐप को पता चलता है कि एक मिलीमीटर में कितने पिक्सेल हैं। |
| SCALE.why4 | You do this once per phone; it's remembered. | यह हर फ़ोन पर एक ही बार करना होता है; फ़ोन इसे याद रखता है। |
| SCALE.why5 | If the box doesn't match, the letters are the wrong size and the result will be wrong. | अगर बॉक्स नहीं मिला, तो अक्षर गलत आकार के होंगे और नतीजा भी गलत आएगा। |

## 6. Distance check and camera calibration

Code: src/lib/i18n.ts CAMERA, CALIBRATION, ZOOM; src/lib/calibration.ts BLOCKER_TEXT

| Key | English | Hindi |
|---|---|---|
| CAMERA.title | Distance check | दूरी की जाँच |
| CAMERA.intro | The camera measures your iris (about 11.7 mm wide) as a ruler. Hold the phone at about {cm} cm, at eye level. | कैमरा आपकी आँख के रंगीन हिस्से (आइरिस, लगभग 11.7 mm चौड़ा) को पैमाने की तरह इस्तेमाल करता है। फ़ोन को लगभग {cm} cm दूर, आँखों की ऊँचाई पर पकड़ें। |
| CAMERA.demoCamera | camera off (demo) | कैमरा बंद (डेमो) |
| CAMERA.starting | Starting camera and face tracking… | कैमरा और चेहरे की पहचान शुरू हो रही है… |
| CAMERA.denied | Camera permission was denied. Allow camera access and reload. | कैमरे की अनुमति नहीं मिली। कैमरे की अनुमति दें और पेज दोबारा खोलें। |
| CAMERA.failed | {error} | कैमरा शुरू नहीं हो सका। ({error}) |
| CAMERA.looking | Looking for your face… | आपका चेहरा ढूँढ रहे हैं… |
| CAMERA.screenSaved | Screen calibrated on {date}. | {date} को स्क्रीन सेट की गई थी। |
| CAMERA.recalScreen | Recalibrate screen | स्क्रीन फिर से सेट करें |
| CAMERA.limit | This screen can only show letters down to {snellen} at {cm} cm, so results will stop there. For a full test, use a phone. | यह स्क्रीन {cm} cm पर सिर्फ़ {snellen} तक के अक्षर दिखा सकती है, इसलिए नतीजा वहीं रुक जाएगा। पूरी जाँच के लिए फ़ोन इस्तेमाल करें। |
| CAMERA.tooCoarse | This screen is too coarse to show the test letters at {cm} cm. For a full test, use a phone. | यह स्क्रीन {cm} cm पर जाँच के अक्षर ठीक से नहीं दिखा सकती। पूरी जाँच के लिए फ़ोन इस्तेमाल करें। |
| CAMERA.start | Start the eye tests | आँखों की जाँच शुरू करें |
| CALIBRATION.demo | Demo mode: no camera, so camera calibration is skipped. | डेमो मोड: कैमरा नहीं है, इसलिए कैमरा सेट करने का कदम छोड़ दिया गया है। |
| CALIBRATION.calibrated | Camera calibrated | कैमरा सेट है |
| CALIBRATION.recalibrate | Recalibrate camera | कैमरा फिर से सेट करें |
| CALIBRATION.badDistance | Enter the distance you measured, in cm ({min} to {max}). | आपने जो दूरी नापी, वह cm में लिखें ({min} से {max})। |
| CALIBRATION.noFace | No face found. Look at the screen and try again. | चेहरा नहीं दिखा। स्क्रीन की ओर देखें और फिर से कोशिश करें। |
| CALIBRATION.saved | Saved on this phone, so this step is not needed again here. | इस फ़ोन में सेव हो गया, अब यहाँ यह कदम दोबारा नहीं करना होगा। |
| CALIBRATION.notSaved | Applied for this test, but this browser could not save it: calibrate again next time. | इस जाँच के लिए लागू हो गया, पर यह ब्राउज़र इसे सेव नहीं कर सका: अगली बार फिर से सेट करें। |
| CALIBRATION.titleEdit | Recalibrate the camera | कैमरा फिर से सेट करें |
| CALIBRATION.titleFirst | Calibrate the camera (once per phone) | कैमरा सेट करें (हर फ़ोन पर एक बार) |
| CALIBRATION.why | Phone cameras differ, so the distance reading must be set once with a tape measure before the first test on this phone. | हर फ़ोन का कैमरा अलग होता है, इसलिए इस फ़ोन पर पहली जाँच से पहले एक बार नापने वाले फ़ीते से दूरी सेट करनी होगी। |
| CALIBRATION.step1 | Hold the phone so your eyes are exactly {cm} cm from the screen, measured with a tape or ruler. A helper can hold the tape. | फ़ोन ऐसे पकड़ें कि आपकी आँखें स्क्रीन से ठीक {cm} cm दूर हों, फ़ीते या स्केल से नापकर। कोई दूसरा व्यक्ति फ़ीता पकड़ सकता है। |
| CALIBRATION.step2 | Keep still and look at the screen. | हिलें नहीं और स्क्रीन की ओर देखें। |
| CALIBRATION.step3 | Enter the distance you measured and tap **Calibrate**. | नापी हुई दूरी लिखें और **सेट करें** दबाएँ। |
| CALIBRATION.input | Measured distance in centimetres | नापी हुई दूरी, सेंटीमीटर में |
| CALIBRATION.button | Calibrate | सेट करें |
| CALIBRATION.needFace | The camera needs to see your face before you can calibrate. | सेट करने से पहले कैमरे को आपका चेहरा दिखना चाहिए। |
| CALIBRATION.keep | Keep the current calibration | पहले वाली सेटिंग ही रखें |
| BLOCKER_TEXT.error | The camera is needed to measure your distance. Fix the camera problem above, then reload the page. | आपकी दूरी नापने के लिए कैमरा ज़रूरी है। ऊपर लिखी कैमरे की परेशानी ठीक करें, फिर पेज दोबारा खोलें। |
| BLOCKER_TEXT.starting | Waiting for the camera to start. | कैमरा शुरू होने का इंतज़ार है। |
| BLOCKER_TEXT.calibrate | Calibrate the camera first (once per phone, see the step above). | पहले कैमरा सेट करें (हर फ़ोन पर एक बार, ऊपर वाला कदम देखें)। |
| BLOCKER_TEXT.face | Waiting for the camera to see your face. | कैमरे को आपका चेहरा दिखने का इंतज़ार है। |
| ZOOM.changed | The page zoom changed, so the test sizes are no longer correct. | पेज का ज़ूम बदल गया है, इसलिए जाँच के अक्षरों का आकार अब सही नहीं है। |
| ZOOM.recalibrate | Recalibrate | फिर से सेट करें |

## 7. Header progress

Code: src/lib/i18n.ts PROGRESS

| Key | English | Hindi |
|---|---|---|
| PROGRESS.setup | Setup | तैयारी |
| PROGRESS.calibrate | Calibrate | सेटिंग |
| PROGRESS.right | Right eye | दाईं आँख |
| PROGRESS.left | Left eye | बाईं आँख |
| PROGRESS.fit | Frame fit | फ़्रेम का नाप |
| PROGRESS.results | Results | नतीजे |
| PROGRESS.aria | Progress: {label}, {done} of {total} sections done | प्रगति: {label}, {total} में से {done} हिस्से पूरे |

## 8. Before each eye (cover prompt, chart choice)

Code: src/lib/i18n.ts COVER

| Key | English | Hindi |
|---|---|---|
| COVER.testingRight | Testing the right eye | दाईं आँख की जाँच |
| COVER.testingLeft | Testing the left eye | बाईं आँख की जाँच |
| COVER.coverLeft | Cover your LEFT eye | अपनी बाईं आँख ढकें |
| COVER.coverRight | Cover your RIGHT eye | अपनी दाईं आँख ढकें |
| COVER.howRight | Use your palm, without pressing on the eye. Keep the right eye open, and keep your glasses off. | हथेली से ढकें, आँख को दबाएँ नहीं। दाईं आँख खुली रखें और चश्मा न पहनें। |
| COVER.howLeft | Use your palm, without pressing on the eye. Keep the left eye open, and keep your glasses off. | हथेली से ढकें, आँख को दबाएँ नहीं। बाईं आँख खुली रखें और चश्मा न पहनें। |
| COVER.letters | I can read English letters | मुझे अंग्रेज़ी अक्षर पढ़ने आते हैं |
| COVER.e | Show me the E | मुझे E दिखाएँ |
| COVER.ring | Show me the ring (Landolt C) | मुझे छल्ला (Landolt C) दिखाएँ |
| COVER.eHelp | Choose the E if you don't read English letters: you only show which way it points. | अगर आप अंग्रेज़ी अक्षर नहीं पढ़ते, तो E चुनें: बस बताना है कि वह किस ओर खुला है। |
| COVER.ringHelp | The ring works the same way: you only show which side its gap is on. | छल्ला भी ऐसे ही काम करता है: बस बताना है कि उसका खुला हिस्सा किस ओर है। |
| COVER.ready | Ready | तैयार हूँ |

## 9. Acuity chart (and the eye names in every test header)

Code: src/lib/i18n.ts ACUITY, EYE, DIR_TEXT (screen-reader names of the arrow keys)

| Key | English | Hindi |
|---|---|---|
| ACUITY.tooCoarse | This screen is too coarse to draw the test letters at this distance. Please use a phone with a sharper display. | यह स्क्रीन इस दूरी पर जाँच के अक्षर ठीक से नहीं बना सकती। कृपया ज़्यादा साफ़ स्क्रीन वाला फ़ोन इस्तेमाल करें। |
| ACUITY.askLetter | which letter is this? | यह कौन-सा अक्षर है? |
| ACUITY.askRing | which side is the gap on? | छल्ला किस ओर से खुला है? |
| ACUITY.askE | which way does the E open? | E किस ओर खुला है? |
| ACUITY.cantSeeBlurry | Can't see / blurry | नहीं दिख रहा / धुंधला है |
| ACUITY.cantSee | Can't see | नहीं दिखा |
| ACUITY.gapKey | Gap {dir} | खुला हिस्सा {dir} |
| ACUITY.ringLabel | Ring with the gap {dir} | छल्ला, खुला हिस्सा {dir} |
| ACUITY.eLabel | E opening {dir} | E, खुला हिस्सा {dir} |
| EYE.right | Right eye | दाईं आँख |
| EYE.left | Left eye | बाईं आँख |
| DIR_TEXT.up | up | ऊपर |
| DIR_TEXT.right | right | दाईं ओर |
| DIR_TEXT.down | down | नीचे |
| DIR_TEXT.left | left | बाईं ओर |

## 10. Line dial (astigmatism)

Code: src/lib/i18n.ts DIAL; src/lib/dial.ts DIAL_TEXT (line names, also on results)

| Key | English | Hindi |
|---|---|---|
| DIAL.header | line dial | लाइनों वाला गोला |
| DIAL.svg | Astigmatism line dial | एस्टिग्मैटिज़्म जाँच का लाइनों वाला गोला |
| DIAL.numberKey | Line {line}, number {hour} | लाइन {line}, अंक {hour} |
| DIAL.allSix | If every line looks equally dark, go back and choose 'All look the same'. | अगर सभी लाइनें एक जैसी गहरी दिखती हैं, तो पीछे जाकर 'सब एक जैसी हैं' चुनें। |
| DIAL.noneYet | Tap the darker line(s) first. | पहले गहरी दिखने वाली लाइन (या लाइनें) दबाएँ। |
| DIAL.ask | Do some of the lines look darker or sharper than the others? | क्या कुछ लाइनें बाकी लाइनों से ज़्यादा गहरी या साफ़ दिखती हैं? |
| DIAL.same | All look the same | सब एक जैसी हैं |
| DIAL.darker | Some are darker | कुछ ज़्यादा गहरी हैं |
| DIAL.unsure | Not sure | पक्का नहीं पता |
| DIAL.pick | Tap each darker line, or the number at either end of it. Tap again to undo. | हर गहरी लाइन को, या उसके किसी भी सिरे का अंक दबाएँ। हटाने के लिए फिर से दबाएँ। |
| DIAL.selected | Selected: | चुनी गईं: |
| DIAL.none | none | कोई नहीं |
| DIAL.back | Back | पीछे |
| DIAL.done | Done | हो गया |
| DIAL_TEXT.horizontal | {pair} (horizontal) | {pair} (आड़ी) |
| DIAL_TEXT.vertical | {pair} (vertical) | {pair} (खड़ी) |
| DIAL_TEXT.unsure | Not sure | पक्का नहीं |
| DIAL_TEXT.even | Even | सब बराबर |
| DIAL_TEXT.someDarker | Some lines darker | कुछ लाइनें ज़्यादा गहरी |
| DIAL_TEXT.oneLine | Darker: {pair} line (axis ≈ {axis}°) | गहरी: {pair} लाइन (दिशा ≈ {axis}°) |
| DIAL_TEXT.twoLines | {a} & {b} | {a} और {b} |
| DIAL_TEXT.several | several lines | कई लाइनें |
| DIAL_TEXT.lines | Darker: {pairs} ({axis}) | गहरी: {pairs} ({axis}) |
| DIAL_TEXT.axis | axis ≈ {axis}° | दिशा ≈ {axis}° |
| DIAL_TEXT.unclear | direction unclear | दिशा साफ़ नहीं |

## 11. Red-green test

Code: src/lib/i18n.ts DUO

| Key | English | Hindi |
|---|---|---|
| DUO.header | red-green test ({size} size) | लाल-हरा टेस्ट ({size} आकार) |
| DUO.ask | Which side are the letters clearer and blacker? | किस तरफ़ अक्षर ज़्यादा साफ़ और काले दिखते हैं? |
| DUO.red | Red | लाल |
| DUO.same | Same | बराबर |
| DUO.green | Green | हरा |

## 12. Distance badge and "move closer" card (all tests)

Code: src/lib/i18n.ts GUARD

| Key | English | Hindi |
|---|---|---|
| GUARD.badge | {distance} · target {cm} cm | {distance} · सही दूरी {cm} cm |
| GUARD.noFace | no face | चेहरा नहीं दिखा |
| GUARD.notFound | Face not found | चेहरा नहीं दिखा |
| GUARD.closer | Move closer | थोड़ा पास आएँ |
| GUARD.back | Move back a little | थोड़ा पीछे हटें |
| GUARD.look | Look at the screen so the camera can see your face. | स्क्रीन की ओर देखें, ताकि कैमरा आपका चेहरा देख सके। |
| GUARD.hold | Hold the screen about {cm} cm from your face. The chart returns when you are in range. | स्क्रीन को चेहरे से लगभग {cm} cm दूर रखें। सही दूरी पर आते ही चार्ट फिर दिखेगा। |

## 13. Frame-fit step (PD and face shape)

Code: src/lib/i18n.ts FIT; src/lib/face.ts FRAME_ISSUE_TEXT, FIT_PROBLEM_TEXT

| Key | English | Hindi |
|---|---|---|
| FIT.header | Frame fit · PD and face shape | फ़्रेम का नाप · PD और चेहरे का आकार |
| FIT.title | Measure for frames | फ़्रेम के लिए नाप |
| FIT.intro | The camera measures the distance between your pupils (PD) and the shape of your face, to suggest frame sizes and styles. | कैमरा आपकी दोनों पुतलियों के बीच की दूरी (PD) और चेहरे का आकार नापता है, ताकि फ़्रेम का साइज़ और स्टाइल सुझाया जा सके। |
| FIT.step1 | Take your glasses off. | चश्मा उतार दें। |
| FIT.step2 | Look straight at the screen, with both eyes open. | दोनों आँखें खुली रखकर सीधे स्क्रीन की ओर देखें। |
| FIT.step3 | Keep your head level and still until it finishes. | पूरा होने तक सिर सीधा और स्थिर रखें। |
| FIT.demoCamera | camera off (demo) | कैमरा बंद (डेमो) |
| FIT.measuring | Measuring | नाप रहे हैं |
| FIT.holdStill | Hold still… | हिलें नहीं… |
| FIT.retake | Retake | फिर से नापें |
| FIT.measure | Measure | नापें |
| FIT.seeResults | See results | नतीजे देखें |
| FIT.skip | Skip this step | यह कदम छोड़ें |
| FRAME_ISSUE_TEXT.no-face | Look at the screen so the camera can see your face. | स्क्रीन की ओर देखें, ताकि कैमरा आपका चेहरा देख सके। |
| FRAME_ISSUE_TEXT.no-distance | Hold still while the distance is measured. | दूरी नापी जा रही है, हिलें नहीं। |
| FRAME_ISSUE_TEXT.distance | Hold the screen about {cm} cm from your face. | स्क्रीन को चेहरे से लगभग {cm} cm दूर रखें। |
| FRAME_ISSUE_TEXT.head-turned | Face the screen straight on. | स्क्रीन के ठीक सामने सीधे देखें। |
| FRAME_ISSUE_TEXT.head-tilted | Keep your head level, not tilted to one side. | सिर सीधा रखें, किसी एक तरफ़ न झुकाएँ। |
| FRAME_ISSUE_TEXT.eyes-closed | Keep both eyes open. | दोनों आँखें खुली रखें। |
| FIT_PROBLEM_TEXT.few-frames | Only {n} usable camera frames (at least {min} are needed). Hold still and retake. | कैमरे से सिर्फ़ {n} काम की तस्वीरें मिलीं (कम से कम {min} चाहिए)। हिलें नहीं और फिर से नापें। |
| FIT_PROBLEM_TEXT.unsteady | The readings varied too much (by {spread} mm). Hold the phone and your head still, and retake. | नाप बहुत ऊपर-नीचे हुआ ({spread} mm तक)। फ़ोन और सिर स्थिर रखें, और फिर से नापें। |
| FIT_PROBLEM_TEXT.pd-range | The PD came out as {pd} mm, outside the usual adult range ({lo}–{hi} mm), so it was not used. Check the distance reading, take glasses off, and retake. | PD {pd} mm आया, जो बड़ों की आम सीमा ({lo}–{hi} mm) से बाहर है, इसलिए इसे नहीं लिया गया। दूरी की रीडिंग देखें, चश्मा उतारें और फिर से नापें। |
| FIT_PROBLEM_TEXT.bridge | The nose bridge was not found clearly (right {right} mm, left {left} mm). Face the screen straight on and retake. | नाक का ऊपरी हिस्सा (ब्रिज) साफ़ नहीं दिखा (दायाँ {right} mm, बायाँ {left} mm)। स्क्रीन के ठीक सामने देखें और फिर से नापें। |
| FIT_PROBLEM_TEXT.outline | The outline of the face was not found clearly (width {width} mm, length {length} mm). Keep hair and hands away from the face, and retake. | चेहरे की बाहरी रेखा साफ़ नहीं दिखी (चौड़ाई {width} mm, लंबाई {length} mm)। बाल और हाथ चेहरे से दूर रखें, और फिर से नापें। |
| FIT_PROBLEM_TEXT.timeout | Could not get a steady view in {s} seconds. | {s} सेकंड में चेहरे की साफ़, स्थिर तस्वीर नहीं मिल पाई। |

## 14. Frame-fit summary (fit step and results)

Code: src/lib/i18n.ts FIT_SUMMARY; src/lib/face.ts FACE_SHAPE_TEXT, FRAME_SIZE_TEXT, SHAPE_REASON_TEXT, STYLE_TIPS_TEXT, FRAME_HINT_TEXT, MONO_DIFF_TEXT

| Key | English | Hindi |
|---|---|---|
| FIT_SUMMARY.title | Frame fit | फ़्रेम का नाप |
| FIT_SUMMARY.pdDistance | PD, distance | PD, दूर के लिए |
| FIT_SUMMARY.pdSides | (R {right} / L {left}) | (दायाँ {right} / बायाँ {left}) |
| FIT_SUMMARY.pdAt | PD at {cm} cm | {cm} cm पर PD |
| FIT_SUMMARY.asMeasured | {mm} mm, as measured | {mm} mm, जैसा नापा गया |
| FIT_SUMMARY.shape | Face shape | चेहरे का आकार |
| FIT_SUMMARY.frameWidth | Frame width | फ़्रेम की चौड़ाई |
| FIT_SUMMARY.lensWidth | Lens width | लेंस की चौड़ाई |
| FIT_SUMMARY.bridge | Bridge | ब्रिज (नाक पर) |
| FIT_SUMMARY.pdNote | The distance PD is estimated from the PD measured at {cm} cm, where the eyes turn in slightly to look at the screen. | दूर के लिए PD का अंदाज़ा {cm} cm पर नापी गई PD से लगाया गया है, जहाँ स्क्रीन देखते समय आँखें थोड़ा अंदर की ओर मुड़ती हैं। |
| FIT_SUMMARY.why | Why {shape} | चेहरा {shape} क्यों माना गया |
| FIT_SUMMARY.close | Close to: {shapes}. | इसके करीब: {shapes}। |
| FIT_SUMMARY.tryStyles | Styles to try | आज़माने लायक स्टाइल |
| FIT_SUMMARY.avoidStyles | Usually less flattering | आमतौर पर कम जँचते हैं |
| FIT_SUMMARY.how | How the sizes were chosen | साइज़ कैसे चुने गए |
| FIT_SUMMARY.disclaimer | Suggestions for choosing frames, not a prescription. The optician should confirm the PD before lenses are made. | ये फ़्रेम चुनने के सुझाव हैं, चश्मे का नंबर नहीं। लेंस बनने से पहले दुकान वाले PD दोबारा जाँच लें। |
| FACE_SHAPE_TEXT.oval | Oval | अंडाकार |
| FACE_SHAPE_TEXT.round | Round | गोल |
| FACE_SHAPE_TEXT.square | Square | चौकोर |
| FACE_SHAPE_TEXT.heart | Heart | दिल के आकार का |
| FACE_SHAPE_TEXT.oblong | Oblong (long) | लंबा |
| FRAME_SIZE_TEXT.narrow | narrow | कम चौड़ा |
| FRAME_SIZE_TEXT.medium | medium | मध्यम |
| FRAME_SIZE_TEXT.wide | wide | ज़्यादा चौड़ा |
| SHAPE_REASON_TEXT.oblong.1 | The face is long for its width: length {L} the cheekbone width (long from {long}×). | चौड़ाई के हिसाब से चेहरा लंबा है: लंबाई, गालों की चौड़ाई की {L} है ({long}× से लंबा माना जाता है)। |
| SHAPE_REASON_TEXT.oblong.2 | Jaw {J} and forehead {F} of the cheekbone width. | गालों की चौड़ाई के मुकाबले जबड़ा {J} और माथा {F} है। |
| SHAPE_REASON_TEXT.heart.1 | The forehead is wider than the jaw: forehead {F}, jaw {J} of the cheekbone width (a gap of {taper} or more). | माथा जबड़े से चौड़ा है: गालों की चौड़ाई के मुकाबले माथा {F} और जबड़ा {J} है ({taper} या ज़्यादा का फ़र्क)। |
| SHAPE_REASON_TEXT.heart.2 | Face length {L} the cheekbone width. | चेहरे की लंबाई, गालों की चौड़ाई की {L} है। |
| SHAPE_REASON_TEXT.square.1 | The jaw is nearly as wide as the cheekbones: {J} of the cheekbone width (broad from {square}). | जबड़ा लगभग गालों जितना चौड़ा है: गालों की चौड़ाई का {J} ({square} से चौड़ा माना जाता है)। |
| SHAPE_REASON_TEXT.square.2 | Face length {L} the cheekbone width (not long: under {long}×). | चेहरे की लंबाई, गालों की चौड़ाई की {L} है (लंबा नहीं: {long}× से कम)। |
| SHAPE_REASON_TEXT.round.1 | The face is short for its width: length {L} the cheekbone width (short up to {short}×). | चौड़ाई के हिसाब से चेहरा छोटा है: लंबाई, गालों की चौड़ाई की {L} है ({short}× तक छोटा माना जाता है)। |
| SHAPE_REASON_TEXT.round.2 | The jaw is narrower than the cheekbones ({J}), so the outline is rounded rather than square. | जबड़ा गालों से पतला है ({J}), इसलिए चेहरा चौकोर नहीं, गोल लगता है। |
| SHAPE_REASON_TEXT.oval.1 | Balanced length: {L} the cheekbone width (between {short}× and {long}×). | लंबाई संतुलित है: गालों की चौड़ाई की {L} है ({short}× और {long}× के बीच)। |
| SHAPE_REASON_TEXT.oval.2 | Jaw {J} and forehead {F} of the cheekbone width: narrower than the cheekbones, with no strong taper. | गालों की चौड़ाई के मुकाबले जबड़ा {J} और माथा {F} है: दोनों गालों से पतले, और चेहरा नीचे की ओर बहुत पतला नहीं होता। |
| STYLE_TIPS_TEXT.oval.try1.style | Most shapes, e.g. rectangular or soft square | लगभग हर आकार, जैसे आयताकार या हल्का चौकोर |
| STYLE_TIPS_TEXT.oval.try1.reason | Balanced proportions suit most frame shapes. | संतुलित चेहरे पर ज़्यादातर फ़्रेम अच्छे लगते हैं। |
| STYLE_TIPS_TEXT.oval.try2.style | A front as wide as the widest part of the face | चेहरे के सबसे चौड़े हिस्से जितना चौड़ा फ़्रेम |
| STYLE_TIPS_TEXT.oval.try2.reason | Keeps the natural balance of an oval face. | इससे अंडाकार चेहरे का कुदरती संतुलन बना रहता है। |
| STYLE_TIPS_TEXT.oval.avoid1.style | Very oversized frames | बहुत बड़े फ़्रेम |
| STYLE_TIPS_TEXT.oval.avoid1.reason | They can hide the balanced proportions. | ये चेहरे का संतुलन छिपा सकते हैं। |
| STYLE_TIPS_TEXT.round.try1.style | Rectangular or square frames | आयताकार या चौकोर फ़्रेम |
| STYLE_TIPS_TEXT.round.try1.reason | Straight lines and corners add definition to soft curves. | सीधी लाइनें और कोने गोल चेहरे को उभार देते हैं। |
| STYLE_TIPS_TEXT.round.try2.style | Upswept or browline tops | ऊपर की ओर उठे या भौंह जैसी ऊपरी लाइन वाले फ़्रेम |
| STYLE_TIPS_TEXT.round.try2.reason | They draw the eye upwards, so the face looks longer. | ये नज़र ऊपर की ओर खींचते हैं, जिससे चेहरा लंबा लगता है। |
| STYLE_TIPS_TEXT.round.avoid1.style | Small round frames | छोटे गोल फ़्रेम |
| STYLE_TIPS_TEXT.round.avoid1.reason | They repeat the roundness and can make the face look fuller. | ये गोलाई को और बढ़ाते हैं, जिससे चेहरा भरा-भरा लग सकता है। |
| STYLE_TIPS_TEXT.square.try1.style | Round or oval frames | गोल या अंडाकार फ़्रेम |
| STYLE_TIPS_TEXT.square.try1.reason | Curves soften a strong jawline. | गोलाई मज़बूत जबड़े को नरम दिखाती है। |
| STYLE_TIPS_TEXT.square.try2.style | Thin or semi-rimless frames | पतले या आधे रिम वाले फ़्रेम |
| STYLE_TIPS_TEXT.square.try2.reason | Lighter lines balance angular features. | हल्की लाइनें तीखे नैन-नक्श को संतुलित करती हैं। |
| STYLE_TIPS_TEXT.square.avoid1.style | Boxy, sharp-cornered frames | डिब्बे जैसे, नुकीले कोनों वाले फ़्रेम |
| STYLE_TIPS_TEXT.square.avoid1.reason | They echo the angles of the jaw. | ये जबड़े के कोनों को और उभारते हैं। |
| STYLE_TIPS_TEXT.heart.try1.style | Oval, round or aviator frames | अंडाकार, गोल या एविएटर फ़्रेम |
| STYLE_TIPS_TEXT.heart.try1.reason | Fuller low down, they balance a wider forehead and a narrower chin. | नीचे से भरे होने के कारण ये चौड़े माथे और पतली ठुड्डी को संतुलित करते हैं। |
| STYLE_TIPS_TEXT.heart.try2.style | Light or rimless frames | हल्के या बिना रिम वाले फ़्रेम |
| STYLE_TIPS_TEXT.heart.try2.reason | They keep attention away from the wider top of the face. | इनसे चेहरे के चौड़े ऊपरी हिस्से पर ध्यान कम जाता है। |
| STYLE_TIPS_TEXT.heart.avoid1.style | Heavy browline or decorated tops | ऊपर से भारी या सजावट वाले फ़्रेम |
| STYLE_TIPS_TEXT.heart.avoid1.reason | They add more width at the top. | ये ऊपर की चौड़ाई और बढ़ाते हैं। |
| STYLE_TIPS_TEXT.oblong.try1.style | Deep (tall) frames, round or square | ऊँचे फ़्रेम, गोल या चौकोर |
| STYLE_TIPS_TEXT.oblong.try1.reason | Taller lenses make a long face look shorter. | ऊँचे लेंस लंबे चेहरे को छोटा दिखाते हैं। |
| STYLE_TIPS_TEXT.oblong.try2.style | Frames with detail at the sides | किनारों पर डिज़ाइन वाले फ़्रेम |
| STYLE_TIPS_TEXT.oblong.try2.reason | They add width and break up the length. | ये चौड़ाई बढ़ाते हैं और लंबाई कम दिखाते हैं। |
| STYLE_TIPS_TEXT.oblong.avoid1.style | Small, narrow frames | छोटे, कम चौड़े फ़्रेम |
| STYLE_TIPS_TEXT.oblong.avoid1.reason | They make a long face look longer. | इनसे लंबा चेहरा और लंबा लगता है। |
| FRAME_HINT_TEXT.1 | A frame front about {lo}–{hi} mm wide is close to your face width at the cheekbones ({w} mm), so it neither pinches nor overhangs. | लगभग {lo}–{hi} mm चौड़ा फ़्रेम आपके गालों की चौड़ाई ({w} mm) के करीब है, इसलिए यह न कसेगा, न बाहर निकलेगा। |
| FRAME_HINT_TEXT.2 | Lens width {lensLo}–{lensHi} mm with a {bridgeLo}–{bridgeHi} mm bridge adds up to about that front width. The nose is not measured: check the bridge sits comfortably. | {lensLo}–{lensHi} mm का लेंस और {bridgeLo}–{bridgeHi} mm का ब्रिज मिलकर लगभग इतनी ही चौड़ाई बनाते हैं। नाक नापी नहीं गई है: देख लें कि ब्रिज नाक पर आराम से बैठे। |
| FRAME_HINT_TEXT.3 | Lens width + bridge of {pdLo}–{pdHi} mm keeps the lens centres close to your pupils (PD {pd} mm). | लेंस की चौड़ाई + ब्रिज {pdLo}–{pdHi} mm रखने से लेंस का बीच का हिस्सा आपकी पुतलियों के पास रहता है (PD {pd} mm)। |
| MONO_DIFF_TEXT | Right and left PD differ by {diff} mm. This can be real, or the head was slightly turned: confirm before ordering lenses. | दाईं और बाईं PD में {diff} mm का फ़र्क है। ऐसा सच में हो सकता है, या सिर थोड़ा मुड़ा था: लेंस ऑर्डर करने से पहले दोबारा जाँच लें। |

## 15. Results: the main finding (triage)

Code: src/lib/triage.ts TRIAGE_TEXT

| Key | English | Hindi |
|---|---|---|
| TRIAGE_TEXT.worse60 | worse than 6/60 | 6/60 से भी कम |
| TRIAGE_TEXT.orBetter | {snellen} or better (logMAR ≤ {logmar}) | {snellen} या उससे बेहतर (logMAR ≤ {logmar}) |
| TRIAGE_TEXT.logmarOrBetter | logMAR {logmar} or better | logMAR {logmar} या उससे बेहतर |
| TRIAGE_TEXT.referFirst | Please see an eye doctor first | पहले आँखों के डॉक्टर को दिखाएँ |
| TRIAGE_TEXT.reported | You reported: {flag} | आपने बताया: {flag} |
| TRIAGE_TEXT.near | near vision ({cm} cm) | पास की नज़र ({cm} cm) |
| TRIAGE_TEXT.noLine | {eye} eye {near}: could not read the largest line (worse than 6/60). | {eye} की {near}: सबसे बड़ी लाइन भी नहीं पढ़ी जा सकी (6/60 से भी कम)। |
| TRIAGE_TEXT.worse18 | {eye} eye {near} is worse than 6/18 ({snellen}). | {eye} की {near} 6/18 से कम है ({snellen})। |
| TRIAGE_TEXT.below6 | {eye} eye {near} is below 6/6 ({snellen}); a lens may help. | {eye} की {near} 6/6 से कम है ({snellen}); लेंस से मदद मिल सकती है। |
| TRIAGE_TEXT.dialNote | {eye} eye: some dial lines looked darker — possible mild astigmatism. Mention it at your next eye check. | {eye}: गोले की कुछ लाइनें ज़्यादा गहरी दिखीं — हल्का एस्टिग्मैटिज़्म (सिलेंडर नंबर) हो सकता है। अगली बार आँखों की जाँच में यह बताएँ। |
| TRIAGE_TEXT.dialReason | {eye} eye: some dial lines looked darker, which can point to astigmatism. | {eye}: गोले की कुछ लाइनें ज़्यादा गहरी दिखीं, जो एस्टिग्मैटिज़्म (सिलेंडर नंबर) का संकेत हो सकता है। |
| TRIAGE_TEXT.differ2 | The two eyes' {near} differs by two lines. | दोनों आँखों की {near} में दो लाइनों का फ़र्क है। |
| TRIAGE_TEXT.differ3 | The two eyes' {near} differs by three or more lines. | दोनों आँखों की {near} में तीन या ज़्यादा लाइनों का फ़र्क है। |
| TRIAGE_TEXT.headRefer | Please see an optometrist soon | कृपया जल्द ही ऑप्टोमेट्रिस्ट को दिखाएँ |
| TRIAGE_TEXT.headAdvise | Glasses are likely to help: get an eye test when you can | चश्मे से मदद मिल सकती है: जब हो सके, आँखों की जाँच करवाएँ |
| TRIAGE_TEXT.headOk | No concern found today | आज की जाँच में कोई परेशानी नहीं मिली |

## 16. Results: per eye, chart and glasses lines, buttons

Code: src/lib/i18n.ts RESULTS, CHART_NAME, DUO_ANSWER; src/lib/correction.ts CORRECTION_TEXT, USUAL_TEXT

| Key | English | Hindi |
|---|---|---|
| RESULTS.alsoNoted | Also noted | यह भी देखा गया |
| RESULTS.lensTitle | Lens suggestions | लेंस के सुझाव |
| RESULTS.lensDisclaimer | Screening aid, not a prescription. Lens powers come only from an optometrist's eye test. | यह शुरुआती जाँच है, चश्मे का नंबर नहीं। लेंस का नंबर सिर्फ़ ऑप्टोमेट्रिस्ट की आँखों की जाँच से तय होता है। |
| RESULTS.chart | Chart: {chart} | चार्ट: {chart} |
| RESULTS.notRecorded | not recorded | दर्ज नहीं |
| RESULTS.near | Near vision ({cm} cm) | पास की नज़र ({cm} cm) |
| RESULTS.dial | Line dial | लाइनों वाला गोला |
| RESULTS.redGreen | Red-green | लाल-हरा टेस्ट |
| RESULTS.limited | Your screen can't draw smaller letters, so this is the best this phone can measure. | आपकी स्क्रीन इससे छोटे अक्षर नहीं बना सकती, इसलिए यह फ़ोन इससे बेहतर नहीं नाप सकता। |
| RESULTS.nearNote | Near vision at {cm} cm can differ from distance vision. This is a screening aid, not a prescription. | {cm} cm पर पास की नज़र, दूर की नज़र से अलग हो सकती है। यह शुरुआती जाँच है, चश्मे का नंबर नहीं। |
| RESULTS.fitSkipped | Frame fit (PD and face shape): skipped. | फ़्रेम का नाप (PD और चेहरे का आकार): छोड़ दिया गया। |
| RESULTS.demo | Demo mode: the camera was off, so these are not real measurements. | डेमो मोड: कैमरा बंद था, इसलिए ये असली नाप नहीं हैं। |
| RESULTS.provisional | Screening aid only; not a prescription. Thresholds are provisional until reviewed with an optometrist. | सिर्फ़ शुरुआती जाँच; चश्मे का नंबर नहीं। नतीजे तय करने के नियम तब तक अस्थायी हैं, जब तक ऑप्टोमेट्रिस्ट इन्हें जाँच न लें। |
| RESULTS.copy | Copy result JSON | नतीजा कॉपी करें (JSON) |
| RESULTS.copied | Copied | कॉपी हो गया |
| RESULTS.newTest | New test | नई जाँच |
| RESULTS.staff | Staff view | स्टाफ़ के लिए सारांश |
| RESULTS.notSaved | Not saved to recent sessions: storage on this phone is unavailable or full. | पिछली जाँचों में सेव नहीं हुआ: इस फ़ोन की स्टोरेज उपलब्ध नहीं है या भर गई है। |
| RESULTS.copyFailed | Couldn't copy automatically. Select the text below. | अपने-आप कॉपी नहीं हो सका। नीचे का टेक्स्ट चुनकर कॉपी करें। |
| RESULTS.showData | Show result data | नतीजे का डेटा दिखाएँ |
| CHART_NAME.E | Tumbling E | E चार्ट |
| CHART_NAME.letters | Letters (Sloan) | अंग्रेज़ी अक्षर (Sloan) |
| CHART_NAME.C | Landolt C | छल्ला (Landolt C) |
| DUO_ANSWER.red | Red clearer | लाल में ज़्यादा साफ़ |
| DUO_ANSWER.green | Green clearer | हरे में ज़्यादा साफ़ |
| DUO_ANSWER.equal | Same | दोनों बराबर |
| CORRECTION_TEXT.withContacts | Tested with contact lenses | कॉन्टैक्ट लेंस लगाकर जाँच हुई |
| CORRECTION_TEXT.withoutGlasses | Tested without glasses | बिना चश्मे के जाँच हुई |
| CORRECTION_TEXT.withUnknown | Tested with: not recorded | किसके साथ जाँच हुई: दर्ज नहीं |
| CORRECTION_TEXT.usually | Usually wears: {what} | आमतौर पर पहनते हैं: {what} |
| CORRECTION_TEXT.notRecorded | not recorded | दर्ज नहीं |
| USUAL_TEXT.none | nothing | कुछ नहीं |
| USUAL_TEXT.glasses | glasses | चश्मा |
| USUAL_TEXT.contacts | contact lenses | कॉन्टैक्ट लेंस |

## 17. Results: lens suggestions

Code: src/lib/i18n.ts KIND_NAME; src/lib/recommend.ts STATUS_TEXTS, CATEGORY_TEXT, REC_TEXT, EYES_TEXT

| Key | English | Hindi |
|---|---|---|
| KIND_NAME.lens | Lens | लेंस |
| KIND_NAME.coating | Lens option | लेंस का विकल्प |
| KIND_NAME.frame | Frame | फ़्रेम |
| STATUS_TEXTS.refer-first | See an eye doctor before choosing lenses | लेंस चुनने से पहले आँखों के डॉक्टर को दिखाएँ |
| STATUS_TEXTS.after-check | To discuss after the eye check | आँखों की जाँच के बाद बात करने के लिए |
| STATUS_TEXTS.suggest | Options to discuss with the optometrist | ऑप्टोमेट्रिस्ट से बात करने के लिए विकल्प |
| STATUS_TEXTS.none | No lens indicated by this screening | इस जाँच के हिसाब से लेंस की ज़रूरत नहीं दिखी |
| CATEGORY_TEXT.progressive | Progressive lens | प्रोग्रेसिव लेंस |
| CATEGORY_TEXT.singleVision | Single-vision lens | सिंगल-विज़न लेंस |
| CATEGORY_TEXT.office | Office lens (desk and screen distance) | ऑफ़िस लेंस (मेज़ और स्क्रीन की दूरी के लिए) |
| CATEGORY_TEXT.nightDriving | Night-driving lens | रात में गाड़ी चलाने का लेंस |
| CATEGORY_TEXT.blueLight | Blue-light filter | ब्लू-लाइट फ़िल्टर |
| CATEGORY_TEXT.photochromic | Photochromic lens (darkens in sunlight) | फ़ोटोक्रोमिक लेंस (धूप में गहरा हो जाता है) |
| CATEGORY_TEXT.antiReflective | Anti-reflective coating | एंटी-रिफ़्लेक्टिव कोटिंग (चमक कम करने वाली परत) |
| CATEGORY_TEXT.myopiaManagement | Myopia-management lens | मायोपिया कंट्रोल लेंस |
| REC_TEXT.referFirst | Please see an eye doctor before choosing lenses: the symptoms you reported need a check first. Lens options can wait until after that visit. | लेंस चुनने से पहले आँखों के डॉक्टर को दिखाएँ: आपने जो परेशानी बताई, उसकी पहले जाँच ज़रूरी है। लेंस के विकल्प उसके बाद देखे जा सकते हैं। |
| REC_TEXT.afterCheck | The screening suggests an eye check by an optometrist first. These options are to discuss after the check, once your prescription is measured. | इस जाँच के हिसाब से पहले ऑप्टोमेट्रिस्ट से आँखों की जाँच करवाएँ। ये विकल्प उस जाँच के बाद बात करने के लिए हैं, जब आपका चश्मे का नंबर नप जाए। |
| REC_TEXT.eyeTestFirst | Get an eye test by an optometrist before buying lenses: only that test measures the lens power you need. These options are to discuss at the test. | लेंस खरीदने से पहले ऑप्टोमेट्रिस्ट से आँखों की जाँच करवाएँ: आपके लेंस का नंबर सिर्फ़ उसी जाँच से तय होता है। ये विकल्प उस जाँच के समय बात करने के लिए हैं। |
| REC_TEXT.noneWithOptions | No lens is indicated by this screening. The options below match your answers, if you choose glasses anyway (for example for screens or sun); ask the optician which are available. | इस जाँच के हिसाब से लेंस की ज़रूरत नहीं दिखी। अगर आप फिर भी चश्मा लेना चाहें (जैसे स्क्रीन या धूप के लिए), तो नीचे के विकल्प आपके जवाबों से मेल खाते हैं; दुकान पर पूछें कि इनमें से कौन-से मिलते हैं। |
| REC_TEXT.noInterview | Age was not asked, so progressive and office lenses (for near focus from about 40) are not considered; they need the age question. | उम्र नहीं पूछी गई, इसलिए प्रोग्रेसिव और ऑफ़िस लेंस (लगभग 40 की उम्र के बाद पास के काम के लिए) नहीं देखे गए; इनके लिए उम्र का सवाल ज़रूरी है। |
| REC_TEXT.astigmatism | The line dial hinted at astigmatism in {eyes}. Spectacle lenses can correct astigmatism; the optometrist measures how much and at which angle. | लाइनों वाले गोले से {eyes} में एस्टिग्मैटिज़्म (सिलेंडर नंबर) का संकेत मिला। चश्मे के लेंस इसे ठीक कर सकते हैं; ऑप्टोमेट्रिस्ट नापेंगे कि यह कितना है और किस कोण पर है। |
| REC_TEXT.myopiaManagement | Myopia management: short sight in children and teens often increases as they grow. Ask the optometrist whether a myopia-management lens (for example {zeiss}) suits you. | मायोपिया कंट्रोल: बच्चों और किशोरों में दूर का कम दिखना अक्सर बड़े होने के साथ बढ़ता है। ऑप्टोमेट्रिस्ट से पूछें कि क्या मायोपिया कंट्रोल लेंस (जैसे {zeiss}) आपके लिए ठीक है। |
| REC_TEXT.eyeStrain | Eye strain: regular screen breaks help most. Tell the optometrist about it, as an uncorrected prescription can also cause it. | आँखों में थकान: स्क्रीन से बार-बार छोटा ब्रेक लेना सबसे ज़्यादा मदद करता है। ऑप्टोमेट्रिस्ट को इसके बारे में बताएँ, क्योंकि सही नंबर का चश्मा न होने से भी ऐसा होता है। |
| REC_TEXT.headache | Headaches: tell the optometrist. Uncorrected vision is one possible cause among many. | सिर दर्द: ऑप्टोमेट्रिस्ट को बताएँ। नज़र की कमी ठीक न होना इसके कई कारणों में से एक हो सकता है। |
| REC_TEXT.duoRed | Red-green test: red looked clearer in {eyes}, a possible myopic (short-sighted) tendency. | लाल-हरा टेस्ट: {eyes} में लाल ज़्यादा साफ़ दिखा, यानी दूर का कम दिखने (मायोपिया) का झुकाव हो सकता है। |
| REC_TEXT.duoGreen | Red-green test: green looked clearer in {eyes}, a possible hyperopic (long-sighted) tendency. | लाल-हरा टेस्ट: {eyes} में हरा ज़्यादा साफ़ दिखा, यानी पास का कम दिखने (हाइपरोपिया) का झुकाव हो सकता है। |
| REC_TEXT.duoNear | The red-green test was done at {cm} cm (near), where green can also look clearer simply because near focusing lags, more so from about 40. Treat these as hints only; the optometrist's refraction decides. | लाल-हरा टेस्ट {cm} cm (पास) पर हुआ, जहाँ पास पर फ़ोकस थोड़ा पीछे रहने से भी हरा ज़्यादा साफ़ दिख सकता है, खासकर लगभग 40 की उम्र के बाद। इन्हें सिर्फ़ संकेत मानें; असली फ़ैसला ऑप्टोमेट्रिस्ट की नंबर-जाँच से होगा। |
| REC_TEXT.myopicPart | a myopic (short-sighted) tendency in {eyes} | {eyes} में दूर का कम दिखने (मायोपिया) का झुकाव |
| REC_TEXT.hyperopicPart | a hyperopic (long-sighted) tendency in {eyes} | {eyes} में पास का कम दिखने (हाइपरोपिया) का झुकाव |
| REC_TEXT.tendency | Because the red-green test hinted at {list}: only the optometrist's refraction can confirm it and set the lens strength. | क्योंकि लाल-हरे टेस्ट के हिसाब से {list} हो सकता है: सिर्फ़ ऑप्टोमेट्रिस्ट की नंबर-जाँच ही इसे पक्का कर सकती है और लेंस का नंबर तय कर सकती है। |
| REC_TEXT.frameCategory | {size} frame, front {lo}–{hi} mm | {size} फ़्रेम, आगे की चौड़ाई {lo}–{hi} mm |
| REC_TEXT.frameWidth | Because your face is about {w} mm wide at the cheekbones: a frame front of {lo}–{hi} mm neither pinches nor overhangs. | क्योंकि गालों पर आपका चेहरा लगभग {w} mm चौड़ा है: {lo}–{hi} mm का फ़्रेम न कसेगा, न बाहर निकलेगा। |
| REC_TEXT.frameShape | Because your face shape looks {shape}: try {style}. {reason} | क्योंकि आपका चेहरा {shape} लगता है: {style} आज़माएँ। {reason} |
| REC_TEXT.nearBelow | your near vision at {cm} cm is below 6/6 in {where} | {cm} cm पर आपकी पास की नज़र {where} में 6/6 से कम है |
| REC_TEXT.whereBoth | both eyes (right {right}, left {left}) | दोनों आँखों (दाईं {right}, बाईं {left}) |
| REC_TEXT.whereOne | {eye} ({snellen}) | {eye} ({snellen}) |
| REC_TEXT.age40 | 40 or over | 40 या उससे ज़्यादा |
| REC_TEXT.age60 | 60 or over | 60 या उससे ज़्यादा |
| REC_TEXT.youAre | you are {age} | आपकी उम्र {age} है |
| REC_TEXT.smallPrint | find small print hard to read | छोटे अक्षर पढ़ने में दिक्कत होती है |
| REC_TEXT.progressive | Because {why}: focusing up close usually gets harder from about 40, and a progressive lens gives clear vision far away, at arm's length and up close in one lens. | क्योंकि {why}: लगभग 40 की उम्र के बाद पास की चीज़ों पर फ़ोकस करना अक्सर मुश्किल होता है, और प्रोग्रेसिव लेंस एक ही लेंस में दूर, हाथ भर की दूरी पर और पास, तीनों जगह साफ़ दिखाता है। |
| REC_TEXT.office | Because you are {age} and spend more than 6 hours a day at screens: an office lens is made for desk and screen distances, with a wider clear zone there than a progressive lens. | क्योंकि आपकी उम्र {age} है और आप दिन में 6 घंटे से ज़्यादा स्क्रीन देखते हैं: ऑफ़िस लेंस मेज़ और स्क्रीन की दूरी के लिए बना है, और वहाँ प्रोग्रेसिव लेंस से ज़्यादा चौड़ा साफ़ हिस्सा देता है। |
| REC_TEXT.officeSecond | Because a progressive lens has only a narrow zone for screen distance: an office lens works well as a second pair for long screen work. | क्योंकि प्रोग्रेसिव लेंस में स्क्रीन की दूरी के लिए सिर्फ़ पतला हिस्सा होता है: लंबे समय के स्क्रीन के काम के लिए ऑफ़िस लेंस दूसरे चश्मे के रूप में अच्छा रहता है। |
| REC_TEXT.svNear | Because {near}: a single-vision lens made to the optometrist's prescription can sharpen it. | क्योंकि {near}: ऑप्टोमेट्रिस्ट के बताए नंबर से बना सिंगल-विज़न लेंस इसे साफ़ कर सकता है। |
| REC_TEXT.svAstig | Because the line dial hinted at astigmatism in {eyes}, which a lens can correct. | क्योंकि लाइनों वाले गोले से {eyes} में एस्टिग्मैटिज़्म (सिलेंडर नंबर) का संकेत मिला, जिसे लेंस ठीक कर सकता है। |
| REC_TEXT.svGeneric | Because the screening suggests a lens is likely to help: a single-vision lens has one focus across the whole lens. | क्योंकि इस जाँच के हिसाब से लेंस से मदद मिल सकती है: सिंगल-विज़न लेंस में पूरे लेंस पर एक ही फ़ोकस होता है। |
| REC_TEXT.antiReflective | Because a lens is suggested: an anti-reflective coating cuts reflections from lights and screens, so vision is clearer and the lens is easier to keep clean. | क्योंकि लेंस सुझाया गया है: एंटी-रिफ़्लेक्टिव कोटिंग लाइट और स्क्रीन की चमक कम करती है, जिससे साफ़ दिखता है और लेंस साफ़ रखना आसान होता है। |
| REC_TEXT.nightDrive | you drive at night | आप रात में गाड़ी चलाते हैं |
| REC_TEXT.glare | glare from lights bothers you | रोशनी की चौंध से परेशानी होती है |
| REC_TEXT.night | Because {list}: a night-driving lens is designed to reduce glare from headlights and street lights. | क्योंकि {list}: रात में गाड़ी चलाने का लेंस गाड़ियों और सड़क की लाइटों की चौंध कम करने के लिए बना है। |
| REC_TEXT.screens6 | you spend more than 6 hours a day at screens | आप दिन में 6 घंटे से ज़्यादा स्क्रीन देखते हैं |
| REC_TEXT.strain | you reported eye strain | आपने आँखों में थकान बताई |
| REC_TEXT.blue | Because {list}: a blue-light filter cuts part of the blue-violet light from screens and LED lights. | क्योंकि {list}: ब्लू-लाइट फ़िल्टर स्क्रीन और LED लाइट से आने वाली नीली-बैंगनी रोशनी का कुछ हिस्सा रोकता है। |
| REC_TEXT.photochromic | Because you spend a lot of time outdoors: photochromic lenses darken in sunlight, clear again indoors and block UV. | क्योंकि आप काफ़ी समय बाहर धूप में रहते हैं: फ़ोटोक्रोमिक लेंस धूप में गहरे हो जाते हैं, अंदर आकर फिर साफ़ हो जाते हैं और UV रोकते हैं। |
| EYES_TEXT.right | the right eye | दाईं आँख |
| EYES_TEXT.left | the left eye | बाईं आँख |
| EYES_TEXT.both | both eyes | दोनों आँखों |

## 18. Far point (after the red-green test of each eye; results and triage)

Code: src/lib/i18n.ts FAR, RESULTS.farPoint, RESULTS.farPointContacts; src/lib/farpoint.ts FARPOINT_TEXT; src/lib/triage.ts TRIAGE_TEXT.farPoint

New 16 Nov 2026, not yet checked. In FARPOINT_TEXT `{cm}` is the distance (42 or 42.5) and `{d}`, `{lo}`, `{hi}` are powers such as
−2.25; in FAR.step2 `{cm}` is 20. In TRIAGE_TEXT.farPoint `{eye}` and `{near}` are as in section 15.

| Key | English | Hindi |
|---|---|---|
| FAR.header | far point | धुंधला होने की दूरी |
| FAR.title | How far do the letters stay clear? | अक्षर कितनी दूर तक साफ़ दिखते हैं? |
| FAR.step1 | Keep the other eye covered and your glasses off (contact lenses may stay in). | दूसरी आँख ढकी रखें और चश्मा न पहनें (कॉन्टैक्ट लेंस लगे रह सकते हैं)। |
| FAR.step2 | Start with the phone close, about {cm} cm from your eye, where the letters are clear. | शुरू में फ़ोन को पास रखें, आँख से लगभग {cm} cm दूर, जहाँ अक्षर साफ़ दिखें। |
| FAR.step3 | Slowly move the phone away from your face. | फ़ोन को धीरे-धीरे चेहरे से दूर ले जाएँ। |
| FAR.step4 | Tap **Blurred now** as soon as the letters start to blur. | जैसे ही अक्षर धुंधले होने लगें, **अब धुंधला है** दबाएँ। |
| FAR.distance | Distance: {distance} | दूरी: {distance} |
| FAR.noFace | no face | चेहरा नहीं दिखा |
| FAR.trial | Try {n} of {total} | कोशिश {n} ({total} में से) |
| FAR.recorded | Recorded: {list} | दर्ज हुआ: {list} |
| FAR.again | Bring the phone close again, then slowly move it away. | फ़ोन को फिर से पास लाएँ, फिर धीरे-धीरे दूर ले जाएँ। |
| FAR.blurred | Blurred now | अब धुंधला है |
| FAR.stillClear | Still clear at arm's length | हाथ भर की दूरी पर भी साफ़ है |
| FAR.alreadyBlurred | Already blurred | पहले से धुंधला है |
| FAR.skip | Skip this step | यह कदम छोड़ें |
| FAR.needFace | The camera could not see your face, so nothing was recorded. Look at the screen and tap again. | कैमरे को आपका चेहरा नहीं दिखा, इसलिए कुछ दर्ज नहीं हुआ। स्क्रीन की ओर देखें और फिर से दबाएँ। |
| FAR.coarse | This screen cannot draw these small letters sharply, so this result is less reliable. | यह स्क्रीन इन छोटे अक्षरों को ठीक से नहीं बना सकती, इसलिए यह नतीजा कम भरोसेमंद है। |
| FAR.letters | A line of small test letters | जाँच के छोटे अक्षरों की एक लाइन |
| FAR.note | This gives a rough estimate of short sight. It is not a prescription. | इससे दूर के कम दिखने (मायोपिया) का मोटा अंदाज़ा मिलता है। यह चश्मे का नंबर नहीं है। |
| RESULTS.farPoint | Far point | धुंधला होने की दूरी |
| RESULTS.farPointContacts | Far point, with contact lenses in | धुंधला होने की दूरी, कॉन्टैक्ट लेंस लगाकर |
| FARPOINT_TEXT.measured | {cm} cm → estimated about {d} D ({lo} to {hi}), not a prescription | {cm} cm → अंदाज़न लगभग {d} D ({lo} से {hi}), चश्मे का नंबर नहीं |
| FARPOINT_TEXT.beyond | Still clear at {cm} cm: any short sight is weaker than about {d} D, not a prescription | {cm} cm पर भी साफ़: दूर का कम दिखना (मायोपिया) हो भी, तो लगभग {d} D से कम है; चश्मे का नंबर नहीं |
| FARPOINT_TEXT.blurred | Blurred even at {cm} cm: possibly stronger than about {d} D, or the phone was too close to focus; not a prescription | {cm} cm पर भी धुंधला: शायद लगभग {d} D से ज़्यादा, या फ़ोन फ़ोकस के लिए बहुत पास था; चश्मे का नंबर नहीं |
| FARPOINT_TEXT.skipped | Skipped | छोड़ दिया गया |
| TRIAGE_TEXT.farPoint | {eye} eye: the letters blurred beyond {cm} cm, which suggests short sight of about {d} D (a rough estimate, not a prescription). The {near} test can miss this. | {eye}: {cm} cm से आगे अक्षर धुंधले हो गए, यानी लगभग {d} D का मायोपिया (दूर का कम दिखना) हो सकता है (मोटा अंदाज़ा, चश्मे का नंबर नहीं)। {near} की जाँच में यह छूट सकता है। |

## 19. Far point held too close, and usual glasses (far-point step; results and triage)

Code: src/lib/i18n.ts FAR.furtherAsk, FAR.cantFurther; src/lib/triage.ts TRIAGE_TEXT.farPointShort, TRIAGE_TEXT.wearGlasses, TRIAGE_TEXT.wearContacts

New 18 Nov 2026 (validation V6), not yet checked. FAR.furtherAsk is shown when "Still clear at arm's length" is tapped closer than
65 cm: `{cm}` is that distance (46) and `{max}` is 65; **अब धुंधला है** is the FAR.blurred button. FAR.cantFurther is the button that
then ends the step. In TRIAGE_TEXT.farPointShort `{eye}` is as in section 15, `{cm}` the distance and `{d}` a power such as −2.00. In
TRIAGE_TEXT.wearGlasses and TRIAGE_TEXT.wearContacts `{cm}` is 50; "long sight" is पास का कम दिखना (हाइपरोपिया) as in the word list.

| Key | English | Hindi |
|---|---|---|
| FAR.furtherAsk | Only {cm} cm. Hold the phone further away, up to {max} cm if you can (stretch your arm, or ask the staff to hold it). Then tap again, or tap **Blurred now** if the letters blur. | सिर्फ़ {cm} cm। हो सके तो फ़ोन को और दूर, {max} cm तक ले जाएँ (हाथ पूरा फैलाएँ, या स्टाफ़ से फ़ोन पकड़ने को कहें)। फिर से दबाएँ, या अक्षर धुंधले हो जाएँ तो **अब धुंधला है** दबाएँ। |
| FAR.cantFurther | I can't hold it further | इससे दूर ले जाना मुमकिन नहीं |
| TRIAGE_TEXT.farPointShort | {eye} eye: far point checked only out to {cm} cm, so short sight up to about {d} D is not ruled out. | {eye}: धुंधला होने की दूरी सिर्फ़ {cm} cm तक जाँची गई, इसलिए लगभग {d} D तक का मायोपिया (दूर का कम दिखना) न होने की बात पक्की नहीं है। |
| TRIAGE_TEXT.wearGlasses | You usually wear glasses but read well without them at {cm} cm. This is common with glasses for long sight, reading or mild astigmatism, which this screening cannot measure: take your glasses to an eye test. | आप आमतौर पर चश्मा पहनते हैं, फिर भी {cm} cm पर बिना चश्मे के ठीक से पढ़ पाए। पास का कम दिखने (हाइपरोपिया), पढ़ने या हल्के एस्टिग्मैटिज़्म (सिलेंडर नंबर) के चश्मे में ऐसा अक्सर होता है, और यह जाँच इन्हें नाप नहीं सकती: अपना चश्मा लेकर आँखों की जाँच करवाएँ। |
| TRIAGE_TEXT.wearContacts | You usually wear contact lenses but read well without them at {cm} cm. This is common with lenses for long sight, reading or mild astigmatism, which this screening cannot measure: take your contact lens details to an eye test. | आप आमतौर पर कॉन्टैक्ट लेंस पहनते हैं, फिर भी {cm} cm पर बिना लेंस के ठीक से पढ़ पाए। पास का कम दिखने (हाइपरोपिया), पढ़ने या हल्के एस्टिग्मैटिज़्म (सिलेंडर नंबर) के लेंस में ऐसा अक्सर होता है, और यह जाँच इन्हें नाप नहीं सकती: अपने कॉन्टैक्ट लेंस की जानकारी लेकर आँखों की जाँच करवाएँ। |

## 20. Redesign: welcome footer, header step label, distance target, results eyebrow

Code: src/lib/i18n.ts WELCOME.ready, PROGRESS.step, CAMERA.target, RESULTS.yourResult

New 21 Nov 2026 (visual redesign), not yet checked. WELCOME.ready is shown above the disclaimer, next to the Start button.
PROGRESS.step is shown under the progress line as "कदम 2 (5 में से) · सेटिंग": `{n}` is the current step (1 to 5), `{total}` is 5,
and the step name (section 7) follows after " · ". कदम is the word already used in FAR.skip (यह कदम छोड़ें).
CAMERA.target is shown under the live distance on the distance-check screen (`{cm}` = 50), worded like GUARD.badge (सही दूरी).
RESULTS.yourResult is the small label above the main finding on the results screen.

| Key | English | Hindi |
|---|---|---|
| WELCOME.ready | Ready? | तैयार हैं? |
| PROGRESS.step | Step {n} of {total} | कदम {n} ({total} में से) |
| CAMERA.target | target {cm} cm | सही दूरी {cm} cm |
| RESULTS.yourResult | Your result | आपका नतीजा |
