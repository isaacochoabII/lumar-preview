// LuMar Electric — shared interactions (runs on every page)

/* ---- Mobile nav ---- */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });

  // On touch layouts the parent link opens its submenu on first tap and
  // navigates on the second, so dropdown children stay reachable.
  navMenu.querySelectorAll('li > .nav-sub').forEach((sub) => {
    const li = sub.parentElement;
    const link = li.querySelector(':scope > a');
    link.addEventListener('click', (e) => {
      if (window.matchMedia('(min-width: 1025px)').matches) return;
      if (!li.classList.contains('open')) {
        e.preventDefault();
        navMenu.querySelectorAll('li.open').forEach((o) => o !== li && o.classList.remove('open'));
        li.classList.add('open');
      }
    });
  });
}

/* ---- Light / dark theme ----
   The inline script in <head> has already set <html data-theme> before first
   paint (stored choice, else system setting). This only handles the button and
   follows the system setting live for visitors who have not chosen. */
(() => {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (t) => {
    root.setAttribute('data-theme', t);
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0f1114' : '#f45b1e');
    document.querySelectorAll('.theme-toggle').forEach((b) => b.setAttribute('aria-pressed', t === 'dark'));
  };
  apply(root.getAttribute('data-theme') || 'light');
  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode: session only */ }
    });
  });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const follow = (e) => {
    let stored = null;
    try { stored = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
    if (stored !== 'light' && stored !== 'dark') apply(e.matches ? 'dark' : 'light');
  };
  if (mq.addEventListener) mq.addEventListener('change', follow);
})();

/* ---- Overlay nav solidifies once the hero is behind it ---- */
const siteNav = document.getElementById('siteNav');
if (siteNav && siteNav.classList.contains('nav--overlay')) {
  const setSolid = () => siteNav.classList.toggle('is-solid', window.scrollY > 60);
  setSolid();
  window.addEventListener('scroll', setSolid, { passive: true });
  // An open mobile menu needs the solid treatment regardless of scroll position.
  if (navToggle) navToggle.addEventListener('click', () => {
    siteNav.classList.toggle('is-solid', navMenu.classList.contains('open') || window.scrollY > 60);
  });
}

/* ---- Reveal on scroll ---- */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealObserver.unobserve(e.target);
        }
      });
    },
    // Threshold 0, not a ratio: a ratio is a share of the element's own height,
    // so a block taller than ~12 screens (the one-column team grid on a phone)
    // can never reach it and stays invisible. The margin supplies the delay.
    { threshold: 0, rootMargin: '0px 0px -60px 0px' }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

/* ---- Horizontal rails (projects) ---- */
document.querySelectorAll('[data-rail]').forEach((rail) => {
  const scroller = rail.querySelector('.scroller');
  const prev = rail.querySelector('[data-rail-prev]');
  const next = rail.querySelector('[data-rail-next]');
  const controls = rail.querySelector('.rail-controls');
  if (!scroller || !prev || !next) return;

  const step = () => {
    const card = scroller.querySelector('.scroller-track > *');
    if (!card) return scroller.clientWidth * 0.8;
    const gap = parseFloat(getComputedStyle(scroller.querySelector('.scroller-track')).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const sync = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    // Nothing to scroll (every card already fits) — hide the controls entirely
    // rather than showing two dead buttons.
    controls.hidden = max < 2;
    prev.disabled = scroller.scrollLeft < 2;
    next.disabled = scroller.scrollLeft >= max - 2;
  };

  prev.addEventListener('click', () => scroller.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => scroller.scrollBy({ left: step(), behavior: 'smooth' }));
  scroller.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
});

/* ---- Animated stat counters ---- */
const animateCount = (el) => {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';

  // Plain values (e.g. a year) render instantly without the count-up effect.
  if (el.dataset.plain) {
    el.textContent = target + suffix;
    return;
  }

  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const counters = document.querySelectorAll('[data-count]');
if (counters.length) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          countObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => countObserver.observe(el));
}

