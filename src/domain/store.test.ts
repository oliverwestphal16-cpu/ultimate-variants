import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TYPES,
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
} from './store';

describe('Spiel und Ideen', () => {
  it('legt ein Spiel mit den Standardtypen an', () => {
    const g = createGame('  Catan ');
    expect(g.name).toBe('Catan');
    expect(g.types).toEqual(DEFAULT_TYPES);
    expect(g.types).not.toBe(DEFAULT_TYPES);
  });

  it('übernimmt einen vorhandenen Typ unabhängig von der Schreibweise', () => {
    const g = createGame('A');
    expect(addType(g, ' setup ')).toBe('Setup');
    expect(addType(g, 'Draft')).toBe('Draft');
    expect(g.types).toHaveLength(5);
    expect(addType(g, '   ')).toBe('Setup');
  });

  it('fügt Ideen hinzu, ändert und löscht sie', () => {
    const g = createGame('A');
    const i = addIdea(g, 'Start', ' Würfeln ');
    expect(i.text).toBe('Würfeln');
    expect(i.fav).toBe(false);
    updateIdea(g, i.id, { text: 'Zweimal würfeln', type: 'Ingame' });
    expect(g.ideas[0]).toMatchObject({ text: 'Zweimal würfeln', type: 'Ingame' });
    deleteIdea(g, i.id);
    expect(g.ideas).toHaveLength(0);
  });

  it('schaltet den Favoriten um', () => {
    const g = createGame('A');
    const i = addIdea(g, 'Start', 'x');
    toggleFav(g, i.id);
    expect(g.ideas[0].fav).toBe(true);
    toggleFav(g, i.id);
    expect(g.ideas[0].fav).toBe(false);
    toggleFav(g, 'gibt-es-nicht');
  });
});

describe('groupIdeas', () => {
  it('sortiert Favoriten zuerst, dann neueste zuerst, und lässt leere Gruppen weg', () => {
    const g = createGame('A');
    const alt = addIdea(g, 'Start', 'alt', 1);
    addIdea(g, 'Start', 'neu', 3);
    const fav = addIdea(g, 'Start', 'fav', 2);
    toggleFav(g, fav.id);
    addIdea(g, 'Endgame', 'ende', 5);
    const groups = groupIdeas(g);
    expect(groups.map((x) => x.type)).toEqual(['Start', 'Endgame']);
    expect(groups[0].ideas.map((i) => i.text)).toEqual(['fav', 'neu', 'alt']);
    expect(alt.fav).toBe(false);
  });

  it('filtert auf Favoriten', () => {
    const g = createGame('A');
    addIdea(g, 'Start', 'a');
    const b = addIdea(g, 'Ingame', 'b');
    toggleFav(g, b.id);
    const groups = groupIdeas(g, true);
    expect(groups).toHaveLength(1);
    expect(groups[0].ideas[0].text).toBe('b');
  });
});

describe('searchGames', () => {
  const state = { games: [createGame('Zug um Zug'), createGame('Azul')] };
  addIdea(state.games[0], 'Setup', 'Karten offen auslegen');

  it('sortiert ohne Suche nach Name', () => {
    expect(searchGames(state, '').map((h) => h.game.name)).toEqual(['Azul', 'Zug um Zug']);
  });

  it('findet nach Name und nach Idee und zählt Treffer in Ideen', () => {
    expect(searchGames(state, 'azu').map((h) => h.game.name)).toEqual(['Azul']);
    const hits = searchGames(state, 'KARTEN');
    expect(hits).toHaveLength(1);
    expect(hits[0].hits).toBe(1);
    expect(searchGames(state, 'nichts')).toHaveLength(0);
  });
});

describe('Export und Import', () => {
  it('überträgt Spiele, Ideen und Favoriten verlustfrei', () => {
    const g = createGame('A');
    const i = addIdea(g, addType(g, 'Draft'), 'Pick & Pass');
    toggleFav(g, i.id);
    const back = parseImport(serialize({ games: [g] }));
    expect(back).toEqual({ games: [g] });
  });

  it('liest das alte Format ohne Favorit und ergänzt fehlende Typen', () => {
    const old = JSON.stringify({
      games: [{ id: 'g1', name: 'Alt', ideas: [{ id: 'i1', type: 'Sonst', text: 'Regel', ts: 5 }] }],
    });
    const s = parseImport(old);
    expect(s.games[0].types).toEqual([...DEFAULT_TYPES, 'Sonst']);
    expect(s.games[0].ideas[0]).toMatchObject({ fav: false, ts: 5, text: 'Regel' });
  });

  it('überspringt kaputte Einträge', () => {
    const s = parseImport(
      JSON.stringify({ games: [null, { name: 5 }, { name: 'OK', ideas: [null, { text: 1 }, { type: 'Start', text: 't' }] }] }),
    );
    expect(s.games).toHaveLength(1);
    expect(s.games[0].ideas).toHaveLength(1);
  });

  it('wirft bei ungültigen Daten', () => {
    expect(() => parseImport('kein json')).toThrow();
    expect(() => parseImport('{}')).toThrow();
    expect(() => parseImport('null')).toThrow();
    expect(() => parseImport('{"games":"x"}')).toThrow();
  });
});
