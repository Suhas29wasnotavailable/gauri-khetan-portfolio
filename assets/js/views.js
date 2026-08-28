import { SITE, NAV, HOME, ABOUT, PLAYGROUND, CONTACT, PROJECTS, bySlug } from './data.js';
import { $, $$, esc, frame, figure, media, chars, attachPeek, watchImages, makeDraggable } from './ui.js';
import { renderBlocks, hydrateBlocks } from './blocks.js';

const nextOf = (slug) => {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  return PROJECTS[(i + 1) % PROJECTS.length];
};

/* A project's cover: either a photograph or its colour plate. */
export function coverHTML(p, { sizes = '80vw', eager = false, alt = false, word = true } = {}) {
  if (p.cover) {
    const contain = p.coverFit === 'contain';
    const main = frame(p.cover, { sizes, eager, contain });
    const swap = alt && p.hover ? frame(p.hover, { sizes, cls: 'alt', contain }) : '';
    return main + swap;
  }
  const kind = p.slug === 'electra' ? 'electra' : 'kali';
  return `<div class="plate ${kind}" style="--pbg:${p.theme.bg};--pink:${p.theme.ink};--pacc:${p.theme.accent}">
      ${word ? `<p class="plate-word">${esc(p.subtitle)}</p>` : ''}
    </div>`;
}

/* ------------------------------------------------------------------ *
 * Footer, shared across every page
 * ------------------------------------------------------------------ */
const CURIOSITY = ['curiosity', 'stubbornness', 'too many tabs open', 'a very specific colour', 'one more version'];

function footer() {
  return `<footer class="footer">
    <div class="wrap">
      <div class="footer-top">
        <div class="footer-brand">
          <p class="h3">${esc(SITE.name)}</p>
          <p class="meta">${esc(SITE.role)}</p>
          <p class="meta" style="margin-top:.4rem">${esc(SITE.place)}</p>
        </div>
        <nav class="footer-nav meta">
          ${NAV.map((n) => `<a class="u" href="${n.href}" data-link>${esc(n.label.toUpperCase())}</a>`).join('')}
        </nav>
        <div class="footer-reach meta">
          <a class="u" href="mailto:${SITE.email}">${esc(SITE.email)}</a>
          <a class="u" href="${SITE.instagramUrl}" target="_blank" rel="noopener">@${esc(SITE.instagram)}</a>
          <a class="u" href="tel:${SITE.phone.replace(/\s/g, '')}">${esc(SITE.phone)}</a>
        </div>
      </div>
      <div class="footer-bottom meta">
        <span>© ${SITE.year} ${esc(SITE.name)}</span>
        <span>Made with <span class="curiosity" data-cursor="Hi"><em>curiosity</em></span>.</span>
        <a class="footer-credit" href="${SITE.credit.url}" target="_blank" rel="noopener"
           data-cursor="LinkedIn"
           aria-label="${esc(SITE.credit.label)}. Opens LinkedIn in a new tab.">
          <span class="credit-dot" aria-hidden="true"></span>
          <span class="credit-text" aria-hidden="true">${esc(SITE.credit.label)}</span>
          <span class="credit-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </footer>`;
}

function hydrateFooter(root) {
  const el = $('.curiosity', root);
  if (!el) return;
  let i = 0;
  el.addEventListener('pointerenter', () => {
    i = (i + 1) % CURIOSITY.length;
    el.innerHTML = `<em>${esc(CURIOSITY[i])}</em>`;
  });
}

/* ------------------------------------------------------------------ *
 * Exhibition wall, shared by Home and Work
 * ------------------------------------------------------------------ */