// Referral sharing on /thank-you/. The whole point is attribution: a bare
// booking link tells the friend nothing, so the customer's name is folded into
// the message itself and travels with every share path — copy, text and email
// alike — rather than depending on the friend guessing who sent them.
document.querySelectorAll('[data-share]').forEach((box) => {
  const nameInput = box.querySelector('[data-share-name]');
  const message = box.querySelector('[data-share-message]');
  const copyBtn = box.querySelector('[data-copy-btn]');
  const smsLink = box.querySelector('[data-share-sms]');
  const mailLink = box.querySelector('[data-share-email]');
  const template = box.dataset.shareTemplate || '';
  const url = box.dataset.shareUrl || '';
  const subject = box.dataset.shareSubject || '';
  // Feedback labels come from the markup so each language supplies its own.
  const okLabel = box.dataset.shareCopied || 'Copied';
  const manualLabel = box.dataset.shareManual || 'Press Ctrl/Cmd + C';
  if (!message) return;

  const build = () => {
    const name = nameInput ? nameInput.value.trim() : '';
    const text = template
      .replace('{url}', url)
      .replace('{name}', name ? ', ' + name + ',' : '');
    message.value = text;
    const body = encodeURIComponent(text);
    if (smsLink) smsLink.href = 'sms:?&body=' + body;
    if (mailLink) {
      mailLink.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + body;
    }
    return text;
  };

  build();
  if (nameInput) nameInput.addEventListener('input', build);

  if (!copyBtn) return;
  const label = copyBtn.textContent;
  let reset;

  const say = (text, ok) => {
    copyBtn.textContent = text;
    copyBtn.toggleAttribute('data-copied', ok);
    clearTimeout(reset);
    reset = setTimeout(() => {
      copyBtn.textContent = label;
      copyBtn.removeAttribute('data-copied');
    }, 2600);
  };

  copyBtn.addEventListener('click', async () => {
    const text = build();
    try {
      await navigator.clipboard.writeText(text);
      say(okLabel, true);
      return;
    } catch (err) {
      /* falls through to the legacy path below */
    }
    // The async API is blocked on insecure origins and in some in-app browsers
    // (customers reach this page from a text message), so fall back and, if that
    // fails too, leave the message selected with an instruction.
    message.focus();
    message.select();
    message.setSelectionRange(0, message.value.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (err) {
      copied = false;
    }
    say(copied ? okLabel : manualLabel, copied);
  });
});

// Click-to-play video facade (/our-story/). The YouTube player is only fetched
// once the visitor asks for it, so the page costs no third-party requests or
// cookies until then.
document.querySelectorAll('[data-youtube]').forEach((fig) => {
  const btn = fig.querySelector('.video-play');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const id = fig.dataset.youtube;
    const start = fig.dataset.start || '0';
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
      '?start=' + encodeURIComponent(start) + '&autoplay=1&rel=0';
    frame.title = fig.dataset.videoTitle || 'Video';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    fig.replaceChildren(frame);
    frame.focus();
  });
});

