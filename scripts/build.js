#!/usr/bin/env node
/*
 * Builds the static portal. Zero dependencies; run with `node scripts/build.js`.
 *
 * 1. Processes every term-x-y/MTE-xxxx/Set_X.html book (in place, idempotent):
 *    - points KaTeX at the shared /assets/katex copy
 *    - gives every chapter, section and past question a stable id
 *    - makes the book's Contents list clickable
 *    - injects the shared site bar, styles and scripts
 * 2. Generates the portal pages (home, term hubs, course pages, search,
 *    Hall of Fame, 404) from assets/data/courses.json and contributors.json.
 * 3. Writes assets/data/search-index.json.
 *
 * Portal pages are build output: edit this script or the JSON data, not the HTML.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const config = readJson(path.join(DATA_DIR, 'courses.json'));
const contributors = (readJson(path.join(DATA_DIR, 'contributors.json')).contributors) || [];
const SITE = config.site;

/* ---------------------------------------------------------------- helpers */

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', times: '×', middot: '·',
  deg: '°', plusmn: '±', minus: '−', rarr: '→', larr: '←', le: '≤', ge: '≥', micro: 'µ',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Index just past the element that opens at `start`, counting nested tags of the same name. */
function matchClose(html, start, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0) return re.lastIndex;
    } else {
      depth++;
    }
  }
  return html.length;
}

/** Replaces each element matched by `openRe` (a span/div opener) with fn(elementHtml). */
function replaceElements(html, openRe, tag, fn) {
  const re = new RegExp(openRe.source, 'g');
  let out = '';
  let pos = 0;
  let m;
  while ((m = re.exec(html))) {
    const end = matchClose(html, m.index, tag);
    out += html.slice(pos, m.index) + fn(html.slice(m.index, end));
    pos = end;
    re.lastIndex = end;
  }
  return out + html.slice(pos);
}

/** Pre-rendered KaTeX → its TeX source, so search text stays readable. */
function katexToTex(html) {
  return replaceElements(html, /<span class="katex(?:-display)?">/, 'span', (el) => {
    const ann = /<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/.exec(el);
    return ann ? ` ${ann[1]} ` : ' ';
  });
}

function removeClassSpans(html, cls) {
  return replaceElements(html, new RegExp(`<span class="${cls}">`), 'span', () => ' ');
}

