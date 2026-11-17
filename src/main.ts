import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import {
  type Game,
  type State,
  addIdea,
  addType,
  createGame,
  deleteIdea,
  groupIdeas,
  parseImport,
  searchGames,
  serialize,
  toggleFav,
  updateIdea,
} from './domain/store';

registerSW({ immediate: true });

const KEY = 'ultimate-variants-v1';

type Sheet =
  | { k: 'idea'; id: string | null; type: string; text: string; adding: boolean; newType: string; confirm: boolean }
  | { k: 'newgame'; text: string }
  | { k: 'game'; text: string; confirm: boolean }
  | { k: 'settings'; imp: string; confirm: boolean; msg: string };

let S: State = { games: [] };
let view: { name: 'list' | 'game'; id: string | null } = { name: 'list', id: null };
let q = '';
let favOnly = false;
let sheet: Sheet | null = null;
const lastType: Record<string, string> = {};

function load(): void {
  try {
    const r = localStorage.getItem(KEY);
    if (r) S = parseImport(r);
  } catch {
    /* leerer Start */
  }
}
function save(): void {
  try {
    localStorage.setItem(KEY, serialize(S));
  } catch {
    /* Speicher nicht verfügbar */
  }
}

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const cur = (): Game | undefined => S.games.find((g) => g.id === view.id);
const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function render(): void {
  const app = $('app');
  if (view.name === 'list') {
    app.innerHTML = `<header class="top"><h1>Ultimate Variants</h1><button class="icon" data-act="settings" aria-label="Einstellungen">⚙</button></header>
    <div class="searchwrap"><input id="q" type="search" placeholder="Spiel oder Idee suchen" value="${esc(q)}" autocomplete="off"></div>
    <main id="results"></main><button class="fab" data-act="newgame">+ Spiel</button>`;
    renderList();
  } else {
    const g = cur();
    if (!g) {
      view = { name: 'list', id: null };
      return render();
    }
    const groups = groupIdeas(g, favOnly);
    const body = groups.length
      ? groups
          .map(
            (x) => `<section class="grp"><h2>${esc(x.type)} <span class="count">${x.ideas.length}</span></h2>${x.ideas
              .map(
                (i) =>
                  `<div class="idearow"><button class="idea" data-act="edit" data-id="${i.id}">${esc(i.text)}</button><button class="star ${i.fav ? 'on' : ''}" data-act="fav" data-id="${i.id}" aria-pressed="${i.fav}" aria-label="Favorit">${i.fav ? '★' : '☆'}</button></div>`,
              )
              .join('')}</section>`,
          )
          .join('')
      : `<div class="empty">${favOnly ? 'Noch keine Favoriten.' : 'Noch keine Ideen.<br>Tippe auf +, um die erste festzuhalten.'}</div>`;
    app.innerHTML = `<header class="top"><button class="icon" data-act="back" aria-label="Zurück">←</button><h1>${esc(g.name)}</h1><button class="icon" data-act="gameopts" aria-label="Spiel bearbeiten">⋯</button></header>
    <div class="chips"><button class="chip ${favOnly ? 'on' : ''}" data-act="favfilter" aria-pressed="${favOnly}">★ Nur Favoriten</button></div>
    ${body}
    <button class="fab round" data-act="addidea" aria-label="Neue Idee">+</button>`;
  }
  renderSheet();
}

function renderList(): void {
  const hits = searchGames(S, q);
  const t = q.trim();
  $('results').innerHTML = hits.length
    ? hits
        .map(({ game: g, hits: n }) => {
          const meta = t && n ? `${n} Treffer in Ideen` : `${g.ideas.length} ${g.ideas.length === 1 ? 'Idee' : 'Ideen'}`;
          return `<button class="card" data-act="open" data-id="${g.id}"><span class="gname">${esc(g.name)}</span><span class="meta">${meta}</span></button>`;
        })
        .join('')
    : `<div class="empty">${S.games.length ? 'Nichts gefunden.' : 'Noch kein Spiel.<br>Lege mit „+ Spiel“ das erste an.'}</div>`;
}