// ---- Contact / application forms -------------------------------------------
// `track()` is defined at the bottom of this file. It is a module-scope const,
// so it is initialised while the script is parsed, long before a submit handler
// can run -- the reading order is misleading, the call below is not.
// The browser sends these straight to EmailJS. The SDK is only fetched on pages
// that actually carry a form, and only once, so the 95% of pages without one
// pay nothing for it.
const ejsForms = document.querySelectorAll('form[data-emailjs]');
if (ejsForms.length) {
  const cfg = document.body.dataset;
  const t = (form, key) => form.dataset[key] || '';

  const loadSdk = () => new Promise((resolve, reject) => {
    if (window.emailjs) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = () => { window.emailjs.init({ publicKey: cfg.ejsPublicKey }); resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });

  ejsForms.forEach((form) => {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const label = button ? button.textContent : '';
    const pageField = form.querySelector('[data-fill-page]');
    if (pageField) pageField.value = location.pathname;

    const say = (msg, state) => {
      if (!status) return;
      status.innerHTML = msg;
      status.dataset.state = state;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Native validation still governs; we only take over the sending.
      if (!form.checkValidity()) { form.reportValidity(); return; }

      // Honeypot: a human never sees this field, so anything in it is a bot.
      // Pretend it worked rather than telling the bot it was caught.
      if (form.querySelector('[name="company"]').value) {
        say(t(form, 'msgSent'), 'ok');
        form.reset();
        return;
      }

      if (!cfg.ejsPublicKey || !cfg.ejsServiceId) {
        say(t(form, 'msgError'), 'error');
        return;
      }

      const tpl = form.dataset.emailjs === 'job' ? cfg.ejsTplJob : cfg.ejsTplEnquiry;
      const data = Object.fromEntries(new FormData(form).entries());
      delete data.company;
      // Phone is the one optional field. Left blank it would reach the email
      // template as an empty string and render as a labelled row with nothing
      // beside it; say what actually happened instead.
      if (!data.phone) data.phone = 'Not provided';
      // The resume link is optional too (applicants can email a file instead).
      const noResume = form.dataset.emailjs === 'job' && !data.resume_url;
      if (noResume) data.resume_url = 'Not provided';
      // The estimating form has no template of its own (the free plan allows two),
      // so its plans link rides in the scope block, which the enquiry template
      // prints with its line breaks. It does not ask how to reply, and the
      // template's "Prefers" row should say so rather than sit empty.
      if ('plans_url' in data) {
        data.scope += '\n\nPlans: ' + (data.plans_url || 'Not provided');
        delete data.plans_url;
      }
      if (!data.preferred_contact) data.preferred_contact = 'Not asked on this form';
      data.to_email = form.dataset.to;
      data.subject = `${data.department} — ${data.first_name} ${data.last_name}`;

      button.disabled = true;
      say(t(form, 'msgSending'), 'busy');
      try {
        await loadSdk();
        await window.emailjs.send(cfg.ejsServiceId, tpl, data);
        // No resume link: the thanks is honest that the file has not arrived yet.
        say(t(form, 'msgSent') + (noResume ? ' ' + t(form, 'msgNoresume') : ''), 'ok');
        // A job application is not a customer. Since the service pages moved to
        // the ServiceM8 embed, the job form is the only EmailJS form left, and
        // letting it fire the lead events would have Ads and Meta bidding for
        // electricians looking for work. It reports under its own name.
        if (form.dataset.emailjs === 'job') {
          track('job_application', { page: data.page, lang: data.lang });
          form.reset();
          button.textContent = label;
          return;
        }
        // The conversion the ServiceM8 frame cannot report. This form is ours
        // end to end, so the event fires only once EmailJS has confirmed the
        // send -- it means a lead actually left the building, not that someone
        // touched the form. This is the event to optimise campaigns against.
        track('generate_lead', {
          form_type: form.dataset.emailjs,
          department: data.department,
          page: data.page,
          lang: data.lang,
        });
        // And the Google Ads conversion itself. `generate_lead` is the readable
        // event for GA4 and any future container; this is the one Ads counts and
        // bids on. Both fire from the same confirmed send, so they can never
        // disagree about whether a lead happened.
        if (cfg.adsId && cfg.adsLeadLabel && typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', {
            send_to: `${cfg.adsId}/${cfg.adsLeadLabel}`,
          });
        }
        form.reset();
        button.textContent = label;
      } catch (err) {
        // Leave what they typed in place — retyping a scope of work is the
        // fastest way to lose the enquiry entirely.
        say(t(form, 'msgError'), 'error');
        // The visitor gets the friendly message; whoever is debugging needs the
        // one EmailJS actually returned — status plus text, not "[object Object]".
        console.error('[emailjs] send failed', err && err.status, err && (err.text || err.message), err);
      } finally {
        button.disabled = false;
      }
    });
  });
}

// ---- Conversion signals -----------------------------------------------------
// Written for the paid-traffic landing pages, but the hooks are data attributes
// so any page carrying them reports. Events go to dataLayer and to gtag if
// either exists and are dropped silently otherwise, so the page works today
// with no tag manager and starts reporting the moment one is added.
//
// Meta gets the same events through the same door. Two rules are worth knowing
// before adding to this. First, Meta splits events into a fixed list of
// *standard* ones it can optimise and bid against, and *custom* ones it can
// only report on -- so a lead sent as a custom event is a lead Advantage+ will
// never learn from. Anything in FB_STANDARD is mapped; everything else is
// deliberately custom, because it is not a conversion. Second, `Lead` must be
// reachable by exactly one path or it double-counts: it is mapped from
// generate_lead, which fires once, from a confirmed EmailJS send.
const FB_STANDARD = { generate_lead: 'Lead' };

