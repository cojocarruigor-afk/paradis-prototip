// Paradis: antet, meniu mobil, diapozitive în erou, bara de rezervare, calculator,
// apariții la derulare, galerie cu filtre + lightbox, formular.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const wa = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
const fill = (tpl, map) => tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');

// Antet
const header = $('.header');
const onScroll = () => header.classList.toggle('scrolled', scrollY > 60);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const burger = $('.burger');
burger?.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  burger.setAttribute('aria-expanded', open);
});
$$('.nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

// Diapozitive în erou (sala reală + atmosferă), schimbare la 6 s
const slides = $$('.hero__slides img');
if (slides.length > 1 && !calm) {
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    slides[i].classList.remove('on');
    i = (i + 1) % slides.length;
    slides[i].classList.add('on');
  }, 6000);
}

// Sala potrivită după numărul de invitați
const hallFor = (n, el) => n <= 25 ? el.dataset.small : el.dataset.big;

// Bara de rezervare: trimite datele direct pe WhatsApp
const book = $('.booking');
if (book) {
  const hint = $('.hint', book);
  const date = $('input[type=date]', book);
  date.min = new Date().toISOString().slice(0, 10);
  const upd = () => { hint.textContent = fill(book.dataset.hint, { hall: hallFor(+book.guests.value, book) }); };
  book.guests.addEventListener('change', upd); upd();
  book.addEventListener('submit', e => {
    e.preventDefault();
    const d = date.value ? new Date(date.value).toLocaleDateString('ro-MD') : '—';
    open(wa(book.dataset.wa, fill(book.dataset.msg, { type: book.type.value, date: d, guests: book.guests.value, hall: hallFor(+book.guests.value, book) })), '_blank');
  });
}

// Bara de acțiuni pe mobil stă ascunsă cât timp formularul din erou e vizibil
if (book) {
  new IntersectionObserver(([e]) => document.body.classList.toggle('bar-off', e.isIntersecting)).observe(book);
}

// Planul sălii văzut de sus: Smarald = masă imperială de 25; Grand = 8 mese rotunde × 10
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
function layout(big) {
  const tables = [], seats = [];
  if (!big) {
    tables.push(el('rect', { class: 'tbl', x: 88, y: 116, width: 264, height: 48, rx: 8 }));
    for (let i = 0; i < 12; i++) seats.push([102 + i * 21.8, 98]);
    for (let i = 0; i < 12; i++) seats.push([102 + i * 21.8, 182]);
    seats.push([372, 140]);
  } else {
    for (let r = 0; r < 2; r++) for (let col = 0; col < 4; col++) {
      const cx = 72 + col * 99, cy = 84 + r * 112;
      tables.push(el('circle', { class: 'tbl', cx, cy, r: 21 }));
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        seats.push([cx + Math.cos(a) * 33, cy + Math.sin(a) * 33]);
      }
    }
  }
  return { tables, seats: seats.map(([cx, cy]) => el('circle', { class: 'seat', cx: cx.toFixed(1), cy: cy.toFixed(1), r: 7.5 })) };
}
function plan(fig, n, hallName) {
  const big = n > 25, g = fig.querySelector('.plan__seats');
  if (fig.dataset.big !== String(big)) {
    const draw = () => {
      g.replaceChildren();
      const { tables, seats } = layout(big);
      tables.forEach(t => g.append(t)); seats.forEach(s => g.append(s));
      fig.dataset.big = String(big);
      fill();
      fig.classList.remove('swap');
    };
    if (fig.dataset.big && !calm) { fig.classList.add('swap'); setTimeout(draw, 250); } else draw();
  } else fill();
  function fill() {
    const seats = g.querySelectorAll('.seat');
    seats.forEach((s, i) => s.classList.toggle('on', i < n));
    fig.querySelector('[data-plan=name]').textContent = hallName;
    fig.querySelector('[data-plan=seats]').textContent = `${n} / ${big ? 80 : 25}`;
  }
}