function wall() {
  return `<div class="wall">
    ${PROJECTS.map((p) => {
      const soon = p.status === 'soon';
      return `<a class="wall-item reveal" data-slug="${p.slug}" href="/work/${p.slug}" data-link
          data-cursor="${soon ? 'Peek' : 'Open'}" aria-label="${esc(p.title)}. ${esc(p.disciplines)}">
        <div class="wall-media${p.coverPad ? ' has-pad' : ''}" style="--ratio:${p.tile.ratio}${
          p.coverBg ? `;background:${p.coverBg}` : ''
        }${p.coverPad ? `;--pad:${p.coverPad}` : ''}">
          ${soon ? '<span class="wall-flag">Coming soon</span>' : ''}
          ${coverHTML(p, { sizes: '(max-width: 900px) 92vw, 70vw', alt: true })}
        </div>
        <div class="wall-meta">
          <span class="wall-num">${p.num}</span>
          <h2 class="wall-title">${esc(p.title)}</h2>
          <span class="wall-disc">${esc(p.disciplines)}</span>
          <span class="wall-tag">${esc(soon ? p.teaser + ' Coming soon →' : p.tagline)}</span>
        </div>
      </a>`;
    }).join('')}
  </div>`;
}

/* ------------------------------------------------------------------ *
 * HOME
 * ------------------------------------------------------------------ */
export const home = {
  title: `${SITE.name} · ${SITE.role}`,
  description: HOME.hero.line.replace(/<[^>]+>/g, ''),
  render() {
    return `
    <section class="hero wrap">
      <div class="hero-top">
        <h1 class="hero-name display rise"><span>Gauri Khetan</span></h1>
      </div>
      <div class="hero-role reveal" style="--delay:280ms">
        <p class="meta">${esc(SITE.role)}</p>
        <p class="meta">${esc(SITE.place)}</p>
      </div>
      <p class="hero-line reveal" style="--delay:380ms">${HOME.hero.line}</p>
      <p class="hero-cue meta">${esc(HOME.hero.cue)} <span class="bar"></span></p>
    </section>

    <section class="section wrap">
      <div class="intro">
        <p class="kicker reveal">${esc(HOME.intro.kicker)}</p>
        <h2 class="h2 reveal">${esc(HOME.intro.title)}</h2>
        <p class="body-copy reveal" style="--delay:110ms">${esc(HOME.intro.body)}</p>
      </div>
    </section>

    <div class="marquee" aria-hidden="true">
      ${[0, 1]
        .map(
          () =>
            `<div class="marquee-track">${HOME.intro.marquee.map((w) => `<span>${esc(w)}</span>`).join('')}</div>`
        )
        .join('')}
    </div>

    <section class="section wrap" id="work">
      <p class="kicker reveal" style="margin-bottom:clamp(2rem,5vw,4rem)">Selected work</p>
      ${wall()}
    </section>

    <section class="section wrap">
      <p class="serif-statement reveal" style="max-width:22ch">${esc(HOME.closing)}</p>
    </section>

    ${footer()}`;
  },
  hydrate(root) {
    hydrateFooter(root);
    const words = $$('.hero-line b', root);
    return attachPeek(words, { getKey: (el) => el.dataset.peek });
  },
};

/* ------------------------------------------------------------------ *
 * WORK
 * ------------------------------------------------------------------ */
export const work = {
  title: `Work · ${SITE.name}`,
  description: 'A collection of things I have designed, developed, experimented with and occasionally overthought.',
  render() {
    return `
    <header class="page-head wrap">
      <h1 class="h1 rise"><span>Selected work</span></h1>
      <p class="lede reveal" style="--delay:120ms">A collection of things I've designed, developed, experimented with and occasionally overthought.</p>
    </header>
    <section class="section wrap">${wall()}</section>
    ${footer()}`;
  },
  hydrate: hydrateFooter,
};

/* ------------------------------------------------------------------ *
 * PROJECT
 * ------------------------------------------------------------------ */