const track = (name, params) => {
  const detail = params || {};
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(Object.assign({ event: name }, detail));
  if (typeof window.gtag === 'function') window.gtag('event', name, detail);
  if (typeof window.fbq === 'function') {
    const std = FB_STANDARD[name];
    if (std) window.fbq('track', std, detail);
    else window.fbq('trackCustom', name, detail);
  }
};

// Phone taps. Delegated, so a number added to a page later needs no wiring —
// only the data-call attribute naming where on the page it was tapped.
document.addEventListener('click', (e) => {
  const link = e.target.closest && e.target.closest('a[href^="tel:"]');
  if (!link) return;
  track('call_click', {
    phone: link.getAttribute('href').slice(4),
    placement: link.dataset.call || 'unknown',
  });
});

// The ServiceM8 booking form lives in a cross-origin iframe that sends no
// postMessage, so its submit is genuinely unreadable from here — there is no
// way to fire a conversion when someone books. What is observable is the moment
// focus crosses into the frame: the window blurs while document.activeElement
// is the iframe. That is an engagement signal, not a booking, and the event
// name says so. Read it as "started filling the form", never as a conversion.
// It fires once per page view, and a stray click on the frame will fire it too.
const sm8 = document.querySelector('[data-sm8]');

// Parameters worth carrying into the booking frame. Click ids first, then the
// utm_* set -- ServiceM8's own booking analytics reads utm_source and
// utm_campaign by name and stamps them on the booking, so forwarding them is
// what puts "where did this job come from" in front of LuMar inside ServiceM8,
// with no Meta or Google account involved.
const FORWARD_PARAMS = [
  'fbclid', 'gclid', 'wbraid', 'gbraid', 'msclkid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
];

// Attribution has to survive two hops: from the page the visitor landed on to
// the page where they book, and from that page into the ServiceM8 frame.
//
// ServiceM8's booking controller fires the real funnel from LuMar's own pixel
// and GA4 tag -- ViewContent, InitiateCheckout, Lead / generate_lead on submit,
// Purchase / purchase with value. But it fires from book.servicem8.com, inside
// the frame, as a brand-new GA4 session whose referrer is lumarelectric.ca. In
// the 28 days to 2026-11-07, 16 of the 22 generate_lead events landed under
// "lumarelectric.ca / referral" -- the booking was counted, its source was lost.
// Only the URL of the frame can carry the source across, so every visit now
// sends one: the ad's click ids and utm_* when there are any, otherwise a
// source worked out from the referrer (google / organic, facebook / social,
// another site / referral), otherwise (direct) / (none). GA4 inside the frame
// reads those utm_* as the session's source, and ServiceM8's
// online_booking_analytics.js stamps utm_source (utm_campaign) on the booking.
//
// The source is kept in localStorage for 30 days, last non-direct visit wins
// (the same rule GA4 uses), so someone who lands on /moncton-service-call/ from
// an ad, reads three pages and books on /contact-us/ still books as the ad.
// A plain direct visit never overwrites a stored source.
const ATTR_KEY = 'lm_attr';
const ATTR_DAYS = 30;

const referrerSource = () => {
  let host = '';
  try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { return null; }
  // Our own pages, and the booking site sending someone back, are not a source.
  if (!host || host === location.hostname.replace(/^www\./, '') || host.endsWith('lumarelectric.ca')
      || host.endsWith('servicem8.com')) return null;
  const engines = ['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia', 'brave'];
  const engine = engines.find((name) => host === name || host.startsWith(`${name}.`) || host.includes(`.${name}.`));
  if (engine) return { utm_source: engine, utm_medium: 'organic' };
  if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(host)) return { utm_source: 'facebook', utm_medium: 'social' };
  if (/(^|\.)instagram\.com$/.test(host)) return { utm_source: 'instagram', utm_medium: 'social' };
  if (/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/.test(host)) return { utm_source: 'linkedin', utm_medium: 'social' };
  return { utm_source: host, utm_medium: 'referral' };
};