// Calculator: total = invitați × preț pachet; chiria sălii e 0
$$('.calc').forEach(c => {
  const fig = c.closest('.split')?.querySelector('.plan');
  const range = $('input[type=range]', c), out = $('#calc-out', c) || $('output', c);
  const btns = $$('.seg button', c), kidBtns = $$('[data-kids]', c), kidPrice = +c.dataset.kidPrice, sel = $('[data-ev-select]', c);
  let price = +(btns.find(b => b.getAttribute('aria-pressed') === 'true') || btns[0]).dataset.price, kids = 0;
  const o = k => $(`[data-out=${k}]`, c);
  const render = () => {
    const n = +range.value;
    kids = Math.max(0, Math.min(kids, 80 - n)); // adulți + copii ≤ 80 de locuri
    const people = n + kids, total = n * price + kids * kidPrice, hall = hallFor(people, c);
    o('kids-n').textContent = kids;
    o('kids').textContent = `${fmt(kids * kidPrice)} ${c.dataset.cur}`;
    kidBtns[0].disabled = kids === 0; kidBtns[1].disabled = people >= 80;
    out.textContent = n;
    range.style.setProperty('--p', `${(n - range.min) / (range.max - range.min) * 100}%`);
    o('hall').textContent = hall;
    o('per').textContent = `${fmt(price)} ${c.dataset.cur}`;
    o('total').textContent = `${fmt(total)} ${c.dataset.cur}`;
    const pkg = $('.seg button[aria-pressed=true] b', c).textContent;
    o('cta').href = wa(c.dataset.wa, fill(c.dataset.msg, { guests: n, kids: kids ? fill(c.dataset.kidsMsg, { n: kids }) : '', pkg, hall, total: fmt(total) }));
    if (fig) plan(fig, people, hall);
  };
  range.addEventListener('input', render);
  kidBtns.forEach(b => b.addEventListener('click', () => { kids += +b.dataset.kids; render(); }));
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', x === b));
    price = +b.dataset.price; render();
  }));
  // tipul evenimentului: alte prețuri pe cele 3 pachete; fila de meniu din aceeași secțiune îl urmează
  if (sel) sel.addEventListener('change', () => {
    const opt = sel.selectedOptions[0], ps = opt.dataset.prices.split(' ');
    btns.forEach((b, i) => { b.dataset.price = ps[i]; $('span', b).textContent = `${fmt(+ps[i])} ${c.dataset.per}`; });
    price = +$('.seg button[aria-pressed=true]', c).dataset.price;
    const m = c.closest('section')?.querySelector('.evmenu');
    if (m) { m.dataset.active = opt.dataset.menu; $$('button[data-ev]', m).forEach(x => x.setAttribute('aria-pressed', x.dataset.ev === opt.dataset.menu)); }
    render();
  });
  render();
});

// File (evenimente pe Acasă, meniuri pe pachete): butonul alege ce [data-show] se vede
$$('[data-tabs]').forEach(m => {
  const btns = $$('button[data-ev]', m);
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', x === b));
    m.dataset.active = b.dataset.ev;
    b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }));
});

// Apariții la derulare, în cascadă în cadrul aceluiași grup
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach(el => {
  const sibs = [...el.parentElement.children].filter(x => x.classList.contains('reveal'));
  el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 4) * 0.08}s`);
  io.observe(el);
});

// Galerie: filtre + lightbox
const items = $$('.gridgal a');
$$('.filters button').forEach(b => b.addEventListener('click', () => {
  $$('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
  items.forEach(a => a.hidden = b.dataset.f !== '*' && a.dataset.cat !== b.dataset.f);
}));
const lb = $('.lightbox');
if (lb) {
  let i = 0;
  const vis = () => items.filter(a => !a.hidden);
  const show = n => { const v = vis(); i = (n + v.length) % v.length; $('img', lb).src = v[i].href; $('img', lb).alt = $('img', v[i]).alt; };
  const close = () => lb.classList.remove('open');
  items.forEach(a => a.addEventListener('click', e => { e.preventDefault(); show(vis().indexOf(a)); lb.classList.add('open'); $('.lb-close', lb).focus(); }));
  $('.lb-close', lb).onclick = close;
  $('.lb-prev', lb).onclick = () => show(i - 1);
  $('.lb-next', lb).onclick = () => show(i + 1);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
}

// Formular: Web3Forms; fără cheie configurată, deschide WhatsApp cu mesajul completat
$$('form.form').forEach(form => form.addEventListener('submit', async e => {
  e.preventDefault();
  const status = $('.form-status', form);
  const data = new FormData(form);
  const text = [...data].filter(([k]) => !['access_key', 'subject', 'botcheck'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
  if (!data.get('access_key') || data.get('access_key').startsWith('YOUR')) {
    open(wa(form.dataset.wa, text), '_blank');
    status.textContent = form.dataset.ok; form.reset(); return;
  }
  status.textContent = '…';
  try {
    const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
    if (!r.ok) throw 0;
    status.textContent = form.dataset.ok; form.reset();
  } catch { status.textContent = form.dataset.err; }
}));

const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
