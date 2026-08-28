import { MEDIA } from './media.js';

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;

/** Split a string into spans so it can be animated character by character. */
export const chars = (text) =>
  [...text]
    .map((c, i) =>
      c === ' ' ? '<span class="sp"></span>' : `<span style="--i:${i}">${esc(c)}</span>`
    )
    .join('');

/* ------------------------------------------------------------------ *
 * Media
 * ------------------------------------------------------------------ */
export const media = (key) => MEDIA[key] || null;

/** Responsive <img> for a manifest key. */
export function imgTag(key, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const m = MEDIA[key];
  if (!m) return '';
  const srcset = m.widths.map((w) => `${m.src}-${w}.webp ${w}w`).join(', ');
  const fallback = `${m.src}-${m.widths[m.widths.length - 1]}.webp`;
  return `<img class="${cls}" src="${fallback}" srcset="${srcset}" sizes="${sizes}"
    width="${m.w}" height="${m.h}" alt="${esc(m.alt)}"
    loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? 'fetchpriority="high"' : ''}>`;
}

/** Blur-up frame. `ratio` overrides the image's own aspect ratio. */
export function frame(key, { ratio, sizes = '100vw', eager = false, cls = '', contain = false } = {}) {
  const m = MEDIA[key];
  if (!m) return `<div class="frame" style="--ratio:${ratio || '3/4'}"></div>`;
  const r = ratio || `${m.w}/${m.h}`;
  // The blur-up placeholder is a cover-sized backdrop, so it only makes sense
  // when the image itself covers. Contained images sit on their plate colour.
  const bg = contain ? '' : `;background-image:url('${m.lqip}')`;
  return `<div class="frame${contain ? ' is-contain' : ''} ${cls}"
    style="--ratio:${r}${bg}">${imgTag(key, { sizes, eager })}</div>`;
}

/** Figure with an optional caption. */
export function figure(key, { caption, ...opts } = {}) {
  return `<figure class="fig">${frame(key, opts)}${
    caption ? `<figcaption>${esc(caption)}</figcaption>` : ''
  }</figure>`;
}

/** Fade each image in once it has actually decoded. */
export function watchImages(root = document) {
  $$('.frame img', root).forEach((el) => {
    if (el.complete && el.naturalWidth) return el.classList.add('is-loaded');
    el.addEventListener('load', () => el.classList.add('is-loaded'), { once: true });
    el.addEventListener('error', () => el.classList.add('is-loaded'), { once: true });
  });
}

/* ------------------------------------------------------------------ *
 * Reveal on scroll
 * ------------------------------------------------------------------ */
let revealObserver;
export function watchReveals(root = document) {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          revealObserver.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 }
    );
  }
  $$('.reveal, .rise', root).forEach((el) => {
    if (el.classList.contains('is-in')) return;
    revealObserver.observe(el);
  });
}

/* ------------------------------------------------------------------ *
 * Parallax (cheap: one rAF loop, transform only)
 * ------------------------------------------------------------------ */
const parallaxItems = new Set();
export function watchParallax(root = document) {
  if (reducedMotion()) return;
  $$('[data-parallax]', root).forEach((el) => {
    el.classList.add('parallax');
    parallaxItems.add(el);
  });
}
export function clearParallax() {
  parallaxItems.clear();
}
function parallaxTick() {
  const vh = innerHeight;
  parallaxItems.forEach((el) => {
    if (!el.isConnected) return parallaxItems.delete(el);
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const speed = parseFloat(el.dataset.parallax) || 0.12;
    const progress = (r.top + r.height / 2 - vh / 2) / vh;
    el.style.setProperty('--py', `${-progress * speed * 100}px`);
  });
}

/* ------------------------------------------------------------------ *
 * Custom cursor
 * ------------------------------------------------------------------ */
let cursorEl, cursorLabel, cx = 0, cy = 0, tx = 0, ty = 0, cursorReady = false;