function toText(html) {
  let s = html
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ');
  s = removeClassSpans(s, 'stars');
  s = katexToTex(s);
  s = s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ');
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

function clip(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

function slugify(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'section';
}

function starCount(html) {
  const m = /<span class="stars">([^<]*)/.exec(html);
  return m ? (m[1].match(/★/g) || []).length : 0;
}

function stars(n) {
  if (!n) return '';
  return `<span class="stars" aria-label="Importance ${n} of 3">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;
}

/* ------------------------------------------------------------------ icons */

const ICON = {
  search: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  sun: '<svg class="i-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  moon: '<svg class="i-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  github: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>',
};

const FAVICON = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#5b3fa0"/><path d="M8 23V9h3l5 7 5-7h3v14h-3v-9l-5 7-5-7v9z" fill="#fff"/></svg>'
);

/* -------------------------------------------------------------- shared UI */

function searchBox(extraClass = '', placeholder = 'Search chapters, topics, past questions…') {
  return `<div class="search ${extraClass}" role="search">
      <form class="search-form" action="/search" method="get" autocomplete="off">
        <span class="search-icon">${ICON.search}</span>
        <input class="search-input" type="search" name="q" placeholder="${placeholder}" aria-label="Search all solution books" spellcheck="false" aria-autocomplete="list" aria-expanded="false">
        <kbd class="search-kbd" aria-hidden="true">/</kbd>
        <div class="search-results" role="listbox" hidden></div>
      </form>
    </div>`;
}

function themeButton() {
  return `<button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="Toggle dark mode" title="Toggle dark mode">${ICON.sun}${ICON.moon}</button>`;
}

function siteBar({ book } = {}) {
  let middle;
  if (book) {
    const { term, course, set, chapters } = book;
    const base = `/${term.id}/${course.slug}`;
    const setLinks = Object.keys(course.sets).map((s) =>
      `<a href="${base}/Set_${s}"${s === set ? ' aria-current="page"' : ''}>Set ${s}</a>`).join('');
    const chapterLinks = chapters.map((c) =>
      `<li><a href="#${c.id}">${esc(c.title)}</a></li>`).join('');
    middle = `<nav class="crumbs" aria-label="Breadcrumb">
      <a href="/${term.id}">${esc(term.short)}</a><span class="sep">/</span><a href="${base}">${esc(course.code)}</a>
    </nav>
    <div class="set-switch" role="group" aria-label="Book set">${setLinks}</div>
    <details class="chap-menu">
      <summary>Chapters ${ICON.chevron}</summary>
      <ol>${chapterLinks}</ol>
    </details>`;
  } else {
    const termLinks = config.terms.map((t) => `<a href="/${t.id}">${esc(t.short)}</a>`).join('');
    middle = `<nav class="bar-nav" aria-label="Site">${termLinks}<a href="/hall-of-fame">Hall of Fame</a></nav>`;
  }
  return `<header class="site-bar${book ? ' is-book' : ''}">
  <div class="bar-inner">
    <a class="brand" href="/"><span class="brand-mark">MTE</span><span class="brand-full">Solution Books</span></a>
    ${middle}
    <div class="bar-spacer"></div>
    <button class="icon-btn search-toggle" type="button" data-search-open aria-label="Search">${ICON.search}</button>
    ${searchBox('search--bar', 'Search all books…')}
    ${themeButton()}
  </div>${book ? '\n  <div class="read-progress" aria-hidden="true"><span></span></div>' : ''}
</header>`;
}

function toTop() {
  return `<a class="to-top" href="#top" aria-label="Back to top">${ICON.up}</a>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap footer-inner">
    <span>${esc(SITE.department)} · KUET</span>
    <nav aria-label="Footer"><a href="/search">Search</a><a href="/hall-of-fame">Hall of Fame</a></nav>
  </div>
</footer>`;
}

/** `banner` is an optional comment for the top of the file (it must not contain two hyphens in a row). */
function page({ title, description, body, bodyClass = '', banner = '' }) {
  const fullTitle = title ? `${title} · ${SITE.name}` : `${SITE.name} · KUET Mechatronics Engineering`;
  return `<!doctype html>
${banner ? `<!--\n${banner}\n-->\n` : ''}<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="/assets/css/main.css">
<script src="/assets/js/theme-toggle.js"></script>
<script src="/assets/js/search.js" defer></script>
<script src="/assets/js/main.js" defer></script>
</head>
<body class="portal ${bodyClass}" id="top">
${siteBar()}
<main class="wrap">
${body}
</main>
${footer()}
</body>
</html>
`;
}

/* ---------------------------------------------------------- book handling */

const HEAD_START = '<!-- site:head -->';
const HEAD_END = '<!-- /site:head -->';
const BAR_START = '<!-- site:bar -->';
const BAR_END = '<!-- /site:bar -->';
const FOOT_START = '<!-- site:foot -->';
const FOOT_END = '<!-- /site:foot -->';

/**
 * Removes a block exactly as it was injected: marker to marker plus the one `\n` injected with it
 * (`before` or `after`). The book's own line breaks, CRLF included, must never be touched.
 */
function stripBlock(html, start, end, { before = '', after = '' } = {}) {
  const re = new RegExp(`${before}${start}[\\s\\S]*?${end}${after}`, 'g');
  return html.replace(re, '');
}

function processBook(term, course, set) {
  const rel = `${term.id}/${course.slug}/Set_${set}.html`;
  const file = path.join(ROOT, rel);
  let html = fs.readFileSync(file, 'utf8');

  html = stripBlock(html, HEAD_START, HEAD_END, { after: '\\n' });
  html = stripBlock(html, BAR_START, BAR_END, { before: '\\n' });
  html = stripBlock(html, FOOT_START, FOOT_END, { after: '\\n' });
  html = html.replace(/href="(?:\.\.\/)*katex\/katex\.min\.css"/, 'href="/assets/katex/katex.min.css"');

  const used = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) used.add(m[1]);
  const unique = (base) => {
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  };

  // Contents entries (chapter title + keyword line), used for linking and chapter snippets.
  const toc = [];
  for (const m of html.matchAll(/<div class="ch">([\s\S]*?)<\/div>\s*(?:<div class="sec">([\s\S]*?)<\/div>)?/g)) {
    toc.push({ keywords: m[2] ? toText(m[2]) : '' });
  }

  const cover = {
    title: (/<div class="title">([\s\S]*?)<\/div>/.exec(html) || [])[1],
    part: (/<div class="part">([\s\S]*?)<\/div>/.exec(html) || [])[1],
  };

  const chapters = [];  // every h1, for the in-book chapter menu
  const items = [];     // search entries
  let chapter = null;
  let section = null;

  const re = /<h([1-3])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>|<div class="q"((?:\s[^>]*)?)>/g;
  html = html.replace(re, (m, level, attrs, inner, qAttrs, offset, str) => {
    if (level) {
      const n = Number(level);
      const text = toText(inner);
      const existing = /\bid="([^"]+)"/.exec(attrs || '');
      let id = existing && existing[1];
      if (!id) {
        let base;
        const num = /^((?:[A-Z]|\d+)(?:\.\d+)*)\.?\s/.exec(text);
        if (n === 1 && /^\d+\.\s/.test(text)) base = `ch${text.match(/^\d+/)[0]}`;
        else if (n === 1 && /^appendix/i.test(text)) base = 'appendix';
        else if (n > 1 && num && num[1].includes('.')) base = `s${num[1].toLowerCase().replace(/\./g, '-')}`;
        else base = slugify(text);
        id = unique(base);
      }
      const after = str.slice(offset + m.length, offset + m.length + 6000).split(/<h[1-3][\s>]/)[0];

      if (n === 1) {
        chapter = {
          id, title: text, stars: starCount(inner),
          numbered: /^\d+\./.test(text) || /^appendix/i.test(text),
          sections: 0, questions: 0,
        };
        chapters.push(chapter);
        section = null;
        items.push({ type: 'c', id, title: text, chapter });
      } else if (!/^contents$/i.test(text)) {
        section = { id, title: text };
        if (chapter) chapter.sections += n === 2 ? 1 : 0;
        const lead = ['src', 'mk', 'topic', 'lt'].reduce((h, cls) => removeClassSpans(h, cls), after);
        items.push({ type: n === 2 ? 's' : 'u', id, title: text, snippet: clip(toText(lead), 150), chapter });
      }
      const newAttrs = existing ? attrs : `${attrs || ''} id="${id}"`;
      return `<h${n}${newAttrs}>${inner}</h${n}>`;
    }

    // Past question box
    const existing = /\bid="([^"]+)"/.exec(qAttrs || '');
    const id = existing ? existing[1] : unique(`q-${section ? section.id : 'x'}`);
    const end = matchClose(str, offset, 'div');
    const block = str.slice(offset, end);
    const src = toText((/<span class="src">([\s\S]*?)<\/span>/.exec(block) || [])[1] || '');
    const topic = toText((/<span class="topic">([\s\S]*?)<\/span>/.exec(block) || [])[1] || '').replace(/^topic:\s*/i, '');
    let body = block.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    for (const cls of ['src', 'mk', 'topic']) body = removeClassSpans(body, cls);
    if (chapter) chapter.questions++;
    items.push({ type: 'q', id, title: clip(toText(body), 220), snippet: topic, src, chapter });
    return existing ? m : `<div class="q"${qAttrs || ''} id="${id}">`;
  });

  // Link the Contents list to the chapters it lists.
  const listed = chapters.filter((c) => c.numbered);
  if (toc.length !== listed.length) {
    console.warn(`  ! ${rel}: ${toc.length} contents entries vs ${listed.length} chapters; linking by order`);
  }
  let k = 0;
  html = html.replace(/<div class="ch">([\s\S]*?)<\/div>/g, (m, inner) => {
    const target = listed[k++];
    if (!target || /^\s*<a\s/.test(inner)) return m;
    return `<div class="ch"><a href="#${target.id}">${inner}</a></div>`;
  });
  listed.forEach((c, i) => { c.keywords = toc[i] ? toc[i].keywords : ''; });
  for (const it of items) if (it.type === 'c') it.snippet = clip(it.chapter.keywords || '', 160);

  // Shared chrome.
  const head = `${HEAD_START}
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/book-theme.css">
<script src="/assets/js/theme-toggle.js"></script>
<script src="/assets/js/search.js" defer></script>
<script src="/assets/js/main.js" defer></script>
${HEAD_END}
`;
  html = html.replace(/<\/head>/, `${head}</head>`);
  const bar = siteBar({ book: { term, course, set, chapters } });
  html = html.replace(/<body([^>]*)>/, (m, a) => {
    const attrs = /\bid=/.test(a) ? a : `${a} id="top"`;
    return `<body${attrs}>\n${BAR_START}\n${bar}\n${BAR_END}`;
  });
  html = html.replace(/<\/body>/, `${FOOT_START}\n${toTop()}\n${FOOT_END}\n</body>`);

  fs.writeFileSync(file, html);

  const questions = items.filter((i) => i.type === 'q').length;
  const sections = items.filter((i) => i.type === 's').length;
  console.log(`  ${rel}: ${listed.length} chapters, ${sections} sections, ${questions} questions`);
  return { term, course, set, url: `/${term.id}/${course.slug}/Set_${set}`, chapters, items, cover, questions, sections };
}

/* ------------------------------------------------------------ portal pages */

function courseCard(term, course, books) {
  const sets = Object.keys(course.sets).map((s) => {
    const b = books.find((x) => x.set === s);
    const meta = b ? `${b.chapters.filter((c) => c.numbered).length} chapters · ${b.questions} past questions` : '';
    return `<a class="set-link" href="/${term.id}/${course.slug}/Set_${s}">
          <span class="set-name">Set ${s}</span>
          <span class="set-desc">${esc(course.sets[s])}</span>
          <span class="set-meta">${meta}</span>
        </a>`;
  }).join('\n        ');
  return `<article class="course-card">
      <a class="course-head" href="/${term.id}/${course.slug}">
        <span class="course-code">${esc(course.code)}</span>
        <span class="course-name">${esc(course.name)}</span>
      </a>
      <div class="set-links">
        ${sets}
      </div>
    </article>`;
}

function termSection(term, booksByCourse, { heading = 'h2', link = true } = {}) {
  const n = term.courses.length;
  const title = link ? `<a href="/${term.id}">${esc(term.label)}</a>` : esc(term.label);
  if (!n) {
    return `<section class="term" id="${term.id}">
  <div class="term-head"><${heading}>${title}</${heading}><span class="muted">Coming soon</span></div>
  <div class="empty-card">Solution books for ${esc(term.label)} courses will be added here over the coming months.</div>
</section>`;
  }
  const cards = term.courses.map((c) => courseCard(term, c, booksByCourse[c.slug] || [])).join('\n    ');
  return `<section class="term" id="${term.id}">
  <div class="term-head"><${heading}>${title}</${heading}><span class="muted">${n} courses · ${n * 2} books</span></div>
  <div class="course-grid">
    ${cards}
  </div>
</section>`;
}

function crumbs(list) {
  return `<nav class="page-crumbs" aria-label="Breadcrumb">${list.map(([href, label]) =>
    href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`).join('<span class="sep">/</span>')}</nav>`;
}

function homePage(booksByCourse) {
  const totalBooks = Object.values(booksByCourse).reduce((a, b) => a + b.length, 0);
  const totalQ = Object.values(booksByCourse).flat().reduce((a, b) => a + b.questions, 0);
  const body = `<section class="hero">
  <h1>MTE Solution Books</h1>
  <p class="lede">Solved past questions with full theory for ${esc(SITE.university)}, ${esc(SITE.department)}.</p>
  ${searchBox('search--hero')}
  <p class="hero-stats muted">${totalBooks} books · ${totalQ} solved past questions</p>
</section>
${config.terms.map((t) => termSection(t, booksByCourse)).join('\n')}`;
  return page({
    title: '',
    description: `Solution books for KUET Mechatronics Engineering (MTE) courses: ${totalBooks} books, ${totalQ} solved past questions.`,
    body,
    bodyClass: 'home',
  });
}

function termPage(term, booksByCourse) {
  const body = `${crumbs([['/', 'Home'], [null, term.short]])}
${termSection(term, booksByCourse, { heading: 'h1', link: false })}`;
  return page({
    title: term.label,
    description: `${term.label} solution books for KUET Mechatronics Engineering.`,
    body,
  });
}

function coursePage(term, course, books) {
  const panels = Object.keys(course.sets).map((s) => {
    const b = books.find((x) => x.set === s);
    const url = `/${term.id}/${course.slug}/Set_${s}`;
    const list = b ? b.chapters.filter((c) => c.numbered).map((c) => `<li>
          <a href="${url}#${c.id}">${esc(c.title)}</a>${stars(c.stars)}
          ${c.keywords ? `<span class="chapter-kw">${esc(clip(c.keywords, 180))}</span>` : ''}
        </li>`).join('\n        ') : '';
    return `<section class="set-panel">
      <div class="set-panel-head">
        <h2>Set ${s}</h2>
        <a class="btn" href="${url}">Open Set ${s}</a>
      </div>
      <p class="muted">${esc(course.sets[s])}</p>
      ${b ? `<p class="set-stats">${b.chapters.filter((c) => c.numbered).length} chapters · ${b.sections} sections · ${b.questions} past questions</p>` : ''}
      <ol class="chapter-list">
        ${list}
      </ol>
    </section>`;
  }).join('\n    ');
  const body = `${crumbs([['/', 'Home'], [`/${term.id}`, term.short], [null, course.code]])}
<header class="page-head">
  <span class="course-code">${esc(course.code)}</span>
  <h1>${esc(course.name)}</h1>
  <p class="muted">${esc(term.label)} · ★ marks how often a chapter appears in past exams</p>
</header>
<div class="set-panels">
    ${panels}
</div>`;
  return page({
    title: `${course.code} ${course.name}`,
    description: `${course.code} ${course.name} solution books (Set A and Set B), KUET Mechatronics Engineering.`,
    body,
  });
}

function searchPage() {
  const body = `<header class="page-head">
  <h1>Search</h1>
  <p class="muted">Search every chapter, section and past question across all solution books.</p>
</header>
<form class="search-page-form" action="/search" method="get" data-search-page>
  <div class="search-page-row">
    <input class="field" type="search" name="q" placeholder="e.g. gradient descent, PID tuning, 2023 Q3" aria-label="Search" autofocus spellcheck="false">
    <button class="btn" type="submit">Search</button>
  </div>
  <div class="filters">
    <label>Term <select class="field" name="term"><option value="">All</option></select></label>
    <label>Course <select class="field" name="course"><option value="">All</option></select></label>
    <label>Set <select class="field" name="set"><option value="">All</option><option value="A">Set A</option><option value="B">Set B</option></select></label>
  </div>
</form>
<p class="search-summary muted" aria-live="polite"></p>
<div class="search-page-results"></div>
<noscript><p>Search needs JavaScript enabled.</p></noscript>`;
  return page({ title: 'Search', description: 'Search all MTE solution books.', body });
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/** Accepts a GitHub username, @username or profile URL. */
function githubUser(value) {
  const v = String(value || '').trim();
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)/i.exec(v);
  return m ? m[1] : v.replace(/^@/, '');
}

/**
 * One card per entry in contributors.json; every field is optional.
 * No `name` shows "Roll <roll>" instead, and a card without badges, contributions or `github` omits that part.
 */
function hallOfFamePage() {
  const cards = contributors.map((c, i) => {
    const roll = c.roll || c.Roll || '';
    const name = c.name || (roll ? `Roll ${roll}` : 'Anonymous');
    const ghUser = githubUser(c.github);
    const badges = (c.badges || []).map((b) => `<span class="badge">${esc(b)}</span>`).join('');
    const work = (c.contributions || []).map((w) => `<li>${esc(w)}</li>`).join('');
    const gh = ghUser
      ? `<a class="gh" href="https://github.com/${encodeURIComponent(ghUser)}" rel="noopener">${ICON.github}${esc(ghUser)}</a>`
      : '';
    const avatar = c.name ? initials(c.name) : (ghUser ? ghUser[0].toUpperCase() : '#');
    const details = [c.role, c.batch, c.name && roll ? `Roll ${roll}` : ''].filter(Boolean).join(' · ');
    return `<!-- Contributor ${i + 1} of ${contributors.length} -->
  <article class="person">
      <div class="avatar" aria-hidden="true">${esc(avatar)}</div>
      <div class="person-body">
        <h2>${esc(name)}</h2>
        <p class="muted">${esc(details)}</p>
        ${badges ? `<div class="badges">${badges}</div>` : ''}
        ${work ? `<ul class="work">${work}</ul>` : ''}
        ${gh}
      </div>
    </article>`;
  }).join('\n  ');
  const banner = `  hall-of-fame.html (served at /hall-of-fame)
  GENERATED by scripts/build.js (hallOfFamePage) from assets/data/contributors.json.
  Do not edit by hand: the next build overwrites this file. To add or change a card,
  edit contributors.json and run: node scripts/build.js`;
  const body = `<!-- Page title and intro -->
<header class="page-head">
  <h1>Hall of Fame</h1>
  <p class="muted">The people who wrote, checked and illustrated these solution books.</p>
</header>
${contributors.length ? `<!-- Contributor cards: one per entry in contributors.json, in file order.
     Each card: avatar (initials) | name | role, batch, roll | badges | contributions | GitHub link.
     A card without a name shows "Roll <roll>"; empty badges, contributions and GitHub parts are left out. -->
<div class="people">\n  ${cards}\n</div>` : '<!-- No contributors yet -->\n<div class="empty-card">Contributors will be listed here.</div>'}
<!-- Call to action for new contributors (static text) -->
<section class="contribute">
  <h2>Want to contribute?</h2>
  <p>Found a mistake or want to add solutions for a new course? Contact the maintainers or open a pull request on GitHub.</p>
</section>`;
  return page({ title: 'Hall of Fame', description: 'Contributors to the MTE solution books.', body, banner });
}

function notFoundPage() {
  const body = `<section class="hero">
  <h1>Page not found</h1>
  <p class="lede">The page you are looking for does not exist or has moved.</p>
  ${searchBox('search--hero')}
  <p><a href="/">Back to all courses</a></p>
</section>`;
  return page({ title: 'Not found', description: 'Page not found.', body });
}

/* -------------------------------------------------------------- search index */

function buildIndex(books) {
  const docs = [];
  const courses = [];
  const items = [];
  for (const term of config.terms) {
    for (const course of term.courses) {
      courses.push({ term: term.short, code: course.code, name: course.name, url: `/${term.id}/${course.slug}` });
    }
  }
  for (const b of books) {
    const d = docs.length;
    const chapterIdx = new Map(b.chapters.map((c, i) => [c, i]));
    docs.push({
      term: b.term.short,
      code: b.course.code,
      name: b.course.name,
      set: b.set,
      url: b.url,
      ch: b.chapters.map((c) => c.title),
    });
    for (const it of b.items) {
      const row = [d, it.type, it.id, it.title, it.snippet || '', it.chapter ? chapterIdx.get(it.chapter) : -1];
      if (it.type === 'q') row.push(it.src || '');
      items.push(row);
    }
  }
  return { v: 1, built: new Date().toISOString().slice(0, 10), courses, docs, items };
}

/* --------------------------------------------------------------------- main */

function main() {
  console.log('Processing books…');
  const books = [];
  const booksByCourse = {};
  for (const term of config.terms) {
    for (const course of term.courses) {
      booksByCourse[course.slug] = [];
      for (const set of Object.keys(course.sets)) {
        const rel = `${term.id}/${course.slug}/Set_${set}.html`;
        if (!fs.existsSync(path.join(ROOT, rel))) {
          console.warn(`  ! missing ${rel}`);
          continue;
        }
        const b = processBook(term, course, set);
        books.push(b);
        booksByCourse[course.slug].push(b);
      }
    }
  }

  console.log('Writing portal pages…');
  write('index.html', homePage(booksByCourse));
  for (const term of config.terms) {
    write(`${term.id}/index.html`, termPage(term, booksByCourse));
    for (const course of term.courses) {
      write(`${term.id}/${course.slug}/index.html`, coursePage(term, course, booksByCourse[course.slug]));
    }
  }
  write('search.html', searchPage());
  write('hall-of-fame.html', hallOfFamePage());
  write('404.html', notFoundPage());

  const index = buildIndex(books);
  write('assets/data/search-index.json', JSON.stringify(index));
  const kb = (fs.statSync(path.join(DATA_DIR, 'search-index.json')).size / 1024).toFixed(0);
  console.log(`Search index: ${index.items.length} entries (${kb} KB)`);
  console.log('Done.');
}

main();