export function project(slug) {
  const p = bySlug(slug);
  if (!p) return null;
  const nx = nextOf(slug);
  return {
    title: `${p.title} · ${SITE.name}`,
    description: p.tagline,
    theme: p.theme,
    type: p.type,
    render() {
      const heroFit = p.heroFit === 'contain';
      const heroMedia = p.heroMedia
        ? frame(p.heroMedia, { sizes: '100vw', eager: true, contain: heroFit })
        : coverHTML(p, { sizes: '100vw', eager: true, word: false });
      const heroBg = p.heroBg || p.coverBg;
      return `
      <article class="p-page">
        <header class="p-hero${p.theme.light ? ' is-light' : ''}${heroFit ? ' is-plate' : ''}">
          <div class="p-hero-media${heroFit ? ' fit-contain' : ''}" data-door-target${
            heroBg ? ` style="background:${heroBg}"` : ''
          }>${heroMedia}</div>
          <div class="p-hero-inner wrap">
            <p class="p-num"><span>${p.num}</span>${esc(p.disciplines)}</p>
            <h1 class="display rise"><span>${esc(p.title)}</span></h1>
            ${p.titleAlt ? `<p class="p-title-alt reveal" style="--delay:150ms" lang="hi">${esc(p.titleAlt)}</p>` : ''}
            <div class="p-hero-foot">
              <p class="p-hero-sub reveal" style="--delay:200ms">${esc(p.subtitle)}</p>
              <p class="meta reveal" style="--delay:280ms">${p.status === 'soon' ? 'In development' : 'Case study'}</p>
            </div>
          </div>
        </header>

        <div class="p-back wrap"><a href="/work" data-link><span class="arrow">←</span> Back to work</a></div>

        <div class="blocks">${renderBlocks(p)}</div>

        <a class="next" href="/work/${nx.slug}" data-link data-cursor="Open">
          <div class="next-inner wrap">
            <div>
              <p class="meta">Next project</p>
              <p class="h1">${esc(nx.title)}</p>
            </div>
            <p class="meta">${esc(nx.disciplines)}</p>
          </div>
          <div class="next-peek">${
            nx.cover
              ? frame(nx.cover, { sizes: '20vw', ratio: '3/4' })
              : `<div class="frame" style="--ratio:3/4">${coverHTML(nx)}</div>`
          }</div>
        </a>
      </article>
      ${footer()}`;
    },
    hydrate(root) {
      hydrateFooter(root);
      hydrateBlocks(root);
      const hero = $('.p-hero-media', root);
      if (hero) hero.dataset.parallax = '0.14';
    },
  };
}

/* ------------------------------------------------------------------ *
 * ABOUT
 * ------------------------------------------------------------------ */
