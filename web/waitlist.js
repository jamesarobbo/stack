import { PRODUCT_NAME, WAITLIST_API_BASE, WAITLIST_PATH } from './config.js';

for (const node of document.querySelectorAll('[data-product-name]')) {
  node.textContent = PRODUCT_NAME;
}

const header = document.querySelector('[data-header]');
const onScroll = () => {
  if (!header) return;
  header.classList.toggle('is-scrolled', window.scrollY > 8);
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  for (const node of document.querySelectorAll('.reveal')) observer.observe(node);
} else {
  for (const node of document.querySelectorAll('.reveal')) node.classList.add('is-in');
}

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

const form = document.querySelector('[data-waitlist-form]');
const status = document.querySelector('[data-form-status]');

function setStatus(message, tone) {
  if (!status) return;
  status.textContent = message;
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const company = String(data.get('company') || '');
  if (!email || !email.includes('@')) {
    setStatus('Enter a valid email address.', 'err');
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  setStatus('Saving…');

  try {
    const response = await fetch(`${WAITLIST_API_BASE}${WAITLIST_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        company,
        source: 'landing',
        ...readUtm(),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(typeof body.error === 'string' ? body.error : 'Something went wrong. Try again.', 'err');
      return;
    }
    setStatus(body.status === 'exists' ? 'You are already on the list.' : 'You are on the list.', 'ok');
    form.reset();
  } catch {
    setStatus('Could not reach the server. Try again in a moment.', 'err');
  } finally {
    if (button) button.disabled = false;
  }
});
