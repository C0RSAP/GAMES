'use strict';
// Слова из интернета (открытые источники). Кэш в браузере на 30 дней; без сети игра работает на встроенных списках.
//  - существительные (GitHub, Harrix/Russian-Nouns) -> ЗАГАДЫВАЕМЫЕ слова (NET.sec) и допустимые попытки
//  - все слова русского языка (Hugging Face, MirrorAzure/russian-words) -> допустимые попытки (NET[5], NET[6])
const NET = { 5: new Set(), 6: new Set(), sec: { 5: new Set(), 6: new Set() }, status: 'загрузка словаря из интернета…', ok: false };
const NET_SOURCES = [
  { url: 'https://raw.githubusercontent.com/Harrix/Russian-Nouns/main/dist/russian_nouns.txt', secret: true },
  { url: 'https://huggingface.co/datasets/MirrorAzure/russian-words/resolve/main/words.txt', secret: false },
];
function netParse(text) {
  const out = { 5: new Set(), 6: new Set() };
  for (const line of text.split(/\r?\n/)) {
    const w = line.trim().toLowerCase().replace(/ё/g, 'е');
    if ((w.length === 5 || w.length === 6) && /^[а-я]+$/.test(w)) out[w.length].add(w);
  }
  return out;
}
function netApply(v, s) {
  for (const n of [5, 6]) { for (const w of v[n]) NET[n].add(w); for (const w of s[n]) { NET.sec[n].add(w); NET[n].add(w); } }
  NET.ok = true; NET.status = `из интернета: ${NET.sec[5].size + NET.sec[6].size} загадываемых, ${NET[5].size + NET[6].size} допустимых слов`;
}
async function loadNetWords() {
  const KEY = 'net_words_v2', DAY = 864e5;
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    if (c && c.v5) { netApply({ 5: c.v5, 6: c.v6 }, { 5: c.s5, 6: c.s6 }); if (Date.now() - c.t < 30 * DAY) return; }
  } catch (_) { }
  const v = { 5: new Set(), 6: new Set() }, s = { 5: new Set(), 6: new Set() };
  for (const { url, secret } of NET_SOURCES) {
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 30000);
      const r = await fetch(url, { signal: ac.signal }); clearTimeout(to);
      if (!r.ok) continue;
      const d = netParse(await r.text());
      if (d[5].size < 500 && d[6].size < 500) continue; // файл подозрительно мал — пропускаем
      for (const n of [5, 6]) for (const w of d[n]) (secret ? s : v)[n].add(w);
    } catch (_) { }
  }
  if (v[5].size || v[6].size || s[5].size || s[6].size) {
    netApply(v, s);
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v5: [...NET[5]], v6: [...NET[6]], s5: [...NET.sec[5]], s6: [...NET.sec[6]] })); } catch (_) { }
  } else if (!NET.ok) NET.status = 'интернет-словарь недоступен — играем на встроенном';
}
loadNetWords();
