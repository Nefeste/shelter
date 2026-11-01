This is an Expo/React Native mobile game («Убежище», Shelter) for RuStore: a short-session game
about preparing for real emergencies. Each level is a chain «беда → решение → новая беда»: the
player picks one of four solutions with different costs, can upgrade a cheap one later, and then
lives through 14 days of the emergency, computed day by day. Prioritize mobile-first patterns,
calm and honest UX, correctness of every fact, and a pure deterministic engine.

## Studio charter — read first

This project belongs to the «Горница» studio. Studio-wide rules live only in the public
charter repository `Nefeste/gornitsa` (https://github.com/Nefeste/gornitsa); this repository
keeps only what is specific to the project. Before changing anything — and after a context
reset — read the charter's `AGENTS.md`, then `docs/05-rules.md` (hard rules for every game)
and `docs/04-process.md` (how work is done). Raw files:
`https://raw.githubusercontent.com/Nefeste/gornitsa/main/<path>`.

Current state of this project: `STATUS.md` (it is not repeated here).

Precedence: the owner's recorded decision → the charter → this project's documents. A project
rule may narrow a charter rule, never weaken it. If a document here restates or contradicts
the charter, replace it with a link or report the contradiction to the owner.

## Read `docs/` before changing anything

The project documents itself in [`docs/`](docs/README.md), in Russian. Start there:

- `docs/README.md` — index and reading order.
- `docs/01-product.md` — what we promise the player, what is deliberately absent, the vocabulary
  (UI and code terms must match it).
- `docs/specs/2026-11-prototype.md` — the live specification: what the prototype must answer.
- `docs/adr/` — decisions that are expensive to reverse; read the relevant one *before*
  proposing the opposite. `docs/adr/0001-studio-adrs.md` says how the studio ADRs apply here.

The idea and the owner's decisions behind the game (№118–123) live in the studio's internal
repository: `Nefeste/uprava`, `plan/reserve-2026-11.md`, section 6.

## Hard rules

Studio-wide rules — no React Native `Alert`, player-facing strings only in `src/i18n/` and
`content/`, generated `ios/`/`android/`, a permanent application id and signing key, a pure
engine, no pressure, content only from named sources — are in the charter's `docs/05-rules.md`
and are not repeated here. This project's own rules:

- **Every fact comes from a named source** (МЧС России, Росстат, official civil-defence norms,
  open government guides): water and food norms, what a solution does, why a trap fails. Never
  from memory, never from videos, games or forums. Every content record carries `sources` and
  `review: draft`; only a human raises it to `checked`.
- **Goods are real, but without brands or shops**: a goods card is a generic product anyone can
  buy in a supermarket or on a marketplace («вода питьевая, 5 л»). No trade marks, no shop or
  marketplace names, no purchase links. Prices come from Росстат average consumer prices where
  the item is there; otherwise a range marked «оценка».
- **No harm**: no doses or regimens of medicines (drug classes only, as in `Nefeste/anamnez`
  ADR 0012), no weapons, no instructions that are dangerous in real life. A trap teaches a real
  mistake from a named guide; it is never a trick.
- **Calm tone**: preparation, not fear. Emergency scenarios are household ones first; the nuclear
  shelter is the last level, in the spirit of civil defence — no war, no enemies, no countries
  (owner's decision №122).
- **Time is game time.** A deadline («через три дня буран») counts in-game working hours. There
  is no real-time timer, no energy, no streaks (charter «Без давления»).
- **The engine is pure TypeScript** (`src/engine/`): integers, no React, no `Date`, no
  `Math.random`; randomness only from a recorded seed. The same choices give the same 14 days.

## Expo and native SDKs

Planned Expo SDK 57, as the sister projects. Never write Expo or React Native code from memory —
follow «Expo has changed» in the charter's `AGENTS.md`.

## Commands

There is no code yet: the prototype specification comes first (charter `docs/04-process.md`).
The commands appear here with the first code PR.