function renderSheet(): void {
  const el = $('sheet');
  const s = sheet;
  if (!s) {
    el.innerHTML = '';
    return;
  }
  let h = '';
  let focus: string | null = null;
  if (s.k === 'idea') {
    const g = cur()!;
    h = `<h3>${s.id ? 'Idee bearbeiten' : 'Neue Idee'}</h3><div class="chips">${g.types
      .map((t) => `<button class="chip ${t === s.type ? 'on' : ''}" data-act="pick" data-type="${esc(t)}">${esc(t)}</button>`)
      .join('')}${
      s.adding
        ? `<input id="nt" class="chipin" data-bind="newType" placeholder="Neuer Typ" value="${esc(s.newType)}"><button class="chip on" data-act="confirmtype">OK</button>`
        : `<button class="chip ghost" data-act="addtype">+ Typ</button>`
    }</div>
    <textarea id="tx" data-bind="text" rows="6" placeholder="Idee notieren …">${esc(s.text)}</textarea>
    <div class="row"><button class="btn primary" data-act="saveidea">Speichern</button>${
      s.id ? `<button class="btn danger" data-act="delidea">${s.confirm ? 'Wirklich löschen?' : 'Löschen'}</button>` : ''
    }<button class="btn" data-act="close">Abbrechen</button></div>`;
    focus = s.adding ? 'nt' : s.id ? null : 'tx';
  } else if (s.k === 'newgame') {
    h = `<h3>Neues Spiel</h3><input id="gn" data-bind="text" placeholder="Name des Spiels" value="${esc(s.text)}" autocomplete="off"><div class="row"><button class="btn primary" data-act="savegame">Anlegen</button><button class="btn" data-act="close">Abbrechen</button></div>`;
    focus = 'gn';
  } else if (s.k === 'game') {
    h = `<h3>Spiel bearbeiten</h3><input id="gn" data-bind="text" value="${esc(s.text)}" autocomplete="off"><div class="row"><button class="btn primary" data-act="renamegame">Umbenennen</button><button class="btn danger" data-act="delgame">${
      s.confirm ? 'Mit allen Ideen löschen?' : 'Spiel löschen'
    }</button><button class="btn" data-act="close">Schließen</button></div>`;
  } else {
    h = `<h3>Sicherung</h3><p class="hint">Deine Daten liegen nur in diesem Browser. Exportiere sie regelmäßig als Datei.</p>
    <div class="row" style="margin-top:0"><button class="btn primary" data-act="export">Exportieren</button></div>
    <div class="sep"></div><h3>Import</h3><p class="hint">Exportierte Datei wählen. Ersetzt alle aktuellen Daten.</p>
    <div class="row"><input type="file" id="file" accept=".json,application/json,text/plain" style="flex:1"><button class="btn danger" data-act="doimport">${
      s.confirm ? 'Sicher? Ersetzen' : 'Importieren'
    }</button></div>
    ${s.msg ? `<p class="hint">${esc(s.msg)}</p>` : ''}<div class="row"><button class="btn" data-act="close">Schließen</button></div>`;
  }
  el.innerHTML = `<div class="scrim"><div class="sheet">${h}</div></div>`;
  if (focus) {
    const f = $(focus) as HTMLInputElement | HTMLTextAreaElement | null;
    if (f) {
      f.focus();
      if (f.value) {
        try {
          f.setSelectionRange(f.value.length, f.value.length);
        } catch {
          /* Eingabetyp ohne Auswahl */
        }
      }
    }
  }
}

