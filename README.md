# Wienerisch — learn Austrian Viennese German

A personal, self-contained learning site: dashboard, week-by-week roadmap,
grammar reference (explained via Serbian case parallels), pronunciation
guide (standard German + Viennese dialect shifts), a searchable vocabulary
browser (~190 words, each tagged with the real Austrian word vs. the
Germany-standard equivalent, plus English and Serbian translations),
spaced-repetition flashcards, multiple-choice quizzes, and a culture/slang
page.

No backend, no build step, no dependencies. Pure HTML/CSS/JS. Progress
(flashcard scheduling, roadmap checkboxes, streak) is saved to your
browser's `localStorage`.

## Run it

Just open `index.html` in a browser, or serve it locally:

```
python3 -m http.server 8080
```

then visit `http://localhost:8080`.

## Structure

- `index.html` — page shell and all view markup
- `css/style.css` — styling
- `js/data.js` — vocabulary, grammar, pronunciation and roadmap content
- `js/app.js` — navigation, spaced-repetition logic, flashcards, quiz, text-to-speech

Pronunciation playback uses the browser's built-in `speechSynthesis` API
(prefers a `de-AT` voice if your OS/browser has one installed, otherwise
falls back to any German voice).
