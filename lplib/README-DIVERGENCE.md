# `lplib/` here is NOT a faithful mirror

Read this before running `./lplib-pull.sh`.

In sibling repos (e.g. `wbsvc-dtbrkrrd`) `lplib/dtbrkr` is a verbatim mirror of
[`lplib-dtbrkr`](https://github.com/bfr-leap/lplib-dtbrkr)`/src`. **Here it is
not.** This app runs in the browser and on Nitro; it has no filesystem data
lake and no SQLite. So `lplib/dtbrkr/*` was deliberately rewritten as thin HTTP
clients against the LEAP Data Broker REST API — see commit `eb4bffd3`
("Migrate from Xata database to LEAP Data Broker REST API (#21)") and the
earlier `4cc7a869` ("merge dev - proxy model").

The size difference is the tell:

| file | here | upstream | what it is here |
|---|---|---|---|
| `dtbrkr/dtlkdata.ts` | 53 | 228 | `fetch()` against `/datalake/:ns/:type` — upstream is an fs loader dispatcher |
| `dtbrkr/usrcfg.ts` | 109 | 360 | HTTP proxy to `/config/*` |
| `dtbrkr/usrdata.ts` | 303 | 516 | HTTP proxy to `/user/:id/*` |
| `dtbrkr/admcfg.ts` | 215 | 147 | HTTP proxy to `/admin/schedule/events` |
| `dtbrkr/index.ts` | 6 | 284 | re-exports only the proxies that exist here |
| `dtbrkr/admcrud.ts` | 289 | — | local, no upstream counterpart |
| `dtbrkr/stwdcfg.ts` | 181 | — | local, no upstream counterpart |

Upstream's `db.ts`, `crud.ts`, `page-data*`, `ldata-loaders/`, `seasons.ts`,
`publications.ts`, `msgingest.ts` and every `*.test.ts` are absent by design.

## What `./lplib-pull.sh` actually does

```bash
rm -rf lplib/endpoint-types/*   # then copies ir-endpoint-types
rm -rf lplib/dtbrkr/*           # then copies lplib-dtbrkr/src
```

It wipes **both subdirectories wholesale** and copies upstream over them. There
is no `lplib-patch.sh` in this repo (`wbsvc-dtbrkrrd` has one), so there is no
supported round-trip. Running the pull as-is replaces the proxies with
filesystem loaders that cannot work in this app, and drags `node:fs`,
`better-sqlite3` and `kafkajs` into the bundle.

**Treat `./lplib-pull.sh` as broken for `dtbrkr/`.** If you need a genuine
re-sync, do it file by file and re-apply the divergences below.

Files at `lplib/` root — including this one — survive the pull, because the
script only globs inside the two subdirectories.

## Divergences to re-apply after any pull

### 1. `dtbrkr/dtlkdata.ts` — `SCOPE_PARAMS` includes `'class'`

Addresses one championship class in `ldata-srhweb/seasonStandings`. Without it
the broker gets no `class`, returns 404, and the standings model reads that as
"this league has no srhweb data" and silently falls back to the computed
standings. **Nothing throws and nothing logs** — the page just quietly gets
worse.

Guarded by `server/api/dtlkdata-scope-params.test.ts`, which lives outside
`lplib/` precisely so the pull cannot delete it. After any pull:

```bash
npx vitest run server/api/dtlkdata-scope-params.test.ts
```

## Where app-owned types live, and why

srhweb response types are declared in `src/services/srhweb-types.ts`, **not** in
`lplib/endpoint-types/`, because the pull wipes that directory too. The
upstream source of truth for those shapes is
`lplib-dtbrkr/src/ldata-loaders/ldata-srhweb-data-loader.ts`, pinned by
`contracts/schemas/ldata-srhweb.schema.json` in `.github-private`. Re-sync by
hand when the schema changes.

`league-service.ts` already sets this precedent with its locally-declared
`LeagueRoster` / `DefaultLeagueContext`.
