# Publish to the public npm registry as `@byteowlz/design-system`

The standard is distributed as a normal npm dependency, not a git dep and not a vendored copy.

## Context

The standard must be reusable across all screen-UI tools, adopted independently per repo. That requires a single source of truth with zero-friction consumption. Three options were on the table: git dependencies (`git+https`/`git+ssh`), a published package, and vendored copies.

## Decision

Publish to the **public npm registry** as **`@byteowlz/design-system`** (the `impls/shadcn-ts/` build). Consumers add it like any dep (`bun add @byteowlz/design-system`) and pin/bump it normally. Vendored copies remain a documented escape hatch for fringe cases.

## Why not git dependencies

**npm v12 (July 2026) defaults `--allow-git` to `none`** — git dependencies (ssh *or* https) stop resolving unless every consumer opts in per-install (GitHub Changelog 2026-06-09; advisory warnings ship in npm 11.16+). Pinning every consumer to `--allow-git` is the exact adoption friction a standard must avoid, and npm's own guidance is "migrate to a proper registry." Git deps would make the standard fragile on arrival.

## Why public, not GitHub Packages (private)

The standard is brand-neutral and secret-free — consumer tools' palettes are already public via their own repos (e.g. oqto). So public npm visibility costs nothing, while a private registry (GitHub Packages) would require every consumer to configure a PAT + scope in `.npmrc`, reintroducing the friction git deps were rejected for. Public wins on zero-config adoption.

## Why not vendored copies as the primary path

Vendoring guarantees drift; "standard" becomes aspirational. It stays as a documented escape hatch only.

## Versioning

git tag `vX.Y.Z` == npm package version == published tarball. This extends the existing `tag == version` discipline used across byteowlz repos. Publishing is a release step (a `just publish` target and/or a GitHub Action on tag), not free like a push — accepted as the cost of a real dependency.

## Consequences

- The `@byteowlz` npm org must be created and linked to the GitHub `byteowlz` org before the first publish. (Prerequisite, one-time.)
- The published tarball includes only the library (`impls/shadcn-ts/` build output); the playground is excluded via the `package.json` `files` field.
- First consumer migration (oqto) is gated on the first release existing — recorded in oqto as ADR-0014.
