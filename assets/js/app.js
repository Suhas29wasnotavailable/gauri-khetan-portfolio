import { SITE, NAV, PROJECTS, bySlug } from './data.js';
import {
  $, $$, chars, esc, applyTheme, initCursor, startLoop, setCursorLabel, hideCursor,
  watchImages, watchReveals, watchParallax, clearParallax, reducedMotion,
} from './ui.js';
import * as V from './views.js';

/* ------------------------------------------------------------------ *
 * Routing
 *
 * Hash URLs (#/work/vanae) on purpose: the site then works identically
 * when dropped on any static host, inside a subfolder, or opened straight
 * off the desktop, with no server rewrite rules to configure.
 *
 * If you deploy to a domain root on Netlify or Vercel and would rather
 * have /work/vanae, set HASH_MODE to false. The _redirects and
 * vercel.json files in this folder already handle the rewrites.
 * ------------------------------------------------------------------ */
const HASH_MODE = true;
const BASE = (() => {
  const i = location.pathname.lastIndexOf('/index.html');
  return i > -1 ? location.pathname.slice(0, i) || '/' : '/';
})();

const toURL = (route) => {
  if (HASH_MODE) return `#${route}`;
  return (BASE === '/' ? '' : BASE) + (route === '/' ? '/' : route);
};

