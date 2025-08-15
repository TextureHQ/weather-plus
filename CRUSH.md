CRUSH.md — Quick guide for agentic contributors

Build / test / lint
- Install: npm install
- Build all: npm run build (runs build:cjs and build:esm)
- Build CJS only: npm run build:cjs
- Build ESM only: npm run build:esm
- Clean before build: handled by prebuild (rimraf ./dist)
- Run tests: npm test
- Watch tests: npm run test:watch
- Coverage: npm run coverage (outputs coverage/lcov.info)
- Run a single test file: npx jest path/to/file.test.ts
- Run tests by name/pattern: npx jest -t "pattern"

Project conventions
- Language: TypeScript (strict true). ESM and CJS builds emitted to dist.
- Testing: Jest with ts-jest preset; test files use .test.ts/.spec.ts naming.
- Imports: Use module paths as in source; ES import syntax. Prefer named exports; default exports only when necessary.
- Formatting: Follow existing style; no formatter config present. Keep two-space indentation, single quotes, semicolons consistent with repo.
- Types: Prefer explicit return types on public functions; enable strict null checks; use interfaces for shapes and zod for runtime validation when present.
- Naming: camelCase for variables/functions, PascalCase for types/classes, UPPER_SNAKE_CASE for constants.
- Error handling: Throw typed errors from src/errors.ts where applicable; wrap external I/O (axios, redis) and surface meaningful messages without leaking secrets.
- Caching: See src/cache.ts for simple Redis-based cache helpers; ensure keys are namespaced and TTL respected.
- Providers: Implement IWeatherProvider in src/providers/IWeatherProvider.ts; keep provider-specific logic in their subfolders (nws, openweather). Add tests alongside provider code.
- Env/config: No .env checked in; do not commit secrets. Use environment variables at runtime; update README if adding new vars.

Tooling details
- Node 20 in CI; ensure compatibility.
- Jest config: jest.config.ts (ts-jest preset, node environment, ignores dist/*).
- TypeScript configs: tsconfig.cjs.json and tsconfig.esm.json drive dual builds; tsconfig.json is repo default for tooling.

Assistant notes
- No Cursor or Copilot rules files detected.
- Add any new scripts to package.json and mirror in this CRUSH.md.
- Prefer small, testable changes and keep providers decoupled via interfaces.