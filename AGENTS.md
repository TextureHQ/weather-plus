# Repository Guidelines

## Project Structure & Module Organization
- `src/` houses all TypeScript source; entry point is `src/index.ts`, with domain logic in `weatherService.ts` and provider implementations under `src/providers/`.
- Each provider keeps its own helpers (`openweather/`, `nws/`, `tomorrow/`) and colocated tests (`*.test.ts`). Shared contracts live in `interfaces.ts` and `providers/IWeatherProvider.ts`.
- Utilities (caching, error taxonomy, normalization) sit in `src/utils/` and `src/errors.ts`. Build artifacts publish to `dist/` (CJS and ESM). Architectural notes and RFCs reside in `docs/rfcs/`.

## Build, Test, and Development Commands
- `yarn build` compiles both CJS and ESM bundles to `dist/`, cleaning the directory via the `prebuild` hook.
- `yarn build:cjs` / `yarn build:esm` generate a single module target when you need faster iteration.
- `yarn dev` watches the compiler (`tsc-watch`) and re-runs `node dist/index.js` after successful builds for local experimentation.
- `yarn test` runs the Jest suite once; `yarn test:watch` keeps Jest hot during development; `yarn coverage` enforces coverage expectations and refreshes the `coverage/` report.
- `yarn lint` runs Biome across the repo; fix any reported issues or explicitly suppress with justification.

## Coding Style & Naming Conventions
- Write modern, strict TypeScript (see `tsconfig.json`: `strict: true`, ES6 modules). Prefer named exports, keeping default exports limited to top-level entry points (`WeatherPlus`).
- Use two-space indentation, camelCase for functions/variables, PascalCase for classes/types, and SCREAMING_CASE for constants. Match existing file casing (e.g., `providerRegistry.ts`, `weatherService.ts`) to stay consistent.
- Keep provider adapters cohesive: map external API responses to internal interfaces inside the provider module, and surface errors via the shared `errors` utilities. Biome (`biome.json`) enforces formatting, import order, and lint defaults—run it before committing changes.

## Testing Guidelines
- Jest powers unit and integration tests; colocate new specs as `*.test.ts` alongside the module under test.
- Aim to maintain or raise branch coverage (track with `yarn coverage`). Focus on edge cases around provider fallbacks, caching, and normalization.
- Snapshot tests live under `__snapshots__/`; regenerate only when intentional API responses change and review diffs carefully.

## Commit & Pull Request Guidelines
- Follow the prevailing Conventional Commit style (`feat(scope): ...`, `test: ...`, `chore: ...`). Reference related RFC IDs or providers in the scope when relevant.
- Before opening a PR, ensure `yarn test` and `yarn build` pass, link any issue or RFC context, and include screenshots or sample payloads when behavior changes.
- Keep PR descriptions action-oriented: summarize the outcome, highlight provider impacts, and call out any required configuration (API keys, Redis).
