# Release and asset validation

- Preserve the existing `model-router:gal` storage keys and both bundled story engines.
- Publish changes under new versions; never overwrite npm versions or move existing release tags.
- Keep only Echo City main story and Old City Migration in the installable catalog.
- Keep source artwork, scripts, tests and the generated client in this repository; do not treat an npm tarball as complete source.
- Before release, run `pnpm install --frozen-lockfile`, `npm test`, `npm run build:client`, `npm run check:client` and `pnpm peers check`.
- Verify the npm payload contains only standalone GAL runtime and install documentation, and the GitHub release contains the verified tarball.
