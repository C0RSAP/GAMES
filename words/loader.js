'use strict';
// Словарь из интернета: подгружается при старте, кэшируется в браузере на 30 дней.
// Если интернета нет — игра работает на встроенных списках words5.js / words6.js.
const NET = { 5: new Set(), 6: new Set(), status: 'загрузка словаря из интернета…', ok: false };
const NET_SOURCES = [
  'https://huggingface.co/datasets/MirrorAzure/russian-words/resolve/main/words.txt',
  'https://raw.githubusercontent.com/Harrix/Russian-Nouns/main/dist/russian_nouns.txt',
];
function netParse(text) {
  const out = { 5: new Set(), 6: new Set() };
  for (const line of text.split(/\r?\n/)) {
    const w = line.trim().toLowerCase().replace(/ё/g, 'е');
    if ((w.length === 5 || w.length === 6) && /^[а-я]+$/.test(w)) out[w.length].add(w);
  }
  return out;
}
function netApply(d) { for (const n of [5, 6]) for (const w of d[n]) NET[n].add(w); NET.ok = true; NET.status = `слов из интернета: ${NET[5].size + NET[6].size}`; }
async function loadNetWords() {
  const KEY = 'net_words_v1', DAY = 864e5;
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    if (c && c[5] && c[6]) { netApply({ 5: c[5], 6: c[6] }); if (Date.now() - c.t < 30 * DAY) return; }
  } catch (_) { }
  const merged = { 5: new Set(), 6: new Set() };
  for (const url of NET_SOURCES) {
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 30000);
      const r = await fetch(url, { signal: ac.signal }); clearTimeout(to);
      if (!r.ok) continue;
      const d = netParse(await r.text());
      if (d[5].size < 500 && d[6].size < 500) continue; // файл подозрительно мал — пропускаем
      for (const n of [5, 6]) for (const w of d[n]) merged[n].add(w);
    } catch (_) { }
  }
  if (merged[5].size || merged[6].size) {
    netApply(merged);
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), 5: [...NET[5]], 6: [...NET[6]] })); } catch (_) { }
  } else if (!NET.ok) NET.status = 'интернет-словарь недоступен — играем на встроенном';
}
loadNetWords();