function currentRoute() {
  if (HASH_MODE) return location.hash.slice(1) || '/';
  let p = location.pathname;
  if (BASE !== '/' && p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
  return p.startsWith('/') ? p : `/${p}`;
}

function resolve(route) {
  if (route === '/') return V.home;
  if (route === '/work') return V.work;
  if (route.startsWith('/work/')) return V.project(route.slice(6)) || V.notFound;
  if (route === '/about') return V.about;
  if (route === '/playground') return V.playground;
  if (route === '/contact') return V.contact;
  return V.notFound;
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */
const main = $('#main');
const nav = $('#nav');
let cleanup = null;
let navigating = false;
let paintedRoute = null;
let queued = null;

function buildNav() {
  nav.innerHTML = `<div class="nav-inner">
    <a class="brand" href="${toURL('/')}" data-link aria-label="${esc(SITE.name)}, home">${chars('Gauri Khetan')}</a>
    <nav class="nav-links" aria-label="Main">
      ${NAV.map((n) => `<a class="nav-link" href="${toURL(n.href)}" data-link data-route="${n.href}">${esc(n.label)}</a>`).join('')}
    </nav>
  </div>`;

  // The one small nervous tic in the logo.
  const brand = $('.brand', nav);
  brand.addEventListener('pointerenter', () => {
    $$('span', brand).forEach((s) => {
      s.style.setProperty('--jitter', `${(Math.random() * 5 - 2.5).toFixed(1)}px`);
    });
  });
}

function markNav(route) {
  $$('.nav-link', nav).forEach((a) => {
    const r = a.dataset.route;
    const on = r === route || (r === '/work' && route.startsWith('/work'));
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* Rewrite every in-app href once the page is rendered. */
function fixLinks(root) {
  $$('a[data-link]', root).forEach((a) => {
    const raw = a.getAttribute('href');
    if (raw && raw.startsWith('/')) a.setAttribute('href', toURL(raw));
  });
}

function routeFromLink(a) {
  const href = a.getAttribute('href') || '';
  if (HASH_MODE) return href.startsWith('#') ? href.slice(1) : null;
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return null;
  let p = url.pathname;
  if (BASE !== '/' && p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\/+$/, '') || '/';
  return p.startsWith('/') ? p : `/${p}`;
}

/* ------------------------------------------------------------------ *
 * The door: a project cover expanding into its hero
 * ------------------------------------------------------------------ */
function openDoor(sourceMedia, project) {
  return new Promise((resolve) => {
    if (reducedMotion() || !sourceMedia) return resolve(null);
    const r = sourceMedia.getBoundingClientRect();

    const veil = document.createElement('div');
    veil.id = 'veil';
    veil.style.background = project.theme.bg;
    document.body.appendChild(veil);

    const door = document.createElement('div');
    door.id = 'door';
    door.style.cssText = `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px`;
    door.innerHTML = sourceMedia.innerHTML;
    // drop the hover-swap layer and the coming-soon flag from the clone
    $$('.alt, .wall-flag', door).forEach((n) => n.remove());
    document.body.appendChild(door);
    watchImages(door);

    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });

    const anim = door.animate(
      [
        { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` },
        { top: '0px', left: '0px', width: '100vw', height: '100vh' },
      ],
      { duration: 760, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
    );

    // Never let a stalled animation (backgrounded tab) block navigation.
    const done = () => resolve({ door, veil });
    anim.finished.then(done, done);
    setTimeout(done, 900);
  });
}

function closeDoor(parts) {
  if (!parts) return;
  const { door, veil } = parts;
  const fade = (el) => {
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' })
      .finished.then(() => el.remove(), () => el.remove());
    // Belt and braces: if the tab is backgrounded the animation never
    // resolves, and a stuck overlay would swallow every click.
    setTimeout(() => el.remove(), 900);
  };
  fade(door);
  fade(veil);
}

/* A short colour wash for ordinary navigation. */
function wash(colour) {
  return new Promise((done) => {
    if (reducedMotion()) return done();
    const veil = document.createElement('div');
    veil.id = 'veil';
    veil.style.background = colour;
    document.body.appendChild(veil);
    let fired = false;
    const out = () => {
      if (fired) return;
      fired = true;
      done();
      requestAnimationFrame(() => {
        veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' })
          .finished.then(() => veil.remove(), () => veil.remove());
        setTimeout(() => veil.remove(), 900);
      });
    };
    veil
      .animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
      .finished.then(out, out);
    setTimeout(out, 500);
  });
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */
function paint(view, route) {
  cleanup?.();
  clearParallax();
  paintedRoute = route;
  applyTheme(view.theme || null, view.type || null);

  document.title = view.title;
  $('meta[name="description"]').content = view.description || '';
  const canonical = $('link[rel="canonical"]');
  if (canonical) canonical.href = new URL(toURL(route), location.href).href;

  main.innerHTML = `<div class="page is-entering">${view.render()}</div>`;
  const page = $('.page', main);
  fixLinks(page);
  watchImages(page);
  watchReveals(page);
  watchParallax(page);
  markNav(route);
  cleanup = view.hydrate?.(page) || null;

  // Reveal anything already on screen right away.
  requestAnimationFrame(() => $$('.reveal, .rise', page).forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add('is-in');
  }));
}

async function go(route, { push = true, sourceMedia = null, replace = false } = {}) {
  // A second request mid-transition (fast clicks, held browser-back) is
  // remembered rather than dropped, so the URL and the view never disagree.
  if (navigating) {
    queued = { route, push, sourceMedia: null, replace };
    return;
  }
  const view = resolve(route);
  navigating = true;
  hideCursor(true);
  setCursorLabel('');

  const isProject = route.startsWith('/work/') && bySlug(route.slice(6));
  let doorParts = null;

  if (isProject && sourceMedia) {
    doorParts = await openDoor(sourceMedia, bySlug(route.slice(6)));
  } else {
    await wash(view.theme?.bg || getComputedStyle(document.documentElement).getPropertyValue('--bg'));
  }

  if (push) {
    const url = toURL(route);
    if (replace) history.replaceState({ route }, '', url);
    else history.pushState({ route }, '', url);
  }
  scrollTo(0, 0);
  paint(view, route);

  if (doorParts) {
    // Let the hero settle underneath, then dissolve the door away.
    await new Promise((r) => setTimeout(r, 90));
    closeDoor(doorParts);
  }
  hideCursor(false);
  navigating = false;

  if (queued) {
    const next = queued;
    queued = null;
    if (next.route !== paintedRoute) go(next.route, next);
  }
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  const route = routeFromLink(a);
  if (route === null) return;
  e.preventDefault();
  if (route === currentRoute()) return scrollTo({ top: 0, behavior: 'smooth' });
  const item = a.closest('.wall-item');
  go(route, { sourceMedia: item ? $('.wall-media', item) : null });
});

addEventListener('popstate', () => {
  const r = currentRoute();
  if (r !== paintedRoute) go(r, { push: false });
});

/* Nav hides on scroll down, returns on scroll up. */
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('is-stuck', y > 24);
  nav.classList.toggle('is-hidden', y > 220 && y > lastY && !navigating);
  lastY = y;
}, { passive: true });

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
function bootLoader() {
  const loader = $('#loader');
  if (!loader) return Promise.resolve();
  if (reducedMotion()) { loader.remove(); return Promise.resolve(); }
  $('.loader-name', loader).innerHTML = chars('Gauri Khetan');
  const count = $('.loader-count', loader);
  let n = 0;
  const iv = setInterval(() => {
    n = Math.min(100, n + Math.ceil(Math.random() * 11));
    count.textContent = String(n).padStart(3, '0');
    if (n >= 100) clearInterval(iv);
  }, 55);

  return new Promise((done) => {
    const finish = () => {
      clearInterval(iv);
      count.textContent = '100';
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 1000);
      done();
    };
    // Long enough to feel deliberate, short enough not to annoy.
    setTimeout(finish, 1150);
    loader.addEventListener('click', finish, { once: true });
  });
}

buildNav();
initCursor();
startLoop();
paint(resolve(currentRoute()), currentRoute());
history.replaceState({ route: currentRoute() }, '', toURL(currentRoute()));
bootLoader();

// Warm the first project's cover so the door has something to show.
const first = PROJECTS[0];
if (first?.cover) {
  const img = new Image();
  img.src = `assets/img/${first.cover}-1440.webp`;
}