const storedAttribution = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
    if (saved && saved.ts && Date.now() - saved.ts < ATTR_DAYS * 864e5) return saved.p;
  } catch (e) { /* storage blocked: fall through to direct */ }
  return null;
};

const attribution = (() => {
  const incoming = new URLSearchParams(location.search);
  const fromUrl = {};
  FORWARD_PARAMS.forEach((key) => {
    const value = incoming.get(key);
    if (value) fromUrl[key] = value;
  });
  const fresh = Object.keys(fromUrl).length ? fromUrl : referrerSource();
  if (fresh) {
    try { localStorage.setItem(ATTR_KEY, JSON.stringify({ ts: Date.now(), p: fresh })); } catch (e) { /* ignore */ }
    return fresh;
  }
  return storedAttribution() || { utm_source: '(direct)', utm_medium: '(none)' };
})();

// The fragment picks which service the form opens on, so it has to stay last:
// a query string appended after it becomes part of the fragment and never
// reaches the server.
const withAttribution = (url) => {
  const cut = url.indexOf('#');
  const base = cut === -1 ? url : url.slice(0, cut);
  const frag = cut === -1 ? '' : url.slice(cut);
  const carry = new URLSearchParams(attribution);
  return `${base}${base.includes('?') ? '&' : '?'}${carry}${frag}`;
};

// Every embedded frame and every link out to the booking site carries it. The
// frames are loading="lazy", so on most pages the new src is set before they
// ever start loading.
document.querySelectorAll('iframe[data-sm8]').forEach((frame) => {
  frame.setAttribute('src', withAttribution(frame.getAttribute('src')));
});
document.querySelectorAll('a[href*="book.servicem8.com"]').forEach((link) => {
  link.setAttribute('href', withAttribution(link.getAttribute('href')));
});

if (sm8) {
  let engaged = false;
  window.addEventListener('blur', () => {
    // activeElement is only updated after the blur has been dispatched.
    setTimeout(() => {
      if (engaged || document.activeElement !== sm8) return;
      engaged = true;
      track('booking_form_engaged');
    }, 0);
  });

  // The other half of the funnel: how many people scrolled far enough to see
  // the form at all. Engaged-over-viewed is the number worth optimising against.
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries, obs) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      obs.disconnect();
      track('booking_form_view');
    }, { threshold: 0.25 });
    seen.observe(sm8);
  }
}

