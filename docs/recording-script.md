# Recording script: interview read-aloud clips

The interview reads each screen aloud from these recordings: pre-recorded human voices only, the app never uses
text-to-speech. Until a clip exists, that screen stays silent and its sound buttons stay hidden.

Each clip below is the exact wording shown on screen (`clipScript` in `src/lib/interview.ts`: for a question, the
question and then every option, each as its own sentence; a full stop or । is added where the screen text has none).
Read it exactly as written. A test (`src/lib/interview.test.ts`) checks that every clip text below matches the
app word for word, so if the wording in the app changes, update this file and re-record that clip.

Clip ids never change: `intro`, then `q1`..`q5` (one per question). The app plays `/audio/<lang>/<id>.mp3`; the first
screen plays `intro` and then `q1`. Put the finished files in `public/audio/en/` and `public/audio/hi/` with exactly
these names; `npm run build` adds them to the offline cache.

## Recording tips

- Quiet room, no fan or TV; soft furnishings help. Phone about 20 cm from your mouth, a little to the side.
- Read exactly the words below, calmly and a bit slower than normal speech; numbers as words in the language you speak.
- One clip per recording. Leave about 1 s of silence at the start and the end (the command below trims it).
- Pause briefly between the question and each answer option.
- Re-record rather than edit if you stumble.

Convert each raw recording (any format the phone gives, e.g. `.m4a`) to a mono 44.1 kHz MP3 at about 64 kbps, with the
silence at both ends trimmed and the loudness normalised (run once per file, changing the two names):

```
ffmpeg -i raw.m4a -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -ar 44100 -c:a libmp3lame -b:a 64k public/audio/en/q1.mp3
```

Listen to each file once on the phone before committing it.

## English (recorded by our friend)

### intro (intro text): `public/audio/en/intro.mp3`

```text
A few quick questions about your daily routine. They help suggest lens options to discuss with the optometrist. This is a screening aid, not a prescription.
```

### q1 (question 1): `public/audio/en/q1.mp3`

```text
How old are you? Under 18. 18 to 39. 40 to 59. 60 or over.
```

### q2 (question 2): `public/audio/en/q2.mp3`

```text
How many hours a day do you look at screens (phone, computer, TV)? Less than 2 hours. 2 to 6 hours. More than 6 hours.
```

### q3 (question 3): `public/audio/en/q3.mp3`

```text
Do you drive or ride at night (car, scooter, bike)? Yes. No.
```

### q4 (question 4): `public/audio/en/q4.mp3`

```text
How much time do you spend outdoors in daylight? Very little (mostly indoors). Some. A lot (work or travel outside).
```

### q5 (question 5): `public/audio/en/q5.mp3`

```text
Do any of these bother you? Tap all that apply. Headaches. Glare from lights (headlights, sun). Small print is hard to read. Tired or strained eyes. None of these.
```

## Hindi (हिन्दी, recorded by the project owner)

### intro (intro text): `public/audio/hi/intro.mp3`

```text
आपकी रोज़ की आदतों के बारे में कुछ छोटे सवाल। इनसे ऑप्टोमेट्रिस्ट से बात करने के लिए लेंस के विकल्प सुझाए जाते हैं। यह सिर्फ़ एक शुरुआती जाँच है, चश्मे का नंबर (पर्चा) नहीं।
```

### q1 (question 1): `public/audio/hi/q1.mp3`

```text
आपकी उम्र कितनी है? 18 से कम। 18 से 39। 40 से 59। 60 या उससे ज़्यादा।
```

### q2 (question 2): `public/audio/hi/q2.mp3`

```text
आप दिन में कितने घंटे स्क्रीन देखते हैं (फ़ोन, कंप्यूटर, टीवी)? 2 घंटे से कम। 2 से 6 घंटे। 6 घंटे से ज़्यादा।
```

### q3 (question 3): `public/audio/hi/q3.mp3`

```text
क्या आप रात में गाड़ी चलाते हैं (कार, स्कूटर, बाइक)? हाँ। नहीं।
```

### q4 (question 4): `public/audio/hi/q4.mp3`

```text
आप दिन में कितना समय बाहर धूप में रहते हैं? बहुत कम (ज़्यादातर अंदर)। थोड़ा-बहुत। काफ़ी (बाहर काम या आना-जाना)।
```

### q5 (question 5): `public/audio/hi/q5.mp3`

```text
क्या इनमें से कोई परेशानी है? जितनी हों, सब चुनें। सिर दर्द। रोशनी से आँखें चौंधियाना (गाड़ी की लाइट, धूप)। छोटे अक्षर पढ़ने में दिक्कत। आँखों में थकान या खिंचाव। इनमें से कोई नहीं।
```
