/* Case-study building blocks.
 * Each block type has a render() that returns HTML and, where it needs
 * behaviour, a matching hydrate step in hydrateBlocks(). */

import { $, $$, esc, frame, figure, imgTag, media, makeDraggable, watchImages } from './ui.js';

const paras = (arr, cls = 'body-copy') => arr.map((p) => `<p class="${cls}">${esc(p)}</p>`).join('');
const kicker = (t) => (t ? `<p class="kicker">${esc(t)}</p>` : '');

const PENDING_NOTE = `<div class="pending reveal"><b>Note</b><span>Photography and final artwork for this project are still being produced. The story, system and thinking are complete. The images arrive next.</span></div>`;

/* ------------------------------------------------------------------ *
 * Renderers
 * ------------------------------------------------------------------ */
const R = {
  intro: (b) => `<section class="b-intro wrap">
      <div class="body-copy reveal">${b.body.map((p) => `<p class="body-copy">${esc(p)}</p>`).join('')}</div>
    </section>`,

  statement: (b) => `<section class="b-statement wrap">
      ${kicker(b.kicker)}
      <h2 class="serif-statement reveal">${esc(b.text)}</h2>
      ${b.body ? `<div class="body-copy reveal" style="--delay:90ms">${esc(b.body)}</div>` : ''}
    </section>`,

  text: (b) => `<section class="b-text wrap">
      ${kicker(b.kicker)}
      <div class="b-text-main reveal">
        ${b.title ? `<h2 class="h3">${esc(b.title)}</h2>` : ''}
        ${paras(b.body)}
      </div>
    </section>`,

  /* Figures decide their own crop from the source's orientation, so a tall
     photograph never gets forced into a full-width letterbox. */
  figure: (b) => {
    const m = media(b.media);
    const portrait = m ? m.h / m.w > 1.05 : false;
    const size = b.size || 'wide';
    let cls = `size-${size}`;
    let ratio = b.ratio;
    if (b.contain) {
      cls += ' is-plate';
      ratio = ratio || '16/9';
    } else if (size === 'full') {
      ratio = ratio || '16/9';
    } else if (size === 'wide') {
      if (portrait) cls = 'size-tall';
      else ratio = ratio || '3/2';
    }
    const inner = figure(b.media, {
      caption: b.caption,
      sizes: size === 'inset' || cls === 'size-tall' ? '60vw' : '100vw',
      ratio,
      contain: !!b.contain,
    });
    const wrapped = size === 'full' ? inner : `<div class="wrap">${inner}</div>`;
    const bg = b.bg ? ` style="--plate-bg:${b.bg}"` : '';
    return `<section class="b-figure ${cls} reveal" data-parallax="0.08"${bg}>${wrapped}</section>`;
  },

  duo: (b) => `<section class="b-duo wrap">
      ${b.media
        .map(
          (k, i) =>
            `<figure class="fig reveal" style="--delay:${i * 110}ms" data-parallax="${i ? 0.16 : 0.05}">
              ${frame(k, { sizes: i ? '35vw' : '58vw' })}
              ${b.captions?.[i] ? `<figcaption>${esc(b.captions[i])}</figcaption>` : ''}
            </figure>`
        )
        .join('')}
    </section>`,

  split: (b) => `<section class="b-split side-${b.side || 'left'} wrap">
      <div class="b-split-media reveal" data-parallax="0.1">${frame(b.media, { sizes: '50vw' })}</div>
      <div class="b-split-text reveal" style="--delay:110ms">
        ${kicker(b.kicker)}
        ${b.title ? `<h2 class="h3">${esc(b.title)}</h2>` : ''}
        ${paras(b.body)}
      </div>
    </section>`,

  columns: (b) => `<section class="b-columns wrap">
      ${kicker(b.kicker)}
      <div class="b-col-body reveal">
        ${b.lede ? `<p class="b-col-lede">${esc(b.lede)}</p>` : ''}
        <ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>
    </section>`,

  words: (b) => `<section class="b-words wrap">
      ${kicker(b.kicker)}
      <ul class="reveal">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${b.body ? `<p class="body-copy reveal">${esc(b.body)}</p>` : ''}
    </section>`,

  arc: (b) => `<section class="b-arc wrap">
      ${kicker(b.kicker)}
      <ol class="reveal">${b.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      ${b.body ? `<p class="body-copy reveal">${esc(b.body)}</p>` : ''}
    </section>`,

  gallery: (b) => `<section class="b-gallery reveal">
      <div class="wrap">${kicker(b.kicker)}</div>
      <div class="gal-track" data-cursor="Drag">
        ${b.media
          .map((k) => {
            const m = media(k);
            return `<div class="gal-item">${frame(k, {
              sizes: '(max-width: 700px) 70vw, 34vw',
              ratio: b.ratio || (m ? `${m.w}/${m.h}` : undefined),
            })}</div>`;
          })
          .join('')}
      </div>
      ${b.caption ? `<div class="wrap"><p class="gal-cap body-copy">${esc(b.caption)}</p></div>` : ''}
    </section>`,

  outcome: (b) => `<section class="b-outcome wrap">
      <div class="reveal"><p class="kicker">Outcome</p><p>${esc(b.outcome)}</p></div>
      <div class="takeaway reveal" style="--delay:110ms"><p class="kicker">Takeaway</p><p>${esc(b.takeaway)}</p></div>
    </section>`,

  info: (b) => `<section class="wrap reveal">
      <dl class="b-info">
        ${b.rows.map(([k, v]) => `<div class="row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
    </section>`,

  soon: (b) => `<section class="wrap"><div class="b-soon reveal">
      <h2 class="h2">${esc(b.title)}</h2>
      <p>${esc(b.body)}</p>
    </div></section>`,

  /* ---------------- signature interactions ---------------- */
  feature: (b) => {
    const head = `<div class="ft-head reveal">
        ${kicker(b.kicker)}
        ${b.title ? `<h2 class="h3">${esc(b.title)}</h2>` : ''}
        ${b.body ? `<p class="body-copy">${esc(b.body)}</p>` : ''}
        ${b.hint ? `<p class="ft-hint">${esc(b.hint)}</p>` : ''}
      </div>`;

    if (b.kind === 'hotspots') {
      return `<section class="ft wrap" data-ft="hotspots">${head}
        <div class="ft-body reveal">
          <div class="hot">
            ${frame(b.media, { sizes: '60vw', ratio: '5/4' })}
            ${b.points
              .map(
                (p, i) =>
                  `<button class="hot-pt" style="--x:${p.x}%;--y:${p.y}%;--i:${i}"
                     data-i="${i}" aria-expanded="${i === 0}" data-cursor=""
                     aria-label="${esc(p.label)}"></button>`
              )
              .join('')}
          </div>
          <div class="hot-panel" data-points='${esc(JSON.stringify(b.points))}'>
            <p class="lbl">${esc(b.points[0].label)}</p>
            <p>${esc(b.points[0].text)}</p>
          </div>
        </div>
      </section>`;
    }

    if (b.kind === 'toggle') {
      return `<section class="ft wrap" data-ft="toggle">${head}
        <div class="ft-body reveal">
          <div class="tg-switch" role="tablist">
            ${b.sides
              .map(
                (s, i) =>
                  `<button role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(s.key)}</button>`
              )
              .join('')}
            <span class="tg-thumb"></span>
          </div>
          <div class="tg-panel" data-sides='${esc(JSON.stringify(b.sides))}'></div>
        </div>
      </section>`;
    }

    if (b.kind === 'lens') {
      const m = media(b.media);
      return `<section class="ft wrap" data-ft="lens">${head}
        <div class="ft-body reveal">
          <div class="lens-stage" data-cursor="">
            ${frame(b.media, { sizes: '60vw', ratio: '4/5' })}
            <div class="lens">${imgTag(b.media, { sizes: '200vw' })}</div>
          </div>
        </div>
      </section>`;
    }

    if (b.kind === 'week') {
      return `<section class="ft wrap" data-ft="week">${head}
        <div class="ft-body reveal">
          <div class="week">
            <div class="week-stage">
              <div class="bottle" style="--cx:${b.days[0].cx};--cy:0.477;--zoom:7.8">
                ${imgTag(b.media, { sizes: '60vw' })}
              </div>
            </div>
            <div class="week-side" data-days='${esc(JSON.stringify(b.days))}'>
              <div class="week-days" role="tablist">
                ${b.days
                  .map(
                    (d, i) =>
                      `<button role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(d.day.slice(0, 3))}</button>`
                  )
                  .join('')}
              </div>
              <div class="week-copy">
                <p class="day">${esc(b.days[0].day)}</p>
                <p class="line">${esc(b.days[0].line)}</p>
                <p class="flavour">${esc(b.days[0].flavour)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>`;
    }

    if (b.kind === 'palette') {
      return `<section class="ft wrap" data-ft="palette">${head}
        <div class="ft-body reveal">
          <div class="pal" data-swatches='${esc(JSON.stringify(b.swatches))}'>
            ${b.swatches
              .map(
                (s, i) =>
                  `<button style="background:${s.hex}" data-i="${i}" aria-label="${esc(s.name)}"><span>${esc(
                    s.name
                  )}</span></button>`
              )
              .join('')}
          </div>
          <div class="pal-readout">
            <span class="hex" style="color:${b.swatches[0].hex}">${esc(b.swatches[0].hex)}</span>
            <span class="meta name">${esc(b.swatches[0].name)}</span>
          </div>
        </div>
      </section>`;
    }

    if (b.kind === 'tension') {
      return `<section class="ft wrap" data-ft="tension">${head}
        <div class="ft-body reveal">
          <div class="tension">
            ${b.pairs
              .map(
                ([a, z], i) => `<div class="tn-row" style="--v:50%">
                  <div class="tn-labels"><span data-side="a">${esc(a)}</span><span data-side="z">${esc(z)}</span></div>
                  <div class="tn-track">
                    <span class="tn-fill"></span><span class="tn-knob"></span>
                    <input type="range" min="0" max="100" value="50" aria-label="${esc(a)} to ${esc(z)}">
                  </div>
                </div>`
              )
              .join('')}
          </div>
        </div>
      </section>`;
    }
    return '';
  },
};

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */
export function renderBlocks(project) {
  const out = project.blocks.map((b) => R[b.t]?.(b) || '').join('');
  return project.pendingArt ? `<section class="wrap">${PENDING_NOTE}</section>${out}` : out;
}

export function hydrateBlocks(root) {
  $$('.gal-track', root).forEach(makeDraggable);

  /* hotspots */
  $$('[data-ft="hotspots"]', root).forEach((sec) => {
    const panel = $('.hot-panel', sec);
    const points = JSON.parse(panel.dataset.points);
    const buttons = $$('.hot-pt', sec);
    const show = (i) => {
      buttons.forEach((b, j) => b.setAttribute('aria-expanded', String(i === j)));
      panel.innerHTML = `<p class="lbl">${esc(points[i].label)}</p><p>${esc(points[i].text)}</p>`;
      panel.classList.remove('is-swap');
      void panel.offsetWidth;
      panel.classList.add('is-swap');
    };
    buttons.forEach((b, i) => {
      b.addEventListener('pointerenter', () => show(i));
      b.addEventListener('click', () => show(i));
      b.addEventListener('focus', () => show(i));
    });
  });

  /* retail ↔ premium */
  $$('[data-ft="toggle"]', root).forEach((sec) => {
    const panel = $('.tg-panel', sec);
    const sides = JSON.parse(panel.dataset.sides);
    const tabs = $$('.tg-switch button', sec);
    const thumb = $('.tg-thumb', sec);
    const paint = (i) => {
      const s = sides[i];
      tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
      const r = tabs[i].getBoundingClientRect();
      const p = tabs[i].parentElement.getBoundingClientRect();
      thumb.style.width = `${r.width}px`;
      thumb.style.transform = `translateX(${r.left - p.left - 3}px)`;
      sec.style.setProperty('--tg-accent', s.accent);
      sec.style.setProperty('--tg-ink', s.bg);
      panel.style.background = s.bg;
      panel.style.color = s.ink;
      panel.innerHTML = `
        <p class="tg-lede">${esc(s.lede)}</p>
        <ul>${s.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="tg-media">${s.media.map((k) => frame(k, { sizes: '20vw', ratio: '1/1' })).join('')}</div>`;
      panel.classList.remove('tg-fade');
      void panel.offsetWidth;
      panel.classList.add('tg-fade');
      watchImages(panel);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => paint(i)));
    paint(0);
    addEventListener('resize', () => paint(tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true')));
  });

  /* magnifier */
  $$('[data-ft="lens"]', root).forEach((sec) => {
    const stage = $('.lens-stage', sec);
    const lens = $('.lens', sec);
    const img = $('img', lens);
    const ZOOM = 2.5;
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      lens.style.left = `${x}px`;
      lens.style.top = `${y}px`;
      img.style.width = `${r.width * ZOOM}px`;
      img.style.height = `${r.height * ZOOM}px`;
      img.style.transform = `translate(${-x * ZOOM}px, ${-y * ZOOM}px)`;
    });
  });

  /* seven-day selector */
  $$('[data-ft="week"]', root).forEach((sec) => {
    const side = $('.week-side', sec);
    const days = JSON.parse(side.dataset.days);
    const stage = $('.week-stage', sec);
    const bottle = $('.bottle', sec);
    const copy = $('.week-copy', sec);
    const tabs = $$('.week-days button', sec);
    const pick = (i) => {
      const d = days[i];
      tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
      bottle.style.setProperty('--cx', d.cx);
      stage.style.background = `${d.colour}2E`;
      copy.innerHTML = `<p class="day">${esc(d.day)}</p><p class="line">${esc(d.line)}</p><p class="flavour">${esc(
        d.flavour
      )}</p>`;
      copy.classList.remove('is-swap');
      void copy.offsetWidth;
      copy.classList.add('is-swap');
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(i));
      t.addEventListener('pointerenter', () => pick(i));
    });
    pick(0);
  });

  /* palette */
  $$('[data-ft="palette"]', root).forEach((sec) => {
    const pal = $('.pal', sec);
    const swatches = JSON.parse(pal.dataset.swatches);
    const hex = $('.hex', sec);
    const name = $('.name', sec);
    $$('button', pal).forEach((b, i) => {
      const show = () => {
        hex.textContent = swatches[i].hex;
        hex.style.color = swatches[i].hex;
        name.textContent = swatches[i].name;
        sec.closest('.page')?.style.setProperty('--accent', swatches[i].hex);
      };
      b.addEventListener('pointerenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('click', show);
    });
  });

  /* tension sliders */
  $$('[data-ft="tension"]', root).forEach((sec) => {
    $$('.tn-row', sec).forEach((row) => {
      const input = $('input', row);
      const [a, z] = $$('.tn-labels span', row);
      const update = () => {
        const v = +input.value;
        row.style.setProperty('--v', `${v}%`);
        a.style.opacity = String(0.35 + (1 - v / 100) * 0.65);
        z.style.opacity = String(0.35 + (v / 100) * 0.65);
      };
      input.addEventListener('input', update);
      update();
    });
  });
}
