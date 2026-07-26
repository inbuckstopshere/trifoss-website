/**
 * Trifoss build script.
 *
 * Fetches approved Events/News from the Apps Script Web App (see
 * BUILD_ENDPOINT_URL / BUILD_ENDPOINT_KEY below), generates a static HTML
 * page for each item that doesn't have one yet, saves its image, and
 * regenerates the homepage's Events/News/Gallery blocks plus the Past
 * Events and News Archive pages.
 *
 * Already-generated event/article pages are left untouched — this only
 * adds new ones and refreshes the listing pages around them.
 *
 * Requires Node 18+ (uses the global fetch API). No npm dependencies.
 *
 * Env vars (set as GitHub Actions secrets — see README.md):
 *   BUILD_ENDPOINT_URL — the deployed Apps Script Web App URL
 *   BUILD_ENDPOINT_KEY — the shared-secret query key it checks
 *
 * If either is unset, the script logs a message and exits cleanly rather
 * than failing the build — this is what keeps a manual "Run workflow"
 * safe to click before the Web App/secrets are set up.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://inbuckstopshere.github.io/trifoss-website';
const RECENT_DAYS_ON_HOMEPAGE = 14; // "Recently held" window, per Architecture.md
const NEWS_ON_HOMEPAGE = 6;
const GALLERY_ITEMS = 8;

async function main() {
  const endpointUrl = process.env.BUILD_ENDPOINT_URL;
  const endpointKey = process.env.BUILD_ENDPOINT_KEY;

  if (!endpointUrl || !endpointKey) {
    console.log('BUILD_ENDPOINT_URL/BUILD_ENDPOINT_KEY not set — nothing to do yet.');
    return;
  }

  const data = await fetchApprovedContent(endpointUrl, endpointKey);

  let events = (data.events || []).map(withComputedEventFields);
  let news = (data.news || []).map(withComputedNewsFields);

  events.forEach((e) => { e.imagePath = saveImage('events', e); });
  news.forEach((n) => { n.imagePath = saveImage('news', n); });

  events.sort(byDateAsc);
  news.sort(byDateDesc);

  const newEvents = events.filter((e) => !pageExists('events', e.id));
  const newNews = news.filter((n) => !pageExists('news', n.id));

  newEvents.forEach(writeEventPage);
  newNews.forEach(writeNewsPage);

  updateHomepage(events, news);
  updatePastEventsArchive(events);
  updateNewsArchive(news);

  console.log(
    `Build complete: ${newEvents.length} new event page(s), ${newNews.length} new news page(s), ` +
    `${events.length} total event(s), ${news.length} total article(s).`
  );
}

async function fetchApprovedContent(endpointUrl, endpointKey) {
  const url = endpointUrl + (endpointUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(endpointKey);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Build data fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`Build data endpoint returned an error: ${data.error}`);
  }
  return data;
}

// ---------- data shaping ----------

function withComputedEventFields(e) {
  const dateObj = parseDateOnly(e.date);
  const today = startOfToday();
  const daysDiff = Math.round((today - dateObj) / 86400000);
  let badge = '';
  if (daysDiff === 0) badge = 'Happening today';
  else if (daysDiff > 0 && daysDiff <= RECENT_DAYS_ON_HOMEPAGE) badge = 'Recently held';
  return { ...e, type: 'events', dateObj, daysDiff, badge };
}

function withComputedNewsFields(n) {
  return { ...n, type: 'news', dateObj: parseDateOnly(n.date) };
}

function parseDateOnly(value) {
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function byDateAsc(a, b) { return a.dateObj - b.dateObj; }
function byDateDesc(a, b) { return b.dateObj - a.dateObj; }

function formatDisplayDate(dateObj) {
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------- file helpers ----------

function pageExists(type, id) {
  return fs.existsSync(path.join(ROOT, type, `${id}.html`));
}

function saveImage(type, item) {
  if (!item.image || !item.image.base64) return null;

  const ext = extensionForMimeType(item.image.mimeType);
  const relPath = `assets/images/${type}/${item.id}.${ext}`;
  const fullPath = path.join(ROOT, relPath);

  if (fs.existsSync(fullPath)) return relPath; // already saved, don't rewrite

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, Buffer.from(item.image.base64, 'base64'));
  return relPath;
}

function extensionForMimeType(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceBetweenMarkers(html, name, replacement) {
  const start = `<!-- BUILD:${name}:START -->`;
  const end = `<!-- BUILD:${name}:END -->`;
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    console.warn(`Markers for ${name} not found — skipping that block.`);
    return html;
  }
  return html.slice(0, startIdx + start.length) + '\n' + replacement + '\n        ' + html.slice(endIdx);
}

function placeholderNotice(text) {
  return `<p style="grid-column: 1 / -1; text-align: center; color: var(--ink-soft);">${escapeHtml(text)}</p>`;
}

// ---------- shared page chrome (for individual Event/News pages) ----------

function pageHead(title, description, ogImagePath) {
  const ogImage = ogImagePath ? `\n<meta property="og:image" content="${SITE_URL}/${ogImagePath}">` : '';
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — Trifoss</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">${ogImage}
<link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/styles.css">`;
}

function pageHeaderAndNav(homeAnchor, homeLinkLabel) {
  return `<header class="site-header">
  <div class="wrap nav-inner">
    <a class="brand" href="../index.html">
      <img src="../assets/images/logo.svg" alt="Trifoss emblem">
      <span>Trifoss</span>
    </a>
    <nav class="primary-nav" aria-label="Primary">
      <a href="../index.html">Home</a>
      <a href="../index.html${homeAnchor}">${escapeHtml(homeLinkLabel)}</a>
    </nav>
  </div>
</header>`;
}

function pageFooter() {
  return `<footer class="site-footer">
  <div class="wrap footer-bottom">
    &copy; <span id="year"></span> Trifoss. All rights reserved.
  </div>
</footer>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>`;
}

// ---------- individual Event page ----------

function writeEventPage(e) {
  const description = (e.description || '').slice(0, 160);
  const relatedLink = e.relatedNewsLink
    ? `<p><a href="${escapeHtml(e.relatedNewsLink)}">Read the recap &rarr;</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${pageHead(e.title, description, e.imagePath)}
</head>
<body>
${pageHeaderAndNav('#events', 'Upcoming events')}
<main>
  <section>
    <div class="wrap" style="max-width: 780px;">
      <span class="eyebrow">Event${e.badge ? ' · ' + escapeHtml(e.badge) : ''}</span>
      <h1>${escapeHtml(e.title)}</h1>
      <p class="tile-meta">${escapeHtml(formatDisplayDate(e.dateObj))}${e.time ? ' · ' + escapeHtml(e.time) : ''} · ${escapeHtml(e.location)}</p>
      ${e.imagePath ? `<img src="../${e.imagePath}" alt="${escapeHtml(e.title)}" style="width:100%;border-radius:12px;margin:20px 0;">` : ''}
      <p>${escapeHtml(e.description)}</p>
      ${e.submitterName ? `<p class="tile-meta">Submitted by ${escapeHtml(e.submitterName)}</p>` : ''}
      ${relatedLink}
      <p><a href="../index.html#events">&larr; Back to Events</a></p>
    </div>
  </section>
</main>
${pageFooter()}
</body>
</html>
`;

  fs.mkdirSync(path.join(ROOT, 'events'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'events', `${e.id}.html`), html);
}

// ---------- individual News page ----------

function writeNewsPage(n) {
  const description = (n.body || '').slice(0, 160);
  const relatedLink = n.relatedEventLink
    ? `<p><a href="${escapeHtml(n.relatedEventLink)}">Related event &rarr;</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${pageHead(n.title, description, n.imagePath)}
</head>
<body>
${pageHeaderAndNav('#news', 'Latest news & stories')}
<main>
  <section>
    <div class="wrap" style="max-width: 780px;">
      <span class="eyebrow">${escapeHtml(n.category)} · ${escapeHtml(formatDisplayDate(n.dateObj))}</span>
      <h1>${escapeHtml(n.title)}</h1>
      ${n.author ? `<p class="tile-meta">By ${escapeHtml(n.author)}</p>` : ''}
      ${n.imagePath ? `<img src="../${n.imagePath}" alt="${escapeHtml(n.title)}" style="width:100%;border-radius:12px;margin:20px 0;">` : ''}
      <p>${escapeHtml(n.body)}</p>
      ${relatedLink}
      <p><a href="../index.html#news">&larr; Back to News &amp; Blogs</a></p>
    </div>
  </section>
</main>
${pageFooter()}
</body>
</html>
`;

  fs.mkdirSync(path.join(ROOT, 'news'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'news', `${n.id}.html`), html);
}

// ---------- tile rendering (homepage + archive listings) ----------

function eventTile(e, depthPrefix) {
  depthPrefix = depthPrefix || '';
  const imageBlock = e.imagePath
    ? `<img src="${depthPrefix}${e.imagePath}" alt="${escapeHtml(e.title)}" style="width:100%;height:100%;object-fit:cover;">`
    : (e.badge || 'Event image');
  return `<article class="tile">
          <div class="tile-image">${imageBlock}</div>
          <div class="tile-body">
            <span class="tile-meta">${e.badge ? escapeHtml(e.badge) + ' · ' : ''}${escapeHtml(formatDisplayDate(e.dateObj))} · ${escapeHtml(e.location)}</span>
            <h3><a href="${depthPrefix}events/${e.id}.html">${escapeHtml(e.title)}</a></h3>
            <p>${escapeHtml((e.description || '').slice(0, 120))}</p>
          </div>
        </article>`;
}

function newsTile(n, depthPrefix) {
  depthPrefix = depthPrefix || '';
  const imageBlock = n.imagePath
    ? `<img src="${depthPrefix}${n.imagePath}" alt="${escapeHtml(n.title)}" style="width:100%;height:100%;object-fit:cover;">`
    : escapeHtml(n.category);
  return `<article class="tile">
          <div class="tile-image">${imageBlock}</div>
          <div class="tile-body">
            <span class="tile-meta">${escapeHtml(n.category)} · ${escapeHtml(formatDisplayDate(n.dateObj))}</span>
            <h3><a href="${depthPrefix}news/${n.id}.html">${escapeHtml(n.title)}</a></h3>
            <p>${escapeHtml((n.body || '').slice(0, 120))}</p>
          </div>
        </article>`;
}

function galleryTile(x) {
  return `<a class="gallery-tile lightbox-trigger" href="${x.type}/${x.id}.html" data-caption="${escapeHtml(x.title)}" style="display:block;background-image:url('${x.imagePath}');background-size:cover;background-position:center;"></a>`;
}

// ---------- homepage ----------

function updateHomepage(events, news) {
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const upcomingAndRecent = events.filter((e) => e.daysDiff <= RECENT_DAYS_ON_HOMEPAGE);
  const eventsHtml = upcomingAndRecent.length
    ? upcomingAndRecent.map((e) => eventTile(e, '')).join('\n        ')
    : placeholderNotice('No upcoming events yet — check back soon.');

  const recentNews = news.slice(0, NEWS_ON_HOMEPAGE);
  const newsHtml = recentNews.length
    ? recentNews.map((n) => newsTile(n, '')).join('\n        ')
    : placeholderNotice('No stories published yet — check back soon.');

  const galleryItems = events.concat(news).filter((x) => x.imagePath).slice(0, GALLERY_ITEMS);
  const galleryHtml = galleryItems.length
    ? galleryItems.map(galleryTile).join('\n        ')
    : null;

  html = replaceBetweenMarkers(html, 'EVENTS', eventsHtml);
  html = replaceBetweenMarkers(html, 'NEWS', newsHtml);
  if (galleryHtml) html = replaceBetweenMarkers(html, 'GALLERY', galleryHtml);

  fs.writeFileSync(indexPath, html);
}

// ---------- archive pages (fully regenerated each run) ----------

function archivePageTemplate(opts) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.title)} — Trifoss</title>
<meta name="description" content="${escapeHtml(opts.intro)}">
<link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/styles.css">
</head>
<body>

<header class="site-header">
  <div class="wrap nav-inner">
    <a class="brand" href="../index.html">
      <img src="../assets/images/logo.svg" alt="Trifoss emblem">
      <span>Trifoss</span>
    </a>
    <nav class="primary-nav" aria-label="Primary">
      <a href="../index.html">Home</a>
      <a href="../index.html${opts.homeAnchor}">${escapeHtml(opts.homeLinkLabel)}</a>
    </nav>
  </div>
</header>

<main>
  <section>
    <div class="wrap">
      <div class="section-head">
        <span class="eyebrow">${escapeHtml(opts.eyebrow)}</span>
        <h1>${escapeHtml(opts.h1)}</h1>
        <p>${escapeHtml(opts.intro)}</p>
      </div>

      <div class="card-grid">
        ${opts.tilesHtml}
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap footer-bottom">
    &copy; <span id="year"></span> Trifoss. All rights reserved.
  </div>
</footer>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>
`;
}

function updatePastEventsArchive(events) {
  const pastEvents = events.filter((e) => e.daysDiff > RECENT_DAYS_ON_HOMEPAGE).sort(byDateDesc);
  const tilesHtml = pastEvents.length
    ? pastEvents.map((e) => eventTile(e, '../')).join('\n        ')
    : placeholderNotice('No past events yet.');

  const html = archivePageTemplate({
    title: 'Past Events',
    eyebrow: 'Events',
    h1: 'Past events',
    intro: "Events move here automatically once they're more than ~2 weeks past their date. Each event's own page keeps working at its original link.",
    tilesHtml,
    homeAnchor: '#events',
    homeLinkLabel: 'Upcoming events'
  });

  fs.mkdirSync(path.join(ROOT, 'events'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'events', 'past-events.html'), html);
}

function updateNewsArchive(news) {
  const tilesHtml = news.length
    ? news.map((n) => newsTile(n, '../')).join('\n        ')
    : placeholderNotice('No articles published yet.');

  const html = archivePageTemplate({
    title: 'News Archive',
    eyebrow: 'News & Blogs',
    h1: 'News Archive',
    intro: 'Every approved article ever published, in one place. Unlike Events, articles never expire or get removed by date — this page exists for volume, not lifecycle.',
    tilesHtml,
    homeAnchor: '#news',
    homeLinkLabel: 'Latest news & stories'
  });

  fs.mkdirSync(path.join(ROOT, 'news'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'news', 'archive.html'), html);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
