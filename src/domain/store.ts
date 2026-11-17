export interface Idea {
  id: string;
  type: string;
  text: string;
  ts: number;
  fav: boolean;
}

export interface Game {
  id: string;
  name: string;
  types: string[];
  ideas: Idea[];
}

export interface State {
  games: Game[];
}

export const DEFAULT_TYPES = ['Setup', 'Start', 'Ingame', 'Endgame'];

export const uid = (): string => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export function createGame(name: string): Game {
  return { id: uid(), name: name.trim(), types: [...DEFAULT_TYPES], ideas: [] };
}

/** Adds a type unless one with the same name (case-insensitive) exists; returns the effective type name. */
export function addType(game: Game, name: string): string {
  const n = name.trim();
  if (!n) return game.types[0];
  const existing = game.types.find((t) => t.toLowerCase() === n.toLowerCase());
  if (existing) return existing;
  game.types.push(n);
  return n;
}

export function addIdea(game: Game, type: string, text: string, now = Date.now()): Idea {
  const idea: Idea = { id: uid(), type, text: text.trim(), ts: now, fav: false };
  game.ideas.push(idea);
  return idea;
}

export function updateIdea(game: Game, id: string, patch: { type?: string; text?: string }): void {
  const idea = game.ideas.find((i) => i.id === id);
  if (!idea) return;
  if (patch.text !== undefined) idea.text = patch.text.trim();
  if (patch.type !== undefined) idea.type = patch.type;
}

export function deleteIdea(game: Game, id: string): void {
  game.ideas = game.ideas.filter((i) => i.id !== id);
}

export function toggleFav(game: Game, id: string): void {
  const idea = game.ideas.find((i) => i.id === id);
  if (idea) idea.fav = !idea.fav;
}

export interface Group {
  type: string;
  ideas: Idea[];
}

/** Ideas per type: favourites first, then newest first. Empty groups are omitted. */
export function groupIdeas(game: Game, favOnly = false): Group[] {
  return game.types
    .map((type) => ({
      type,
      ideas: game.ideas
        .filter((i) => i.type === type && (!favOnly || i.fav))
        .sort((a, b) => Number(b.fav) - Number(a.fav) || b.ts - a.ts),
    }))
    .filter((g) => g.ideas.length > 0);
}

export interface GameHit {
  game: Game;
  hits: number;
}

/** Games sorted by name; with a query only games whose name or ideas match. */
export function searchGames(state: State, query: string): GameHit[] {
  const q = query.trim().toLowerCase();
  const out: GameHit[] = [];
  for (const game of [...state.games].sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
    const nameHit = game.name.toLowerCase().includes(q);
    const hits = q ? game.ideas.filter((i) => i.text.toLowerCase().includes(q)).length : 0;
    if (q && !nameHit && !hits) continue;
    out.push({ game, hits });
  }
  return out;
}

export function serialize(state: State): string {
  return JSON.stringify(state, null, 2);
}

/** Parses exported JSON (also the older format without `fav`). Throws on invalid input. */
export function parseImport(text: string): State {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object' || !Array.isArray((data as { games?: unknown }).games)) {
    throw new Error('invalid');
  }
  const games: Game[] = [];
  for (const raw of (data as { games: unknown[] }).games) {
    if (!raw || typeof raw !== 'object') continue;
    const g = raw as Record<string, unknown>;
    if (typeof g.name !== 'string') continue;
    const types = Array.isArray(g.types) && g.types.length ? g.types.map(String) : [...DEFAULT_TYPES];
    const ideas: Idea[] = [];
    for (const r of Array.isArray(g.ideas) ? g.ideas : []) {
      if (!r || typeof r !== 'object' || typeof (r as { text?: unknown }).text !== 'string') continue;
      const i = r as Record<string, unknown>;
      ideas.push({
        id: String(i.id || uid()),
        type: String(i.type),
        text: i.text as string,
        ts: Number(i.ts) || Date.now(),
        fav: i.fav === true,
      });
    }
    for (const i of ideas) if (!types.includes(i.type)) types.push(i.type);
    games.push({ id: String(g.id || uid()), name: g.name, types, ideas });
  }
  return { games };
}
