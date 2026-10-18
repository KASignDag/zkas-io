// Local translation dictionaries: page text stays on this origin.
(() => {
  const picker = document.getElementById('siteLanguage');
  if (!picker) return;

  const supported = new Set([...picker.options].map(option => option.value));
  const excluded = 'script, style, svg, canvas, pre, code, [data-no-i18n], #siteViewCount, .brand, .footer-brand, .wallet-icon';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const hasLetters = value => /\p{L}/u.test(value);
  const units = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const original = node.nodeValue;
    if (!node.parentElement.closest(excluded) && hasLetters(original)) {
      units.push({ node, original, key: normalize(original) });
    }
  }
  document.querySelectorAll('[aria-label], [title], img[alt]').forEach(element => {
    if (element.closest(excluded)) return;
    ['aria-label', 'title', 'alt'].forEach(attribute => {
      const original = element.getAttribute(attribute);
      if (original && hasLetters(original)) units.push({ element, attribute, original, key: normalize(original) });
    });
  });
  const originalTitle = document.title;
  const description = document.querySelector('meta[name="description"]');
  const originalDescription = description?.content;
  const status = document.getElementById('languageStatus');
  const note = document.getElementById('translationNote');
  const dictionaries = new Map();
  let current = 'en';
  let request = 0;

  function apply(code, dictionary) {
    units.forEach(unit => {
      const translated = dictionary?.[unit.key];
      if (unit.attribute) {
        unit.element.setAttribute(unit.attribute, translated || unit.original);
      } else {
        unit.node.nodeValue = translated
          ? unit.original.match(/^\s*/)[0] + translated + unit.original.match(/\s*$/)[0]
          : unit.original;
      }
    });
    document.title = dictionary?.[originalTitle] || originalTitle;
    if (description) description.content = dictionary?.[originalDescription] || originalDescription;
    document.documentElement.lang = code;
    document.documentElement.dir = ['ar', 'fa', 'ur'].includes(code) ? 'rtl' : 'ltr';
    current = code;
    picker.value = code;
    note.hidden = code === 'en';
  }

  async function setLanguage(code, remember = false) {
    if (!supported.has(code)) code = 'en';
    const token = ++request;
    status.textContent = '';
    picker.setAttribute('aria-busy', 'true');
    try {
      let dictionary = null;
      if (code !== 'en') {
        dictionary = dictionaries.get(code);
        if (!dictionary) {
          const response = await fetch(`i18n/${code}.json`);
          if (!response.ok) throw new Error('Translation unavailable');
          dictionary = await response.json();
          if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) throw new Error('Invalid translation');
          const keys = [...units.map(unit => unit.key), originalTitle, originalDescription].filter(Boolean);
          if (keys.some(key => typeof dictionary[key] !== 'string' || !dictionary[key].trim())) throw new Error('Incomplete translation');
          dictionaries.set(code, dictionary);
        }
      }
      if (token !== request) return;
      apply(code, dictionary);
      if (remember) {
        try { localStorage.setItem('zkas-io-language', code); } catch (_) { /* Storage may be disabled. */ }
        const url = new URL(location.href);
        if (code === 'en') url.searchParams.delete('lang');
        else url.searchParams.set('lang', code);
        history.replaceState(null, '', url);
      }
    } catch (error) {
      if (token !== request) return;
      picker.value = current;
      status.textContent = dictionaries.get(current)?.['Language could not be loaded. Please try again.'] || 'Language could not be loaded. Please try again.';
      console.warn('Translation could not be loaded:', error);
    } finally {
      if (token === request) picker.removeAttribute('aria-busy');
    }
  }

  picker.addEventListener('change', () => setLanguage(picker.value, true));
  let saved;
  try { saved = localStorage.getItem('zkas-io-language'); } catch (_) { /* English remains available. */ }
  const requested = new URL(location.href).searchParams.get('lang');
  setLanguage(requested || saved || 'en');
})();
