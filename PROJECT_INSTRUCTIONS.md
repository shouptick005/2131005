# KUET Mechatronics Engineering — Solution Book Web Portal

## Project Vision & Hosting Architecture
This project transforms static HTML solution books for **KUET Mechatronics Engineering (MTE)** courses into a simple, fast, and unified web platform.

- **Design Philosophy:** Simplistic and minimal. Content first, no decoration (see *Design Guidelines*).
- **Theme Support:** Light & Dark Mode toggle with persistent `localStorage` memory and OS preference detection (`prefers-color-scheme`).
- **Search:** Site-wide search across all courses, books, chapters, sections and past questions (see *Search*).
- **Version Control:** GitHub
- **Deployment Platform:** Vercel (automatic static deployment via Git integration, no build step)
- **Current Scope:** Level 4 Term 1 (4-1) Solution Books (5 Courses, 10 Books)
- **12-Month Scope:** Level 4 Term 2 (4-2) Solution Books added incrementally

---

## Workspace Directory Architecture

```text
mte_solution_book_website_ws/
├── PROJECT_INSTRUCTIONS.md        # Core instructions for Claude Code
├── vercel.json                    # Clean URLs, caching & security headers
├── .vercelignore                  # Keeps scripts/ and docs out of the deployment
├── .gitignore                     # Git ignore rules
├── index.html                     # [generated] Main Portal Homepage (with search)
├── search.html                    # [generated] Full search results page
├── hall-of-fame.html              # [generated] Top Contributors & Hall of Fame
├── 404.html                       # [generated] Not-found page (served by Vercel)
├── assets/
│   ├── katex/                     # Single shared copy of KaTeX (CSS + fonts; math is pre-rendered)
│   ├── css/
│   │   ├── main.css               # Tokens, light/dark themes, site bar, search, portal pages, Hall of Fame
│   │   └── book-theme.css         # Loaded only inside books: bar offset, dark surround, TOC links
│   ├── js/
│   │   ├── theme-toggle.js        # Light/Dark mode switcher logic (runs in <head>, no flash)
│   │   ├── main.js                # Reading progress, chapter menu, back-to-top, anchor fix
│   │   └── search.js              # Client-side search (dropdown + /search page)
│   └── data/
│       ├── courses.json           # SOURCE: terms, courses and Set A/B descriptions
│       ├── contributors.json      # SOURCE: Hall of Fame data
│       └── search-index.json      # [generated] Search index (committed to Git)
│
├── docs/
│   ├── architecture.png           # Architecture diagram used in README
│   └── architecture.html          # Diagram source; re-render command is in its header comment
│
├── scripts/
│   ├── build.js                   # Node, zero dependencies: processes books, generates pages + index
│   └── serve.js                   # Local preview server that mimics Vercel clean URLs
│
├── term-4-1/                      # Level 4 Term 1 Solutions
│   ├── index.html                 # [generated] 4-1 Term Hub
│   ├── MTE-4011/
│   │   ├── index.html             # [generated] Course overview (chapters of both sets)
│   │   ├── Set_A.html             # SOURCE book (build.js adds ids, bar and links in place)
│   │   └── Set_B.html
│   ├── MTE-4033/
│   ├── MTE-4101/
│   ├── MTE-4103/
│   └── MTE-4107/
│
└── term-4-2/                      # Level 4 Term 2 Solutions (Future Expansion)
    ├── index.html                 # [generated] Coming Soon until courses are added
    └── ...
```

- **SOURCE** files are edited by hand. **[generated]** files are overwritten by `node scripts/build.js`; change the script or the JSON data instead of editing them.
- All site links use root-absolute clean URLs (`/term-4-1/MTE-4011/Set_A`), so pages must be served from a web server (Vercel or `scripts/serve.js`), not opened as `file://`.

---

## Design Guidelines (Simplistic Theme)

- **Minimal:** plain backgrounds, no textures, gradients, heavy shadows or decorative imagery.
- **Typography:** one clean sans-serif system font stack for UI and headings; the books keep their existing body font. Generous line height and whitespace.
- **Colour:** neutral greys plus a single accent colour, used sparingly (links, active states, focus rings).
- **Layout:** simple centred content column; course and book lists as plain cards or lists with thin borders.
- **Navigation:** a thin top bar on every page — site name, breadcrumbs (4-1 / Course), Set A | Set B switch, Chapters menu, search, theme toggle.
- **Inside the books:** keep the original content and diagrams untouched; only add the reader bar, clickable TOC and shared KaTeX link. In dark mode, the book page itself stays light (paper-like) so the inline SVG diagrams and coloured boxes render as drawn; only the surrounding chrome goes dark.
- **Responsive:** must work on phones (≤ 400px wide) with no horizontal page scroll.
- **Print:** reader bar and site chrome hidden when printing; books still print cleanly on A4.
- **Performance:** no frameworks, no external CDNs required; plain HTML, CSS and vanilla JS.

---

## Search

- **Scope:** courses, chapters (with their Contents keywords), section and sub-section headings, and every past-question box (`div.q`) including its year/question label (e.g. "2023 · Q5(c)").
- **How it works:**
  1. `scripts/build.js` reads every `Set_*.html`, gives each chapter, section and past question a stable `id` (`ch2`, `s2-5`, `q-s2-8`), and writes `assets/data/search-index.json`.
  2. `assets/js/search.js` loads the index on first use and searches it in the browser: case- and accent-insensitive, all typed words must match, title matches rank above snippet matches, and "kmeans" also finds "K-Means".
  3. Results link directly to the section: `/term-4-1/MTE-4011/Set_A#s2-5`.
- **UI:**
  - Search box in the top bar on every page (icon on phones); `/` or `Ctrl+K` focuses it.
  - Live dropdown of top results while typing, keyboard navigable (↑ ↓ Enter, Esc to close).
  - `/search?q=...` shows the full result list grouped by course, with term, course and Set A / Set B filters.

---

## Workflow

```bash
node scripts/build.js        # after any change to a book, courses.json or contributors.json
node scripts/serve.js 3000   # preview at http://localhost:3000
```

Commit the regenerated files; Vercel deploys the repository as-is (no build step).

---

## Adding a New Course (e.g. Term 4-2)

1. Copy the books to `term-4-2/MTE-42XX/Set_A.html` and `Set_B.html`. Their KaTeX link (`katex/katex.min.css`) is rewritten to the shared copy automatically.
2. Add the course to the `term-4-2` entry in `assets/data/courses.json` (code, slug, name, one-line description per set).
3. Run `node scripts/build.js`. It adds the reader bar, ids and Contents links to the books, creates the course page, updates the homepage, term hub and search index.
4. Preview, then commit and push.

Books are expected to follow the current format: a `.cover` block, a `.toc` Contents list of `.ch`/`.sec` entries, numbered `<h1>` chapters (`1. …`), numbered `<h2>` sections (`1.2 …`) and `div.q` past-question boxes. The build prints a warning if the Contents list and chapter headings don't line up.
