# AutomataLab — Regex to NFA & DFA

Repository: `deepakcse896/compilerdesignproject`

A browser-based learning tool that parses a regular expression, builds its NFA with Thompson's construction, converts it to a DFA using epsilon-closure and subset construction, and tests strings against that DFA. An optional image workflow uses Tesseract.js OCR to recognize a regular expression from an uploaded image.

## Features

- Regular-expression input with examples, validation, and whitespace ignored.
- Union (`|`), implicit concatenation, Kleene star (`*`), positive closure (`+`), optional (`?`), and parentheses.
- Dynamically constructed NFA and DFA diagrams, state tables, and an exam-friendly written solution.
- Reachable subset construction with unique DFA states and an explicit empty/dead subset when a transition reaches it.
- DFA string tester showing the sequence of visited states, missing-symbol rejection, and final-state reason.
- JPG, JPEG, PNG, and WEBP preview and drag-and-drop upload. Tesseract.js reads a regex image in the browser and copies a detected expression directly into the main regex input. For best results, crop the image to show only the expression; OCR results must be checked against the source image.
- Copy, `.txt` download, browser print / save as PDF, and reset actions.
- Responsive dark interface with Bootstrap 5 components and Tailwind utility CSS. Tailwind preflight is disabled to avoid overriding Bootstrap and the app's styles.

## Run locally with Node.js

Requires Node.js 18 or newer. No packages need to be installed; the server and test runner use Node's built-in modules.

1. Download or clone this repository.
2. Start the local Node.js static server:

   ```sh
   npm start
   ```

3. Visit `http://localhost:3000`.

The Node.js server serves the same static files used by GitHub Pages; it adds no hosted backend dependency. The automata features run locally in the browser. OCR, Bootstrap, Tailwind, and the optional web fonts are loaded from CDNs; OCR therefore needs an internet connection the first time it is used.

On Windows PowerShell, if the `npm` command is blocked by the local script execution policy, use `npm.cmd start` and `npm.cmd test` instead.

Run the Node.js algorithm test suite with:

```sh
npm test
```

Tests check `a+b`, `a+b?`, all supplied examples, malformed expressions, whitespace handling, and complete DFA/dead-state transitions.

## Regular-expression syntax and limits

Each non-operator, non-whitespace character is one alphabet symbol. Reserved syntax characters are `|`, `*`, `+`, `?`, `(`, and `)`. There is no escape syntax, character classes, ranges, wildcard, anchors, or multi-character alphabet token support. To include a reserved operator as a literal symbol, this version would need an escape syntax, which is not implemented. Empty expressions and empty alternatives such as `a|` or `()` are rejected with a message.

Whitespace is ignored in the expression, so `a b` is interpreted as `ab`. Repeated postfix operators are parsed as nested operators (for example `a*?` means optional of `a*`).

## OCR accuracy and image limitations

OCR results are editable and are never treated as authoritative. This workflow is intended for images containing a regular expression, not for reconstructing an automaton. Review the recognized text and copied expression against the original image before generating or sharing a solution. Poor image quality, handwriting, unusual fonts, or mathematical notation can cause errors. If the uploaded image contains a state diagram or transition table instead, the app explains the limitation and asks for a regex image rather than pretending to reconstruct it. You can still enter or correct the expression manually.

## Algorithms

1. A recursive-descent parser applies precedence in this order: postfix repetition, implicit concatenation, then union.
2. Thompson construction creates a two-state fragment for each symbol and combines fragments using epsilon edges. `+` uses the child once before the repeat loop, so it does not accept the empty string.
3. DFA subset construction begins at `ε-closure({NFA start})`. For each reachable subset and alphabet symbol, it computes `ε-closure(move(subset, symbol))`. A map keyed by the sorted NFA-state subset ensures each DFA state is added once. The empty subset is included if reachable and has self-loops.
4. A DFA subset is accepting exactly when it contains the NFA's accepting state.

The solution's epsilon-closure section reports the reachable DFA subsets, each of which was constructed as an epsilon-closed set.

## Project files

```text
index.html
css/style.css
js/app.js
js/regex-parser.js
js/nfa.js
js/dfa.js
js/renderer.js
server.js
package.json
test/automata.test.js
README.md
.gitignore
```

## CDN dependencies

- Bootstrap 5.3.3 CSS and bundle: jsDelivr.
- Tailwind CSS browser CDN: `https://cdn.tailwindcss.com` (preflight disabled).
- Tesseract.js 5: jsDelivr browser bundle; English language data/worker assets are fetched when OCR is initialized.
- Google Fonts (DM Sans, DM Mono, Space Grotesk) are decorative; system fonts remain available as fallback.

Automata parsing, construction, tables, diagrams, and string testing use only the app's JavaScript modules and do not depend on these CDNs.

## GitHub setup and push

Create an empty GitHub repository, then from this project directory run:

```sh
git init
git add -A
git commit -m "Build regex automata converter"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your repository's HTTPS URL. These commands do not require committing generated build output.

## Deploy with Vercel

This project is a static frontend: regex processing, diagrams, tables, string testing, and OCR run in the browser. The Node.js server is for local development and does not need to run in production. Vercel can serve the project directly without a build command or serverless function. See Vercel's [build configuration](https://vercel.com/docs/builds/configure-a-build) and [`vercel.json` reference](https://vercel.com/docs/project-configuration/vercel-json).

### Deploy from GitHub

1. Push the project to GitHub using the commands above.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the framework preset as **Other**.
4. Leave the build command empty. Use the `Other` framework preset and set the output directory to `.` (project root) if the settings ask for an output directory.
5. Deploy. The application entry point is the root `index.html`.

### Deploy with the Vercel CLI

From the project directory, run `npx vercel` and follow the prompts. Confirm the framework is **Other**, the build command is empty, and the output directory is `.` if prompted. For a production deployment, run `npx vercel --prod`. No environment variables or API keys are required.

The Node.js server (`npm start`) is for local development; Vercel serves the same static files directly. OCR uses the Tesseract.js CDN and therefore requires a network connection.

## Deploy with GitHub Pages

1. Push the project files to the repository's `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. After the Pages deployment finishes, open the URL shown in Pages. For a project repository it normally looks like `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

The page uses relative paths for its stylesheet and JavaScript modules, so it works from the repository subpath used by GitHub Pages. No server-side configuration is needed.
