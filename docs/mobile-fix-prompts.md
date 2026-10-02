# Mobile fixes — one prompt per fix

Paste each prompt into a fresh Sonnet 5.5 session opened in `D:\mte_solution_book_website_ws`.
Each prompt is self-contained. Suggested order: 1 → 2 → 3 → 4 → 5 → 6 → 7
(fix 1 removes most of the sideways scrolling, so fix 3 is easier to judge after it).

Measured at a 375px-wide viewport before any fix:

| Book | Page width | Cause |
|---|---|---|
| MTE-4103/Set_A | 382px | long `.ans` answer box, long inline math |
| MTE-4107/Set_A | 449px | `.cols` side-by-side tables (Ziegler–Nichols) |
| MTE-4107/Set_B | 394px | long inline math `w=(0.565, 0.262, …)` |
| all 10 books | — | ~870px empty cover, 14px body text, justified text |

---

## Fix 1 — Stack `.cols` blocks on phones

```text
Project: a static site of 10 HTML "solution books" at term-4-1/MTE-xxxx/Set_A.html and Set_B.html
(repo root D:\mte_solution_book_website_ws). Each book has its own inline <style> written for A4
printing, including a `@media screen and (max-width:820px)` block. Right after </style>, the build
(scripts/build.js) injects a `<!-- site:head -->` block that links /assets/css/main.css and then
/assets/css/book-theme.css, so book-theme.css loads AFTER the inline styles and wins at equal specificity.

Problem: the books use `<div class="cols">` (24 times across the 10 books) to put two blocks side by
side. The inline CSS is `.cols{display:flex;gap:10pt}.cols>div{flex:1}` and nothing stacks them on
small screens. At 375px wide, MTE-4107/Set_A.html becomes 449px wide (the Ziegler–Nichols tables in a
.cols block), so the whole page scrolls sideways.

Task: in assets/css/book-theme.css, add a `@media screen and (max-width: 820px)` rule that stacks
.cols children vertically (full width, keeping a vertical gap). Tables inside them must still be able
to scroll horizontally on their own (the inline CSS already makes tables `display:block;overflow-x:auto`
on screens ≤820px) — make sure a flex child doesn't stop that, e.g. with `min-width: 0`.

Rules:
- Do NOT edit the book HTML files or scripts/build.js. CSS only, in book-theme.css.
- Must not change desktop (>820px) or print output (@media print).
- Match the existing style of book-theme.css (comments, spacing).

Verify: run `node scripts/serve.js` (http://localhost:3000), open every book at 375px width, and for
each check `document.documentElement.scrollWidth <= document.documentElement.clientWidth` in the
console. Report the before/after width for each book. Look at the .cols blocks in MTE-4107/Set_A
visually. Don't commit; show me the diff.
```

---

## Fix 2 — Remove the empty space around the cover

```text
Project: a static site of 10 HTML "solution books" at term-4-1/MTE-xxxx/Set_A.html and Set_B.html
(repo root D:\mte_solution_book_website_ws). Each book has its own inline <style> written for A4
printing. After </style>, the build injects links to /assets/css/main.css then
/assets/css/book-theme.css, so book-theme.css loads AFTER the inline styles and wins at equal specificity.

Problem: each book starts with a cover (`<section class="cover">` in some books, `<div class="cover">`
in others). The inline CSS sizes it like an A4 page:
  .cover{height:262mm;display:flex;flex-direction:column;justify-content:center;...}
  @media screen{ .cover{height:auto;min-height:230mm} }
230mm is ~870px, so on a phone the title floats in the middle of a mostly blank screen — the reader
sees ~300px of empty space under the top bar before anything appears.

Task: in assets/css/book-theme.css, inside `@media screen and (max-width: 820px)`, remove the forced
height (min-height: auto) and give the cover modest vertical padding so it reads as a compact title
block. The cover also contains a row of topic chips — check they wrap neatly. If the cover's big
title (e.g. "MTE 4103") or subtitle box is too large for 375px, scale it down a little too.

Rules:
- Do NOT edit the book HTML files or scripts/build.js. CSS only, in book-theme.css.
- Must not change desktop (>820px) or print (@media print — the cover must still fill page 1 when printed).

Verify: `node scripts/serve.js`, open at least MTE-4103/Set_A, MTE-4011/Set_A and MTE-4107/Set_B at
375px and 320px wide and screenshot the top of each. Also check one book at desktop width and in
print preview is unchanged. Don't commit; show me the diff.
```

---

## Fix 3 — Stop long answers and inline equations running off the screen

