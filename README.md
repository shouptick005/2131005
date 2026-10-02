# MTE Solution Books

> Knowledge should be free.

An open-source web portal of **exam solution books for KUET Mechatronics Engineering (MTE)** courses. Every past exam question solved, with the theory, derivations, worked numbers and drawn figures you need to answer it. The books can be searched, read on a phone or printed.

The site is plain HTML, CSS and vanilla JavaScript. There is no framework and no runtime dependency. A small Node script prepares the pages, and Vercel serves the result as static files.

> **Disclaimer:** This is an independent, student-made study aid. It is not an official publication of, or endorsed by, Khulna University of Engineering & Technology (KUET) or its Department of Mechatronics Engineering. Solutions may contain mistakes. Check them against your lecture notes and [report errors](#reporting-a-mistake) so everyone benefits.

---

## Contents

- [Features](#features)
- [Available books](#available-books)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Common tasks](#common-tasks)
- [Book format](#book-format)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Reporting a mistake](#reporting-a-mistake)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Features

- **Solved past questions**: every question from recent term exams, organised by topic, with marks and the exam it came from (e.g. `2023 · Q5(c)`).
- **Site-wide search**: search across all chapters, sections and past questions in every book. Results jump straight to the right section.
  - Press `/` or `Ctrl+K` from any page.
  - Results appear as you type, and you can pick one with ↑ ↓ and Enter.
  - The full results page (`/search`) has filters for term, course and Set A / Set B.
- **Reader bar**: inside every book there is a slim bar with:
  - a Set A ⇄ Set B switch;
  - a **Chapters** menu that highlights where you are;
  - a reading-progress line, search and a back-to-top button.
- **Clickable contents**: each book's Contents list links to its chapters.
- **Light & dark mode**: follows your device setting and remembers your choice. The book pages themselves stay paper-white so diagrams always look as drawn.
- **Works everywhere**: responsive down to small phones. Print-friendly A4 layout with the site chrome hidden.
- **Fast and simple**: no frameworks or trackers. Maths is pre-rendered with KaTeX, so pages need no math JavaScript.

---

## Available books

### Level 4 · Term 1

| Course | Set A | Set B |
|---|---|---|
| **MTE 4011** Machine Learning | Supervised learning: regression, logistic regression, Naïve Bayes, decision trees, SVM, neural networks · 8 chapters · 42 questions | Unsupervised learning: clustering, K-Means, KNN, bias–variance, dimensionality reduction, PCA · 8 chapters · 37 questions |
| **MTE 4033** Automotive Vehicle Technology | Engine, power train and chassis · 11 chapters · 41 questions | Vehicle electronics: ECU, CAN, ABS, cruise control, TCS, ESP, EVs, autonomous navigation · 8 chapters · 37 questions |
| **MTE 4101** Industrial Automation | Automation, Industry 4.0, networks, SCADA/DCS, instrumentation, PID control · 7 chapters · 44 questions | PLC hardware and programming: ladder, IL/SFC, timers, counters, shift registers · 10 chapters · 38 questions |
| **MTE 4103** Digital Signal Processing and Machine Vision | DSP: signals, convolution, correlation, z-transform, DFT/FFT, digital filters · 9 chapters · 41 questions | Machine vision: image acquisition, enhancement, filtering, edge detection, segmentation, recognition · 7 chapters · 39 questions |
| **MTE 4107** Design of Mechatronic Systems | Design process, modelling, simulation/HIL, machine elements, motor sizing, control, optimisation · 7 chapters · 36 questions | Sensors, actuators, drives, control and compensators, real-time interfacing, Kalman filtering · 9 chapters · 42 questions |

**10 books · 397 solved past questions.** Every book ends with an appendix holding a formula sheet and an answer key.

### Level 4 · Term 2

Coming over the next 12 months. [Contributions welcome](#contributing).

---

## Quick start

**Requirements:** [Node.js](https://nodejs.org/) 18 or newer and Git. Nothing to `npm install`.

```bash
git clone https://github.com/shouptick005/2131005.git
cd 2131005
node scripts/build.js        # process books, regenerate pages and the search index
node scripts/serve.js 3000   # preview at http://localhost:3000
```

> The site uses root-relative clean URLs such as `/term-4-1/MTE-4011/Set_A`. Serve it with `scripts/serve.js` (or any static server that supports clean URLs). Opening the HTML files directly via `file://` will not work.

---

## Project structure

```text
.
├── index.html                  # [generated] Homepage
├── search.html                 # [generated] Full search page
├── hall-of-fame.html           # [generated] Contributors
├── 404.html                    # [generated] Not-found page
├── vercel.json                 # Clean URLs, caching and security headers
├── .vercelignore               # Files kept out of the deployment
├── PROJECT_INSTRUCTIONS.md     # Design and architecture notes
│
├── assets/
│   ├── katex/                  # Shared KaTeX stylesheet + fonts
│   ├── css/
│   │   ├── main.css            # Design tokens, themes, site bar, search, portal pages
│   │   └── book-theme.css      # Loaded only inside books (bar offset, dark surround, TOC links)
│   ├── js/
│   │   ├── theme-toggle.js     # Light/dark mode (runs in <head> to avoid a flash)
│   │   ├── main.js             # Reading progress, chapter menu, back-to-top, anchor fix
│   │   └── search.js           # Search dropdown and /search page
│   └── data/
│       ├── courses.json        # SOURCE: terms, courses, Set A/B descriptions
│       ├── contributors.json   # SOURCE: Hall of Fame entries
│       └── search-index.json   # [generated] Search index
│
├── scripts/
│   ├── build.js                # Build script (zero dependencies)
│   └── serve.js                # Local preview server (mimics Vercel clean URLs)
│
├── term-4-1/
│   ├── index.html              # [generated] Term hub
│   └── MTE-4011/
│       ├── index.html          # [generated] Course page
│       ├── Set_A.html          # SOURCE book (enhanced in place by the build)
│       └── Set_B.html
│   └── … MTE-4033, MTE-4101, MTE-4103, MTE-4107
│
└── term-4-2/
    └── index.html              # [generated] "Coming soon" until courses are added
```

**SOURCE** files are edited by hand. **[generated]** files are overwritten by `node scripts/build.js`. To change them, edit the script or the JSON data, never the generated HTML.

---

## How it works

`scripts/build.js` is the only build step. It runs in a few seconds and is **idempotent**: running it again on unchanged input produces identical files.

1. **Enhances each book in place** (`term-*/MTE-*/Set_*.html`):
   - Points the KaTeX stylesheet at the shared `/assets/katex` copy.
   - Gives every chapter, section and past question a **stable id**: `ch2`, `s2-5`, `q-s2-8`. Existing ids are never changed, so links stay valid.
   - Turns the book's Contents list into links.
   - Injects the shared site bar, stylesheets and scripts between `<!-- site:… -->` markers. Each run replaces those blocks, so they are never duplicated.
2. **Generates the portal pages** from `assets/data/courses.json` and `contributors.json`.
3. **Writes the search index** (`assets/data/search-index.json`, about 270 KB, much smaller gzipped). It holds every course, chapter (with its Contents keywords), section, sub-section and past question, each with a short snippet.

In the browser, `search.js` downloads the index the first time someone uses search, then searches it locally:
- Case- and accent-insensitive, and every typed word must match.
- Title matches rank above snippet matches.
- Spelling variants like "kmeans" still find "K-Means".

---

## Common tasks

### Fix or improve a solution

1. Edit the book, e.g. `term-4-1/MTE-4011/Set_A.html`.
2. Run `node scripts/build.js` so the search index picks up the change.
3. Preview with `node scripts/serve.js`, then commit the book **and** the regenerated files.

### Add a new course (e.g. Term 4-2)

1. Put the books at `term-4-2/MTE-42XX/Set_A.html` and `Set_B.html`. A `katex/katex.min.css` link inside them is rewritten automatically.
2. Add the course to the `term-4-2` entry in `assets/data/courses.json`:

   ```json
   {
     "code": "MTE 4201",
     "slug": "MTE-4201",
     "name": "Course Name",
     "sets": {
       "A": "One-line description of Set A",
       "B": "One-line description of Set B"
     }
   }
   ```

3. Run `node scripts/build.js`. It creates the course page and updates the homepage, term hub and search index.
4. Preview, commit and open a pull request.

### Add yourself to the Hall of Fame

Add an entry to `assets/data/contributors.json` and rebuild:

```json
{
  "name": "Your Name",
  "role": "Author",
  "batch": "2K20",
  "github": "your-github-username",
  "contributions": ["MTE 4011 · Set A"],
  "badges": ["Author"]
}
```

All fields are optional. If you'd rather not show your name, leave out `name` and add `"roll": "2131005"` instead, and the card shows "Roll 2131005". `github` can be a username, `@username` or a full profile URL.

---

## Book format

Books are self-contained HTML files with their styles inline and maths pre-rendered by KaTeX. For the build to recognise their structure, a book should have:

| Element | Used for |
|---|---|
| `<div class="cover">` with `.title` and `.part` | Cover page |
| `<div class="toc">` containing `.ch` (chapter) and `.sec` (keywords) entries | Clickable contents and chapter descriptions |
| `<h1>1. Chapter title</h1>`, `<h1>Appendix …</h1>` | Chapters, chapter menu, search |
| `<h2>1.2 Section title</h2>`, `<h3>…</h3>` | Sections and search |
| `<div class="q"><span class="src">2023 · Q1(a)</span>…<span class="mk">12</span><span class="topic">Topic: …</span></div>` | Past questions and search |
| `<span class="stars">★★<span class="off">★</span></span>` in a chapter heading | Importance shown on the course page |

The build prints a warning if the Contents list and chapter headings don't line up. Look at any existing book for a complete example.

---

## Deployment

The site is deployed on **[Vercel](https://vercel.com)** straight from this repository. There is no build step on Vercel: the committed files are served as they are.

1. Import the GitHub repository in Vercel.
2. **Framework preset:** Other. **Build command:** none. **Output directory:** the repository root.
3. Every push to `main` deploys automatically, and pull requests get preview deployments.

`vercel.json` turns on clean URLs (`/term-4-1/MTE-4011/Set_A`), long-term caching for the KaTeX fonts, and basic security headers. `.vercelignore` keeps `scripts/` and the project notes out of the deployment.

> Run `node scripts/build.js` and commit its output **before** pushing. Vercel does not run it for you.

---

## Contributing

Contributions of every size are welcome: a typo fix, a better explanation, a missing figure, or a whole new course.

1. **Fork** the repository and create a branch: `git checkout -b fix/mte4011-q3-2`.
2. Make your changes (see [Common tasks](#common-tasks)).
3. Run `node scripts/build.js` and check your change locally with `node scripts/serve.js`.
4. **Commit the regenerated files** along with your edits.
5. Open a **pull request** that describes what you changed and why. For solution fixes, cite the lecture, textbook or source you checked against.

### Guidelines

- **Accuracy first.** Show the working, keep units, and state the assumptions you make.
- **Match the existing style.** Use the book's existing classes (theory, formula, exam and tip boxes, `.q` blocks) rather than adding new inline styles.
- **Keep it dependency-free.** No frameworks, CDNs or tracking scripts. Plain HTML, CSS and vanilla JS only.
- **Don't edit generated files by hand.** Change `scripts/build.js` or the JSON data instead.
- **Only contribute content you have the right to share.** Write solutions in your own words. Don't paste copyrighted textbook pages or lecture slides.
- **Test on a phone-sized screen and in both themes** before submitting UI changes.

---

## Reporting a mistake

Found a wrong answer, a typo or a broken link? [Open an issue](https://github.com/shouptick005/2131005/issues/new) and include:

- the course and set (e.g. *MTE 4103 · Set A*);
- the section or question (the link from the search result is perfect);
- what is wrong and, if you know it, the correct answer with a source.

---

## Roadmap

- [x] Level 4 Term 1: 5 courses, 10 books
- [x] Site-wide search, light/dark mode, reader bar
- [ ] Hall of Fame with real contributors
- [ ] Level 4 Term 2 courses
- [ ] Earlier terms, if contributors are interested

---

## License

No license has been chosen yet. Until a `LICENSE` file is added, default copyright applies, so others can view the code and content but have no formal permission to reuse it.

A common choice for projects like this one:

- **Code** (`scripts/`, `assets/css`, `assets/js`): [MIT License](https://choosealicense.com/licenses/mit/)
- **Book content** (the solution books): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (free to share and adapt, with credit, under the same terms)

KaTeX is redistributed under its own [MIT License](https://github.com/KaTeX/KaTeX/blob/main/LICENSE).

---

## Acknowledgements

- The course teachers of the Department of Mechatronics Engineering, KUET, whose lectures these solutions follow.
- Everyone listed in the [Hall of Fame](https://github.com/shouptick005/2131005/blob/main/assets/data/contributors.json) for writing, checking and illustrating the books.
- [KaTeX](https://katex.org/) for fast, beautiful maths typesetting.