export const about = {
  title: `About · ${SITE.name}`,
  description: ABOUT.lede,
  render() {
    const a = ABOUT;
    return `
    <header class="page-head wrap">
      <p class="meta reveal">${esc(SITE.role)}</p>
      <h1 class="h1 rise" style="margin-top:1rem"><span>${esc(a.title)}</span></h1>
    </header>

    <section class="section-sm wrap">
      <div class="about-grid">
        <p class="lede reveal">${esc(a.lede)}</p>
        <div class="about-body reveal" style="--delay:120ms">${a.body.map((p) => `<p class="body-copy">${esc(p)}</p>`).join('')}</div>
      </div>
    </section>

    <section class="section wrap">
      <p class="kicker reveal" style="margin-bottom:clamp(1.5rem,3vw,2.5rem)">Things I keep coming back to</p>
      <div class="interests reveal">
        ${a.interests.map((i) => `<button class="interest" data-media="${i.media}" data-cursor="Look">${esc(i.word)}</button>`).join('')}
      </div>
    </section>

    <section class="section-sm wrap">
      <p class="kicker reveal" style="margin-bottom:clamp(1.5rem,3vw,2.5rem)">What I like to make</p>
      <div class="makes">
        ${a.makes
          .map(
            ([t, d], i) =>
              `<div class="make reveal" style="--delay:${i * 70}ms"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`
          )
          .join('')}
      </div>
    </section>

    <section class="section wrap">
      <div class="two-col">
        <p class="kicker col-a reveal">My design approach</p>
        <div class="col-b">
          <h2 class="h2 reveal">${esc(a.approach.title)}</h2>
          <p class="body-copy reveal" style="margin-top:1.25rem">${esc(a.approach.intro)}</p>
          <ul class="qs reveal">${a.approach.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
          <p class="body-copy reveal" style="margin-top:1.5rem">${esc(a.approach.outro)}</p>
        </div>
      </div>
    </section>

    <section class="section-sm wrap">
      <div class="two-col">
        <p class="kicker col-a reveal">Currently into</p>
        <div class="col-b reveal"><div class="tags">${a.currently.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
      </div>
    </section>

    <section class="section-sm wrap">
      <div class="two-col">
        <p class="kicker col-a reveal">Areas I work across</p>
        <div class="col-b reveal"><div class="tags">${a.areas.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
      </div>
    </section>

    <section class="section-sm wrap">
      <div class="two-col">
        <p class="kicker col-a reveal">Things I use to make things</p>
        <div class="col-b reveal">
          <div class="tags">${a.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <p class="meta" style="margin-top:1rem;text-transform:none;letter-spacing:.04em">${esc(a.toolsNote)}</p>
        </div>
      </div>
    </section>

    <section class="section wrap">
      <div class="two-col">
        <p class="kicker col-a reveal">Education</p>
        <div class="col-b reveal">
          <h3 class="h3">${esc(a.education.school)}</h3>
          <p class="meta" style="margin-top:.75rem">${esc(a.education.degree)}</p>
          <p class="meta" style="margin-top:.35rem">${esc(a.education.dates)} · ${esc(a.education.place)}</p>
          <p class="body-copy" style="margin-top:1.25rem">${esc(a.education.note)}</p>
          <p style="margin-top:2rem"><a class="btn" id="cv-link" href="${SITE.cv}" target="_blank" rel="noopener">The formal version. View CV <span class="arrow">→</span></a></p>
        </div>
      </div>
    </section>

    <section class="section wrap">
      <p class="serif-statement reveal" style="max-width:24ch">${esc(a.closing)}</p>
      <p style="margin-top:2rem"><a class="btn" href="/contact" data-link>Let's talk <span class="arrow">→</span></a></p>
    </section>

    ${footer()}`;
  },
  hydrate(root) {
    hydrateFooter(root);
    const list = $('.interests', root);
    const items = $$('.interest', root);
    const removePeek = attachPeek(items, { className: 'interest-peek', getKey: (el) => el.dataset.media });
    items.forEach((el) => {
      el.addEventListener('pointerenter', () => {
        list.classList.add('is-hovering');
        items.forEach((o) => o.classList.toggle('is-on', o === el));
      });
      el.addEventListener('pointerleave', () => list.classList.remove('is-hovering'));
    });

    // If no CV file has been added yet, quietly turn the link into an email.
    const cv = $('#cv-link', root);
    if (cv) {
      fetch(SITE.cv, { method: 'HEAD' })
        .then((r) => {
          if (r.ok) return;
          throw new Error('no cv');
        })
        .catch(() => {
          cv.href = `mailto:${SITE.email}?subject=${encodeURIComponent('CV request')}`;
          cv.removeAttribute('target');
          cv.innerHTML = 'The formal version. Ask me for my CV <span class="arrow">→</span>';
        });
    }
    return removePeek;
  },
};

/* ------------------------------------------------------------------ *
 * PLAYGROUND
 * ------------------------------------------------------------------ */
