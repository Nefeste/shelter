This is an Expo/React Native mobile game («Наготове», formerly «Убежище»; repository and app id `shelter`) for RuStore: a short-session game
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
- `docs/08-game-design.md` — the game as it should ship in 1.0; **rule numbers live there, record
  numbers only in `content/`**.
- `docs/09-content.md` — where facts and prices come from; read before any record in `content/`.
- `docs/02-architecture.md`, `docs/03-server-api.md` (no server), `docs/04-data-model.md` — how it is built.
- `docs/05-process.md`, `docs/06-testing.md` — versions, CI, release; what to run.
- `docs/07-roadmap.md` — stages, what is left in the prototype, the line of scenarios, owner decisions.
- `docs/specs/2026-11-prototype.md` — the live specification: what the prototype must answer.
- `docs/10-money.md`, `docs/11-market.md`; `docs/journal/YYYY-MM.md` — the journal, one file a month.
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

```bash
npm ci                              # dependencies (Bun runs tests and tools)
npx expo install <package>          # ALWAYS instead of npm/yarn/bun add for Expo/RN packages
npm run content                     # build and validate content/ → src/content/generated (not in git)
npx expo start                      # dev server
npm run typecheck                   # content + tsc (app) + tsc -p tools
npm run lint                        # zero warnings
npm test                            # content + bun test tools/test
npm run sim                         # virtual player: all combinations → docs/reports/2026-11-virtual-player.md
EXPO_OFFLINE=1 npm run export:web && npm run e2e   # web build + Playwright scenario, screenshots in tools/e2e/out
```

Run content, typecheck, lint and tests before every push; for UI changes also the browser scenario
(`.github/workflows/pr.yml` runs the first four on every PR; the APK is built only on a `vX.Y.Z`
tag by `android.yml`, with the kit's signing and contents actions).

## Project map

- `content/` — scenario, troubles with their four solutions, goods, shops, sources (YAML; player
  texts live here and in `src/i18n`). `tools/content/build.ts` validates: four tiers per trouble,
  a source or a `todo` on every record, no brands, shop names, doses or Latin in player text.
- `src/engine/` — `prep.ts` (choose, replace/upgrade, money, hours, place, shop trips, delivery),
  `days.ts` (14 days, integers, seeded risks and thaw, evacuation instead of death), `review.ts`.
- `src/version.ts` — the version for «Об игре», checked by `tools/test/version.test.ts` against
  `app.json`, `package.json`, `package-lock.json` and `STATUS.md`.
- `src/state/game.ts` — the run; `src/screens/` — title, intro, prep, days, result, about;
  `src/ui/` — tokens from the studio brand, kit, drawings in `react-native-svg` (`Scene.tsx` — the
  house of the 14 days and the result, `icons.tsx` — trouble icons, `Snow.tsx`); `src/audio/sound.ts`
  — expo-audio, sound on/off in settings; `src/i18n/` — all UI text. `src/state/checklist.ts` —
  «Мой список» by category with prices and totals; `src/state/voices.ts` + `src/ui/Bubble.tsx` — the
  family's lines from `content/voices.yaml` (flavour, not facts: no numbers, no sources).
- `assets/audio/` — synthesized sounds, made by `npm run sound` (`tools/sound/gen.ts`, byte-exact
  test); never edit or add recordings by hand.
- `tools/test/` — engine, content, guardrails, i18n, sound, version; `tools/e2e/browser.ts` — the browser scenario.
- `tools/sim/player.ts` — the «virtual player» (`npm run sim`, a few minutes): every combination of
  solutions, four ordering habits, seeds 1…30; writes `docs/reports/2026-11-virtual-player.md`. Any
  change to content numbers, prices or the engine re-runs it, and the report goes into the same PR.