```text
Project: a static site of 10 HTML "solution books" at term-4-1/MTE-xxxx/Set_A.html and Set_B.html
(repo root D:\mte_solution_book_website_ws). Math is pre-rendered KaTeX HTML. Each book has its own
inline <style> written for A4 printing; after </style> the build injects links to /assets/css/main.css
then /assets/css/book-theme.css, so book-theme.css loads AFTER the inline styles.

Problem: at 375px wide some pages are wider than the screen and scroll sideways:
- MTE-4103/Set_A (382px): a highlighted answer `<span class="ans">rxy(k)={1.500, 3.005, 3.335, …}</span>`.
  Inline CSS: `.ans{display:inline-block;border:1.2pt solid var(--exam-b);background:#fff;padding:1pt 7pt;...}`
  — inline-block can't wrap across lines.
- MTE-4107/Set_B (394px): a long inline equation `w=(0.565,0.262,0.118,0.055)`.
- Display equations (.katex-display) already scroll inside their own box; that's fine.

Task: in assets/css/book-theme.css, inside `@media screen and (max-width: 820px)`:
1. Let .ans boxes fit the screen: either make them wrap (e.g. display:inline with
   box-decoration-break: clone so each line keeps its border) or cap them at max-width:100% with their
   own horizontal scroll. Pick whichever looks better; long answers must stay readable.
2. Keep long inline KaTeX (.katex not inside .katex-display) from widening the page. KaTeX can only
   break between its `.base` spans, so for expressions that still don't fit, contain them
   (max-width:100% + overflow-x:auto) without breaking vertical alignment with the surrounding text.
   Test that superscripts/fractions aren't clipped vertically.

Measuring tip: ignore `.katex-mathml` elements (KaTeX's hidden MathML copy) and SVG `path`s inside
KaTeX stretchy elements — they report huge widths but are clipped and never visible. Judge by
`document.documentElement.scrollWidth` vs `clientWidth`.

Rules:
- Do NOT edit the book HTML files or scripts/build.js. CSS only (book-theme.css).
- Must not change desktop (>820px) or print.

Verify: `node scripts/serve.js`, open all 10 books at 375px and 320px width; for each report
documentElement.scrollWidth vs clientWidth (all must be equal). Screenshot the rxy(k) answer in
MTE-4103/Set_A and the w=(…) equation in MTE-4107/Set_B. Don't commit; show me the diff.
```

---

## Fix 4 — Bigger text on phones

```text
Project: a static site of 10 HTML "solution books" at term-4-1/MTE-xxxx/Set_A.html and Set_B.html
(repo root D:\mte_solution_book_website_ws). Math is pre-rendered KaTeX HTML (sized in em, so it
scales with the surrounding font-size). Each book has its own inline <style> written for A4 printing;
after </style> the build injects links to /assets/css/main.css then /assets/css/book-theme.css, so
book-theme.css loads AFTER the inline styles.

Problem: the inline CSS uses print sizes: body `font-size:10.5pt` (14px), tables `font-size:9.6pt`
(12.8px), and small notes (.small etc.) around 12–13px. That's small for reading long derivations
on a phone; 16px body is the usual mobile minimum.

Task: in assets/css/book-theme.css, inside `@media screen and (max-width: 820px)`, raise body text to
about 16px (15px if 16px causes more equations to overflow — measure), tables to ~14px, and small
notes to ~13.5px. Headings are sized in pt independently — check the h1/h2/h3 hierarchy still looks
right next to the bigger body text and adjust if needed. Keep line-height comfortable (~1.55).

Because KaTeX scales with font-size, bigger text makes equations wider. After the change, check that
no book becomes wider than the screen (document.documentElement.scrollWidth must equal clientWidth).

Rules:
- Do NOT edit the book HTML files or scripts/build.js. CSS only (book-theme.css).
- Must not change desktop (>820px) or print.

Verify: `node scripts/serve.js`, open all 10 books at 375px; report scrollWidth vs clientWidth per book
and send screenshots of a text-heavy section, a table, and an equation-heavy section. Don't commit;
show me the diff.
```

---

## Fix 5 — Left-align paragraphs on phones

```text
Project: a static site of 10 HTML "solution books" at term-4-1/MTE-xxxx/Set_A.html and Set_B.html
(repo root D:\mte_solution_book_website_ws). Each book has its own inline <style> written for A4
printing; after </style> the build injects links to /assets/css/main.css then
/assets/css/book-theme.css, so book-theme.css loads AFTER the inline styles.

Problem: the inline CSS sets `p{text-align:justify}`. On a ~340px-wide text column, justified text
leaves big gaps between words ("rivers"), especially next to inline equations that can't be split.

Task: in assets/css/book-theme.css, inside `@media screen and (max-width: 820px)`, make paragraphs
(and any other justified text you find in the books' inline CSS) `text-align: left`. Don't turn on
automatic hyphenation — the text is full of technical terms and variable names. Leave text that is
deliberately centred (cover, "— End of Solution Book —" lines with inline text-align:center) alone.

Rules:
- Do NOT edit the book HTML files or scripts/build.js. CSS only (book-theme.css).
- Must not change desktop (>820px) or print (print stays justified).

Verify: `node scripts/serve.js`, open two books at 375px and screenshot a long paragraph before/after.
Confirm the cover and centred lines are still centred. Don't commit; show me the diff.
```

---

## Fix 6 — Larger tap targets in the top bar

```text
Project: a static site (repo root D:\mte_solution_book_website_ws). Every page — the portal pages and
the 10 solution books in term-4-1/ — has a fixed top bar (<header class="site-bar">) styled in
assets/css/main.css. The bar height is `--bar-h: 52px`. Mobile styles live in the
`@media (max-width: 720px)` block near the end of main.css (there is also a `max-width: 380px` block).

Problem: at 375px wide the controls are smaller than the ~44px recommended for a finger:
- `.set-switch a` (Set A / Set B): ~49×30px  (padding 5px 8px on mobile)
- `.chap-menu summary` ("Chapters"): ~30px tall
- `.icon-btn` (search toggle, dark-mode toggle): 34×34px
- `.brand` link ("MTE"): ~30×20px
- `.bar-nav a` (e.g. "Hall of Fame" on the portal): ~30px tall

Task: in the mobile media block(s) of assets/css/main.css, make each of these at least ~44px tall
(and icon buttons ~44×44) so they're easy to tap, without making them look heavy — the bar should
still look the same style. A taller hit area with the same visual size is fine (e.g. padding or a
transparent ::before). Everything must still fit on one line at 320px wide, including on a book page,
which has the most controls (brand, Set A/B switch, Chapters, search, theme toggle). The Chapters
dropdown (.chap-menu ol) and search results panel must still open in the right place.

Rules:
- CSS only; don't change the HTML the build generates (scripts/build.js) unless there's no CSS way.
- Desktop (>720px) and print must be unchanged.

Verify: `node scripts/serve.js`; at 375px and 320px check the home page, hall-of-fame, a course page
(term-4-1/MTE-4103/) and a book (term-4-1/MTE-4103/Set_A). Measure each control with
getBoundingClientRect() and report the sizes, open the Chapters menu and the search box, and send
screenshots. Don't commit; show me the diff.
```

---

## Fix 7 — Show that wide tables and equations can be swiped

```text
Project: a static site of 10 HTML "solution books" at term-4-1/MTE-xxxx/Set_A.html and Set_B.html
(repo root D:\mte_solution_book_website_ws). Math is pre-rendered KaTeX HTML. Each book has its own
inline <style> written for A4 printing, whose `@media screen and (max-width:820px)` block already makes
`table{display:block;overflow-x:auto}` and `.katex-display{overflow-x:auto;overflow-y:hidden}`.
After </style> the build injects links to /assets/css/main.css then /assets/css/book-theme.css, and
the books load /assets/js/main.js.

Problem: on a phone, wide tables and long display equations are cut off at the right edge and scroll
sideways, but nothing tells the reader there is more to swipe — it just looks truncated. Many tables
have coloured header cells/rows, so a background-based "scroll shadow" on the table itself would be
hidden behind the cells.

Task: add a subtle edge fade/shadow on the side(s) where a table or .katex-display has more content,
on screens ≤820px only. It should disappear when scrolled to that end and not appear at all when
the content fits. Prefer a CSS-only solution if it works with the coloured cells; otherwise add a
small, dependency-free script to assets/js/main.js (e.g. toggling classes on scroll/resize, using a
ResizeObserver) plus CSS in assets/css/book-theme.css. Keep it light — some books have 100+ such
elements. The book "paper" stays light in dark mode, so the shadow colour should suit a white page.

Rules:
- Do NOT edit the book HTML files or scripts/build.js; any wrapping must be done at runtime by JS.
- Must not change desktop (>820px) or print.
- Match the existing code style in main.js and book-theme.css.

Verify: `node scripts/serve.js`, open MTE-4103/Set_A and MTE-4107/Set_B at 375px; screenshot a wide
table and a long display equation at the start, middle and end of their scroll, plus one that fits
(no shadow). Check the browser console for errors. Don't commit; show me the diff.
```

---

## After all seven

```text
In D:\mte_solution_book_website_ws, run `node scripts/serve.js` and check all 10 books in
term-4-1/*/Set_*.html plus the portal pages at 320px, 375px, 768px and desktop width, in light and
dark mode. For each book report document.documentElement.scrollWidth vs clientWidth at 320px and
375px (they must match). Open the print preview of one book and confirm it still looks like the A4
original. List anything that looks broken, with screenshots. Don't change anything yet.
```