function doExport(s: Extract<Sheet, { k: 'settings' }>): void {
  const blob = new Blob([serialize(S)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ultimate-variants-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  s.msg = 'Export gespeichert.';
  renderSheet();
}

function doImport(s: Extract<Sheet, { k: 'settings' }>): void {
  try {
    S = parseImport(s.imp);
    save();
    view = { name: 'list', id: null };
    sheet = null;
    render();
  } catch {
    s.confirm = false;
    s.msg = 'Die Daten konnten nicht gelesen werden.';
    renderSheet();
  }
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList?.contains('scrim')) {
    sheet = null;
    renderSheet();
    return;
  }
  const b = target.closest<HTMLElement>('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  const g = view.name === 'game' ? cur() : undefined;
  const s = sheet;
  switch (a) {
    case 'settings':
      sheet = { k: 'settings', imp: '', confirm: false, msg: '' };
      renderSheet();
      break;
    case 'newgame':
      sheet = { k: 'newgame', text: '' };
      renderSheet();
      break;
    case 'savegame': {
      if (s?.k !== 'newgame') return;
      const n = s.text.trim();
      if (!n) return;
      const ng = createGame(n);
      S.games.push(ng);
      save();
      sheet = null;
      favOnly = false;
      view = { name: 'game', id: ng.id };
      render();
      window.scrollTo(0, 0);
      break;
    }
    case 'open':
      favOnly = false;
      view = { name: 'game', id: b.dataset.id! };
      render();
      window.scrollTo(0, 0);
      break;
    case 'back':
      view = { name: 'list', id: null };
      render();
      break;
    case 'favfilter':
      favOnly = !favOnly;
      render();
      break;
    case 'fav':
      if (g) {
        toggleFav(g, b.dataset.id!);
        save();
        render();
      }
      break;
    case 'addidea':
      if (g) {
        const lt = lastType[g.id];
        sheet = { k: 'idea', id: null, type: lt && g.types.includes(lt) ? lt : g.types[0], text: '', adding: false, newType: '', confirm: false };
        renderSheet();
      }
      break;
    case 'edit': {
      const i = g?.ideas.find((x) => x.id === b.dataset.id);
      if (i) {
        sheet = { k: 'idea', id: i.id, type: i.type, text: i.text, adding: false, newType: '', confirm: false };
        renderSheet();
      }
      break;
    }
    case 'pick':
      if (s?.k === 'idea') {
        s.type = b.dataset.type!;
        renderSheet();
      }
      break;
    case 'addtype':
      if (s?.k === 'idea') {
        s.adding = true;
        renderSheet();
      }
      break;
    case 'confirmtype':
      if (s?.k === 'idea' && g) {
        if (s.newType.trim()) {
          s.type = addType(g, s.newType);
          save();
        }
        s.adding = false;
        s.newType = '';
        renderSheet();
      }
      break;
    case 'saveidea': {
      if (s?.k !== 'idea' || !g) return;
      const t = s.text.trim();
      if (!t) return;
      if (s.id) updateIdea(g, s.id, { text: t, type: s.type });
      else addIdea(g, s.type, t);
      lastType[g.id] = s.type;
      save();
      sheet = null;
      render();
      break;
    }
    case 'delidea':
      if (s?.k !== 'idea' || !g || !s.id) return;
      if (!s.confirm) {
        s.confirm = true;
        renderSheet();
      } else {
        deleteIdea(g, s.id);
        save();
        sheet = null;
        render();
      }
      break;
    case 'gameopts':
      if (g) {
        sheet = { k: 'game', text: g.name, confirm: false };
        renderSheet();
      }
      break;
    case 'renamegame': {
      if (s?.k !== 'game' || !g) return;
      const n = s.text.trim();
      if (!n) return;
      g.name = n;
      save();
      sheet = null;
      render();
      break;
    }
    case 'delgame':
      if (s?.k !== 'game' || !g) return;
      if (!s.confirm) {
        s.confirm = true;
        renderSheet();
      } else {
        S.games = S.games.filter((x) => x.id !== g.id);
        save();
        sheet = null;
        view = { name: 'list', id: null };
        render();
      }
      break;
    case 'export':
      if (s?.k === 'settings') doExport(s);
      break;
    case 'doimport':
      if (s?.k !== 'settings') return;
      if (!s.imp.trim()) {
        s.msg = 'Bitte zuerst eine Datei wählen.';
        renderSheet();
      } else if (!s.confirm) {
        s.confirm = true;
        renderSheet();
      } else doImport(s);
      break;
    case 'close':
      sheet = null;
      renderSheet();
      break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.id === 'q') {
    q = t.value;
    renderList();
    return;
  }
  const bind = t.dataset?.bind;
  if (bind && sheet) {
    (sheet as unknown as Record<string, unknown>)[bind] = t.value;
    if ('confirm' in sheet) sheet.confirm = false;
  }
});

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id === 'file' && t.files?.[0] && sheet?.k === 'settings') {
    const s = sheet;
    const r = new FileReader();
    r.onload = () => {
      s.imp = String(r.result ?? '');
      s.confirm = false;
      s.msg = 'Datei geladen. Jetzt „Importieren“ tippen.';
      renderSheet();
    };
    r.readAsText(t.files[0]);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !sheet) return;
  const id = (e.target as HTMLElement).id;
  if (id === 'gn') document.querySelector<HTMLElement>(sheet.k === 'newgame' ? '[data-act="savegame"]' : '[data-act="renamegame"]')?.click();
  if (id === 'nt') document.querySelector<HTMLElement>('[data-act="confirmtype"]')?.click();
});

load();
render();