export function initCursor() {
  if (isTouch() || reducedMotion()) return;
  cursorEl = document.createElement('div');
  cursorEl.id = 'cursor';
  cursorEl.innerHTML = '<span class="cursor-dot"></span><span class="cursor-label"></span>';
  document.body.appendChild(cursorEl);
  cursorLabel = $('.cursor-label', cursorEl);
  document.documentElement.classList.add('has-cursor');
  cursorReady = true;

  addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!cursorEl.classList.contains('is-on')) {
      cx = tx; cy = ty;
      cursorEl.classList.add('is-on');
    }
  }, { passive: true });

  addEventListener('pointerdown', () => cursorEl.classList.add('is-small'));
  addEventListener('pointerup', () => cursorEl.classList.remove('is-small'));
  addEventListener('mouseleave', () => cursorEl.classList.remove('is-on'));

  // Contextual label: nearest ancestor carrying data-cursor wins.
  document.addEventListener('pointerover', (e) => {
    const host = e.target.closest?.('[data-cursor]');
    setCursorLabel(host ? host.dataset.cursor : '');
  });
}

export function setCursorLabel(text) {
  if (!cursorReady) return;
  if (text) {
    cursorLabel.textContent = text;
    cursorEl.classList.add('has-label');
  } else {
    cursorEl.classList.remove('has-label');
  }
}
export function hideCursor(hide) {
  if (cursorReady) cursorEl.classList.toggle('is-hidden', !!hide);
}

function cursorTick() {
  if (!cursorReady) return;
  cx += (tx - cx) * 0.19;
  cy += (ty - cy) * 0.19;
  cursorEl.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
}

/* ------------------------------------------------------------------ *
 * One shared animation loop
 * ------------------------------------------------------------------ */
let looping = false;
export function startLoop() {
  if (looping) return;
  looping = true;
  const tick = () => {
    cursorTick();
    parallaxTick();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ *
 * Floating image "peek", used by the hero words and the About list
 * ------------------------------------------------------------------ */
export function attachPeek(triggers, { className = 'peek', getKey, rotate = true } = {}) {
  if (isTouch()) return () => {};
  // Clear any element left behind by a previous render of this view.
  $$(`.${className}`).forEach((n) => n.remove());
  const el = document.createElement('div');
  el.className = className;
  document.body.appendChild(el);
  let current = null;

  const move = (e) => {
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
  };

  triggers.forEach((t, i) => {
    t.addEventListener('pointerenter', (e) => {
      const key = getKey(t);
      if (!key || !MEDIA[key]) return;
      if (current !== key) {
        current = key;
        el.innerHTML = frame(key, { sizes: '20vw' });
        watchImages(el);
      }
      if (rotate) el.style.setProperty('--rot', `${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg`);
      move(e);
      el.classList.add('is-on');
    });
    t.addEventListener('pointerleave', () => el.classList.remove('is-on'));
    t.addEventListener('pointermove', move);
  });

  return () => el.remove();
}

/* ------------------------------------------------------------------ *
 * Drag-to-scroll for the horizontal galleries
 * ------------------------------------------------------------------ */
export function makeDraggable(track) {
  let down = false, startX = 0, startLeft = 0, moved = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // native scroll is better on touch
    down = true;
    moved = 0;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) {
      track.classList.add('is-dragging');
      moved = Math.abs(dx);
    }
    track.scrollLeft = startLeft - dx;
  });
  const end = () => {
    down = false;
    track.classList.remove('is-dragging');
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  track.addEventListener('click', (e) => {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */
const BASE_THEME = {
  bg: 'var(--ivory)', ink: 'var(--ink)', dim: 'var(--ink-2)',
  accent: 'var(--ink)', line: 'var(--line)',
};
/* Off a project page the identity serif carries the display moments. */
const BASE_TYPE = { display: 'var(--identity)', track: '0.055em', weight: 500, heading: 'var(--ui)' };

export function applyTheme(theme, type) {
  const t = theme || BASE_THEME;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg);
  r.setProperty('--fg', t.ink);
  r.setProperty('--dim', t.dim);
  r.setProperty('--accent', t.accent);
  r.setProperty('--rule', t.line);

  const y = { ...BASE_TYPE, ...(type || {}) };
  r.setProperty('--display', y.display);
  r.setProperty('--display-track', y.track);
  r.setProperty('--display-weight', String(y.weight));
  r.setProperty('--heading', y.heading || BASE_TYPE.heading);

  const meta = $('meta[name="theme-color"]');
  if (meta && t.bg.startsWith('#')) meta.content = t.bg;
}