// ---- Site chat --------------------------------------------------------------
// Answers come from js/chat-kb-<lang>.json, which build.py writes from this
// site's own FAQ answers, page descriptions and office details. Matching runs
// here in the browser (a small BM25 over those entries), so there is no server,
// no AI service, nothing sent anywhere, and nothing it can invent: every reply
// is text the site already shows. Below a confident match, and always for the
// topics the site must not discuss either way, it hands over to the phones and
// the ServiceM8 form in the panel's footer.
const chatSrc = document.currentScript ? document.currentScript.src : '';
const chatOpen = document.querySelector('[data-chat-open]');
const chat = document.getElementById('lumar-chat');
if (chatOpen && chat && chatSrc) {
  const fr = document.documentElement.lang.startsWith('fr');
  const siteRoot = new URL('../', chatSrc);
  const langRoot = new URL(fr ? 'fr/' : './', siteRoot);
  const here = location.pathname.replace(siteRoot.pathname, '').replace(/^fr\//, '');
  const log = chat.querySelector('.chat-log');
  const form = chat.querySelector('.chat-form');
  const input = form.querySelector('input');
  const suggest = chat.querySelector('.chat-suggest');
  const say = chat.dataset;

  const STOP = new Set(('a an the and or of to in on for at by with from is are be do does did you your yours ' +
    'we our us i me my it its this that can could would will what which who how when where why there any ' +
    'have has get le la les un une des du de d l et ou au aux en dans pour par avec sur est sont etre ' +
    'vous votre vos nous notre nos je me mon ma mes ce cet cette ces qui que quoi quel quelle quels quelles ' +
    'comment quand ou pourquoi faites faire fait il elle on y a pas ne se sa son ses ' +
    'etes ils elles suis sommes puis peux peut pouvez faut dois doit please').split(' '));
  // Words people use for the same thing, folded to one token on both sides.
  const SAME = {
    cost: 'price', costs: 'price', pricing: 'price', priced: 'price', prices: 'price', expensive: 'price',
    quote: 'price', quotes: 'price', estimate: 'price', estimates: 'price',
    prix: 'price', cout: 'price', couts: 'price', coute: 'price', coutent: 'price', coutera: 'price',
    tarif: 'price', tarifs: 'price',
    soumission: 'price', estimation: 'price',
    ev: 'charger', evs: 'charger', vehicle: 'charger', tesla: 'charger', charging: 'charger',
    borne: 'charger', bornes: 'charger', recharge: 'charger', vehicule: 'charger',
    breaker: 'panel', breakers: 'panel', panneau: 'panel', panneaux: 'panel', disjoncteur: 'panel',
    rewire: 'wiring', rewiring: 'wiring', knob: 'wiring', aluminum: 'wiring', aluminium: 'wiring',
    recablage: 'wiring', cablage: 'wiring', fils: 'wiring',
    open: 'hours', opening: 'hours', closed: 'hours', close: 'hours', heures: 'hours', horaire: 'hours',
    ouvert: 'hours', ouverts: 'hours', ouverture: 'hours', ferme: 'hours',
    address: 'office', located: 'office', location: 'office', adresse: 'office', bureau: 'office', situe: 'office',
    french: 'language', english: 'language', francais: 'language', anglais: 'language',
    bilingual: 'language', bilingue: 'language', langue: 'language',
    island: 'pei', ipe: 'pei', ile: 'pei', charlottetown: 'pei',
    financing: 'financ', finance: 'financ', financed: 'financ', financement: 'financ', financer: 'financ',
    areas: 'area', region: 'area', regions: 'area', desservez: 'serve', desservir: 'serve', served: 'serve', serving: 'serve',
    smart: 'smartspace', automation: 'smartspace', domotique: 'smartspace',
    pot: 'potlight', recessed: 'potlight', encastrees: 'potlight', encastree: 'potlight',
    hiring: 'career', jobs: 'career', job: 'career', emploi: 'career', carriere: 'career', apply: 'career',
    excavate: 'excavation', excavating: 'excavation', dig: 'excavation', digging: 'excavation',
    trench: 'excavation', trenching: 'excavation', creuser: 'excavation', tranchee: 'excavation',
  };
  // Never answered from the site, in either direction (see CLAUDE.md): emergency
  // and after-hours work, generators, solar. These go straight to the team.
  // "Do you…?" gets the FAQ's "Yes." as written; "what are your prices" does not.
  const YES_NO = /^(do|does|did|can|could|are|is|will|would|should|have|has|est ce|pouvez|faites|avez|etes|installez|desservez|offrez|travaillez|vais|puis|parlez)\b/;
  // "How long does an install take?" The site states no timelines (CLAUDE.md), so a
  // timing question gets its own hand-off -- unless the entry found is itself
  // about time ("How quickly will I hear back?", "How long have you been in business?").
  const TIMING = /\b(how long|how soon|how quick|how fast|how many (days|weeks|hours)|combien de temps|quel delai|delai|duree|en combien)\b/;
  const ABOUT_TIME = new Set(['long', 'soon', 'quick', 'quickly', 'fast', 'time', 'duree', 'delai',
    'rapidement', 'vite', 'take', 'takes', 'took', 'prend', 'prendre']);
  const OFF_LIMITS = /\b(emergenc|urgen|24 ?7|24 ?24|after ?hour|apres les heures|soir et fin|generat|generatric|solar|solaire)/;

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const stem = (w) => (w.length > 4 && /[sx]$/.test(w) ? w.slice(0, -1) : w);
  // Phrases before words: "combien de temps" is about time, "how much" (alone) about price.
  const phrases = (s) => s.replace(/\b(combien de temps|how much time)\b/g, ' duree ')
    .replace(/\bhow much\b/g, ' price ');
  const tokens = (s) => phrases(norm(s)).split(' ').filter((w) => w && !STOP.has(w))
    .map((w) => SAME[w] || SAME[stem(w)] || stem(w));

  let docs = null;
  let idf = {};
  let avg = 1;
  const build = (list) => {
    docs = list.map((d) => {
      const tf = {};
      const add = (text, weight) => tokens(text || '').forEach((w) => { tf[w] = (tf[w] || 0) + weight; });
      add(d.q, 3); add(d.kw, 3); add(d.t, d.k === 'page' ? 2 : 0.5); add(d.a, 1);
      const len = Object.values(tf).reduce((a, b) => a + b, 0);
      // What the entry is about, as opposed to everything its answer mentions.
      const about = new Set(tokens(`${d.q || ''} ${d.kw || ''} ${d.k === 'page' ? d.t : ''}`));
      return Object.assign({}, d, { tf, len, about });
    });
    const df = {};
    docs.forEach((d) => Object.keys(d.tf).forEach((w) => { df[w] = (df[w] || 0) + 1; }));
    const n = docs.length;
    Object.keys(df).forEach((w) => { idf[w] = Math.log(1 + (n - df[w] + 0.5) / (df[w] + 0.5)); });
    avg = docs.reduce((a, d) => a + d.len, 0) / n;
  };
  const best = (question) => {
    const q = [...new Set(tokens(question))];
    if (!q.length) return null;
    // A price question only ever gets the site's own answer about pricing.
    const price = q.includes('price');
    const pool = price ? docs.filter((d) => d.about.has('price')) : docs;
    const yesNo = YES_NO.test(norm(question));
    let top = null;
    pool.forEach((d) => {
      let score = 0; let hit = 0;
      q.forEach((w) => {
        const f = d.tf[w];
        if (!f) return;
        hit += 1;
        score += idf[w] * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / avg));
      });
      if (!hit) return;
      const onTopic = q.some((w) => d.about.has(w));
      // A "No." that answers some other question is worse than no answer.
      if (/^(no|non)\b/i.test(d.a) && !(yesNo && onTopic)) return;
      score *= (d.k === 'page' ? 0.85 : 1) * (d.u === here ? 1.15 : 1) * (0.5 + 0.5 * hit / q.length);
      // Matching only words buried in an answer is weak evidence: "do you do
      // underground wiring" must not land on the excavation answer's "No."
      if (!onTopic) score *= 0.6;
      if (d.i === 0) score *= 1.1;
      if (d.k === 'fact') score *= 1.25;   // written for the whole site, not one page
      if (!top || score > top.score) top = { d, score, hit, n: q.length };
    });
    // Confident enough: a real score, and most of what was asked is in the entry.
    if (top && price) return Object.assign({}, top.d, { yesNo });
    return top && top.score >= 2.2 && top.hit / top.n >= 0.5 ? Object.assign({}, top.d, { yesNo }) : null;
  };

  const handoff = chat.querySelector('[data-chat-handoff]');
  const bubble = (who, text, link, actions) => {
    const p = document.createElement('div');
    p.className = 'chat-msg chat-msg--' + who;
    p.textContent = text;
    if (link) {
      const a = document.createElement('a');
      a.href = link.href; a.textContent = link.label; a.className = 'chat-more';
      p.appendChild(a);
    }
    // The hand-off: the page's office first, the other, then the ServiceM8 form.
    if (actions && handoff) p.appendChild(handoff.content.cloneNode(true));
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  };
  const answer = (question) => {
    bubble('me', question);
    suggest.hidden = true;
    const n = norm(question);
    if (/^(merci|thanks?|thank you|ok|okay|super|parfait|great)\b/.test(n)) return bubble('bot', say.thanks);
    if (/^(hi|hello|hey|bonjour|salut|allo)\b/.test(n) && n.split(' ').length <= 2) return bubble('bot', say.hello);
    let hit = OFF_LIMITS.test(n) ? null : best(question);
    // The exception needs the same topic too: "how long does an EV install take" must
    // not ride on the financing answer's "how long does the application take".
    const asked = tokens(question);
    const timeAnswer = hit && [...hit.about].some((w) => ABOUT_TIME.has(w))
      && asked.some((w) => !ABOUT_TIME.has(w) && hit.about.has(w));
    const timing = TIMING.test(phrases(n)) && !timeAnswer;
    if (timing) hit = null;
    if (!hit) {
      track('chat_fallback', { page: location.pathname, lang: fr ? 'fr' : 'en', timing });
      bubble('bot', timing ? say.timing : say.fallback, null, true);
      return;
    }
    track('chat_answer', { kind: hit.k, page: location.pathname });
    const onPage = hit.u === here || hit.u === undefined;
    const label = hit.t ? `${say.more}: ${hit.t}` : say.more;
    const text = hit.yesNo ? hit.a : hit.a.replace(/^(Yes|Oui)\.\s+/, '');
    bubble('bot', text, onPage ? null : { href: new URL(hit.u, langRoot).href, label });
  };

  const load = () => {
    if (docs) return Promise.resolve();
    // no-cache, not no-store: it revalidates, so an unchanged file is a 304.
    return fetch(new URL(`js/chat-kb-${fr ? 'fr' : 'en'}.json`, siteRoot), { cache: 'no-cache' })
      .then((r) => r.json()).then((kb) => build(kb.docs));
  };
  // Phones. iOS Safari does not shrink the page when the keyboard opens; it slides
  // the page up instead, which pushed a full-screen panel's header off the top
  // and let the page show through above the keyboard. So the panel is sized to
  // the visual viewport (the part the keyboard leaves), follows it as it moves,
  // and the page behind is pinned so it cannot scroll underneath.
  const phone = window.matchMedia('(max-width: 560px)');
  const vv = window.visualViewport;
  const fit = () => {
    if (chat.hidden || !vv) return;
    if (phone.matches) {
      chat.style.top = `${vv.offsetTop}px`;
      chat.style.height = `${vv.height}px`;
      chat.style.bottom = chat.style.maxHeight = '';
    } else {
      // Tablets: the card stays a card, lifted clear of an on-screen keyboard.
      const hidden = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
      chat.style.bottom = hidden ? `${hidden + 12}px` : '';
      chat.style.maxHeight = hidden ? `${vv.height - 24}px` : '';
      chat.style.top = chat.style.height = '';
    }
    log.scrollTop = log.scrollHeight;
  };
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
  let pinnedAt = null;
  const pin = (on) => {
    const b = document.body.style;
    if (on && phone.matches && pinnedAt === null) {
      pinnedAt = window.scrollY;
      Object.assign(b, { position: 'fixed', top: `-${pinnedAt}px`, left: '0', right: '0' });
    } else if (!on && pinnedAt !== null) {
      b.position = b.top = b.left = b.right = '';
      // instant: the site scrolls smoothly, which would animate up from the top.
      window.scrollTo({ top: pinnedAt, behavior: 'instant' });
      pinnedAt = null;
    }
  };

  const open = () => {
    chat.hidden = false;
    chatOpen.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-is-open');
    pin(true);
    if (!log.childElementCount) {
      bubble('bot', say.hello);
      // The suggestions sit under the greeting, not floating above the input.
      log.appendChild(suggest);
      (say.suggest || '').split('|').filter(Boolean).forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = s;
        b.addEventListener('click', () => load().then(() => answer(s)));
        suggest.appendChild(b);
      });
    }
    fit();
    load().catch(() => {});
    // On a phone the keyboard waits for a tap on the input: opening it at once
    // covered half the screen before anything could be read. Focus still moves
    // into the dialog, for keyboards and screen readers.
    if (phone.matches) { chat.tabIndex = -1; chat.focus({ preventScroll: true }); }
    else input.focus();
    track('chat_open', { page: location.pathname });
  };
  const close = () => {
    chat.hidden = true;
    chatOpen.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-is-open');
    pin(false);
    chat.style.top = chat.style.height = chat.style.bottom = chat.style.maxHeight = '';
    chatOpen.focus({ preventScroll: true });
  };
  chatOpen.addEventListener('click', open);
  chat.querySelector('[data-chat-close]').addEventListener('click', close);
  chat.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    load().then(() => answer(q)).catch(() => { bubble('me', q); bubble('bot', say.fallback, null, true); });
  });
}