export const playground = {
  title: `Playground · ${SITE.name}`,
  description: PLAYGROUND.lede,
  render() {
    const items = PLAYGROUND.items.filter((k) => media(k));
    return `
    <header class="page-head wrap">
      <p class="meta reveal">Playground</p>
      <h1 class="h1 rise" style="margin-top:1rem;max-width:16ch"><span>${esc(PLAYGROUND.title)}</span></h1>
      <p class="lede reveal" style="--delay:140ms;max-width:44ch">${esc(PLAYGROUND.lede)}</p>
    </header>

    <section class="section-sm wrap">
      <div class="pg-bar">
        <p class="meta">${items.length} things</p>
        <button class="btn" id="shuffle">Shuffle <span class="arrow">↺</span></button>
      </div>
      <div class="pg-grid" id="pg-grid">
        ${items
          .map((k, i) => {
            const cap = PLAYGROUND.captions[i % PLAYGROUND.captions.length];
            return `<button class="pg-item reveal" data-key="${k}" data-cap="${esc(cap)}"
                data-cursor="View" style="--rot:${((i % 5) - 2) * 0.6}deg;--delay:${(i % 6) * 60}ms">
              ${frame(k, { sizes: '(max-width:760px) 48vw, 24vw' })}
              <span class="pg-cap">${esc(cap)}</span>
            </button>`;
          })
          .join('')}
      </div>
    </section>

    <section class="section wrap">
      <p class="serif-statement reveal" style="max-width:20ch">${esc(PLAYGROUND.closing)}</p>
    </section>
    ${footer()}`;
  },
  hydrate(root) {
    hydrateFooter(root);
    const grid = $('#pg-grid', root);

    $('#shuffle', root)?.addEventListener('click', () => {
      const kids = [...grid.children];
      kids.sort(() => Math.random() - 0.5);
      kids.forEach((k, i) => {
        k.style.setProperty('--rot', `${((Math.random() * 4) - 2).toFixed(2)}deg`);
        grid.appendChild(k);
      });
    });

    // Lightbox
    const box = document.createElement('div');
    box.id = 'lightbox';
    box.innerHTML = `<button class="lb-close" aria-label="Close">Close ✕</button>
      <button class="lb-nav lb-prev" aria-label="Previous">←</button>
      <button class="lb-nav lb-next" aria-label="Next">→</button>
      <div><img alt=""><p class="lb-cap"></p></div>`;
    document.body.appendChild(box);
    const bImg = $('img', box);
    const bCap = $('.lb-cap', box);
    const tiles = $$('.pg-item', root);
    let idx = 0;

    const open = (i) => {
      idx = (i + tiles.length) % tiles.length;
      const t = tiles[idx];
      const m = media(t.dataset.key);
      bImg.src = `${m.src}-${m.widths[m.widths.length - 1]}.webp`;
      bImg.alt = m.alt;
      bCap.textContent = t.dataset.cap;
      box.classList.add('is-on');
      document.documentElement.classList.add('is-locked');
    };
    const close = () => {
      box.classList.remove('is-on');
      document.documentElement.classList.remove('is-locked');
    };
    tiles.forEach((t, i) => t.addEventListener('click', () => open(i)));
    $('.lb-close', box).addEventListener('click', close);
    $('.lb-prev', box).addEventListener('click', () => open(idx - 1));
    $('.lb-next', box).addEventListener('click', () => open(idx + 1));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    const keys = (e) => {
      if (!box.classList.contains('is-on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') open(idx + 1);
      if (e.key === 'ArrowLeft') open(idx - 1);
    };
    addEventListener('keydown', keys);
    return () => { box.remove(); removeEventListener('keydown', keys); };
  },
};

/* ------------------------------------------------------------------ *
 * CONTACT
 * ------------------------------------------------------------------ */
export const contact = {
  title: `Contact · ${SITE.name}`,
  description: CONTACT.lede,
  render() {
    return `
    <header class="page-head wrap">
      <h1 class="h1 rise" style="max-width:12ch"><span>${esc(CONTACT.title)}</span></h1>
      <p class="lede reveal" style="--delay:130ms">${esc(CONTACT.lede)}</p>
    </header>

    <section class="section-sm wrap">
      <div class="reach">
        <a href="mailto:${SITE.email}" data-cursor="Write">
          <span class="k">Email</span><span class="v">${esc(SITE.email)}</span><span class="arrow">→</span>
        </a>
        <a href="${SITE.instagramUrl}" target="_blank" rel="noopener" data-cursor="Follow">
          <span class="k">Instagram</span><span class="v">@${esc(SITE.instagram)}</span><span class="arrow">→</span>
        </a>
        <a href="tel:${SITE.phone.replace(/\s/g, '')}" data-cursor="Call">
          <span class="k">Phone</span><span class="v">${esc(SITE.phone)}</span><span class="arrow">→</span>
        </a>
        <div><span class="k">Based in</span><span class="v">${esc(SITE.place)}</span></div>
      </div>
      <p class="body-copy" style="margin-top:2rem">${esc(CONTACT.note)}</p>
    </section>

    <section class="section wrap">
      <p class="kicker reveal" style="margin-bottom:clamp(2rem,4vw,3rem)">Or send me a message</p>
      <form class="form reveal" id="enquiry" novalidate>
        <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" placeholder="Enter your name" required></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" placeholder="Enter your email" required></div>
        <div class="field wide"><label for="f-org">Project / Organisation</label><input id="f-org" name="org" placeholder="Enter project or organisation"></div>
        <div class="field wide"><label for="f-about">What are you working on?</label><textarea id="f-about" name="about" rows="3" placeholder="Tell me a little about it"></textarea></div>
        <div class="field wide">
          <label>What do you need help with?</label>
          <div class="chips">
            ${CONTACT.helpOptions
              .map(
                (o) =>
                  `<label class="chip"><input type="checkbox" name="help" value="${esc(o)}"><span>${esc(o)}</span></label>`
              )
              .join('')}
          </div>
        </div>
        <div class="field"><label for="f-time">Timeline</label><input id="f-time" name="timeline" placeholder="Optional"></div>
        <div class="field wide"><label for="f-else">Anything else?</label><textarea id="f-else" name="anything" rows="3" placeholder="Tell me everything"></textarea></div>
        <div class="form-foot">
          <button class="btn btn-fill" type="submit">Send it <span class="arrow">→</span></button>
          <p class="form-note" id="form-note">This opens your email app with everything filled in. Nothing is stored anywhere.</p>
        </div>
      </form>
    </section>
    ${footer()}`;
  },
  hydrate(root) {
    hydrateFooter(root);
    const form = $('#enquiry', root);
    const note = $('#form-note', root);
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(form);
      if (!d.get('name') || !d.get('email')) {
        note.textContent = 'A name and an email would help. The rest is optional.';
        return;
      }
      const help = d.getAll('help').join(', ') || 'Not specified';
      const body = [
        `Name: ${d.get('name')}`,
        `Email: ${d.get('email')}`,
        `Project / Organisation: ${d.get('org') || 'Not specified'}`,
        '',
        'What they are working on:',
        d.get('about') || 'Not specified',
        '',
        `Needs help with: ${help}`,
        `Timeline: ${d.get('timeline') || 'Not specified'}`,
        '',
        'Anything else:',
        d.get('anything') || 'Not specified',
      ].join('\n');
      location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(
        `Enquiry from ${d.get('name')}`
      )}&body=${encodeURIComponent(body)}`;
      note.textContent = 'Got it. Your message is somewhere between here and my inbox now.';
    });
  },
};

/* ------------------------------------------------------------------ *
 * 404
 * ------------------------------------------------------------------ */
export const notFound = {
  title: `Lost · ${SITE.name}`,
  description: 'This page seems to have wandered off.',
  render() {
    const p = PROJECTS[Math.floor(Math.random() * (PROJECTS.length - 1))];
    return `
    <section class="oops wrap">
      <h1 class="h1 rise"><span>Oops.</span></h1>
      <p class="serif-statement" style="max-width:18ch">This page seems to have wandered off.</p>
      <div class="actions">
        <a class="btn" href="/" data-link>Take me home <span class="arrow">→</span></a>
        <a class="btn" href="/work/${p.slug}" data-link>Show me something else <span class="arrow">→</span></a>
      </div>
    </section>
    ${footer()}`;
  },
  hydrate: hydrateFooter,
};
