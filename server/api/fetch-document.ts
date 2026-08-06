import { middleware as authMiddleware } from './middleware/_auth-user';
import { getDocument } from '@@/lplib/dtbrkr/ftchdata';
import { anonymizeBrokerDoc } from '@@/src/utils/broker-fixture-anonymize';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Three test-only modes via environment variables, all off in
 * production:
 *
 *  - `LEAP_BROKER_DISABLED=1`        → every fetch returns `{ doc: null }`
 *    instantly. Exercises "broker timed out / unauthenticated" paths
 *    without the 20-second timeout wait. Used by the basic SSR smoke
 *    suite.
 *
 *  - `LEAP_BROKER_RECORD=<dir>`      → pass through to the real broker
 *    AND write the response to `<dir>/<key>.json`, with PII fields
 *    anonymized. Use this once locally against a logged-in session to
 *    capture realistic fixtures; commit the resulting JSON tree to
 *    `tests/fixtures/broker/` for replay.
 *
 *  - `LEAP_BROKER_FIXTURES=<dir>`    → short-circuit by reading the
 *    matching fixture from disk. Missing fixture throws — that's how
 *    we notice a page started making a broker request we didn't
 *    record. Used by the fixture-mode SSR smoke pass.
 *
 * Production sees none of these set, falls straight through to the
 * real broker.
 */
const BROKER_DISABLED = process.env.LEAP_BROKER_DISABLED === '1';
const BROKER_RECORD_DIR = process.env.LEAP_BROKER_RECORD;
const BROKER_FIXTURE_DIR = process.env.LEAP_BROKER_FIXTURES;

/**
 * Stable filename for a (namespace, query) pair. Query keys are
 * sorted so any caller passing them in different orders ends up at
 * the same fixture. Auth-shaped keys are dropped before hashing
 * because they vary per request and would otherwise prevent fixtures
 * from matching.
 */
function fixtureKey(
    namespace: string,
    type: string,
    query: Record<string, unknown>
): string {
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
        if (k === 'userID' || k === '_authHeader' || k === 'namespace')
            continue;
        if (v == null || v === '') continue;
        filtered[k] = String(v);
    }
    const keys = Object.keys(filtered).sort();
    const canon = keys.map((k) => `${k}=${filtered[k]}`).join('&');
    const hash = createHash('sha1').update(canon).digest('hex').slice(0, 10);
    // Filenames stay human-readable so a curious reader can `ls
    // tests/fixtures/broker/` and tell what's there without a hash
    // table.
    const slug = `${namespace}__${type}__${hash}`;
    return slug.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function fixturePath(dir: string, key: string): string {
    return resolve(dir, `${key}.json`);
}

function readFixture(
    dir: string,
    namespace: string,
    type: string,
    query: Record<string, unknown>
): unknown {
    const key = fixtureKey(namespace, type, query);
    const path = fixturePath(dir, key);
    if (!existsSync(path)) {
        throw new Error(
            `[broker-fixture] missing fixture for ${namespace}/${type} ` +
                `(key=${key}). Record one via ` +
                `LEAP_BROKER_RECORD=${dir} and try again.\n` +
                `expected path: ${path}`
        );
    }
    return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeFixture(
    dir: string,
    namespace: string,
    type: string,
    query: Record<string, unknown>,
    doc: unknown
): void {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const key = fixtureKey(namespace, type, query);
    const path = fixturePath(dir, key);
    const anonymized = anonymizeBrokerDoc(doc, namespace);
    writeFileSync(path, JSON.stringify(anonymized, null, 2) + '\n');
}

export default defineEventHandler(async (event) => {
    if (BROKER_DISABLED) return { doc: null };

    const req: any = event.node.req;

    req.query = getQuery(event);

    const namespace = req?.query?.namespace?.toLocaleString() || '';
    const type = req?.query?.type?.toLocaleString() || '';

    // Fixture replay short-circuits before the real handler ever runs.
    if (BROKER_FIXTURE_DIR) {
        const doc = readFixture(
            BROKER_FIXTURE_DIR,
            namespace,
            type,
            req.query as Record<string, unknown>
        );
        return { doc };
    }

    const ret = await handler(req);

    if (BROKER_RECORD_DIR) {
        try {
            writeFixture(
                BROKER_RECORD_DIR,
                namespace,
                type,
                req.query as Record<string, unknown>,
                ret
            );
        } catch (e) {
            console.warn('[broker-fixture] record write failed', e);
        }
    }

    return { doc: ret };
});

async function handler(req: any): Promise<any> {
    const namespace = req?.query?.namespace?.toLocaleString() || '';
    const type = req?.query?.type?.toLocaleString() || '';

    const authorizationHeader: string = req?.headers?.authorization || '';
    const rawToken = authorizationHeader.replace(/^Bearer\s+/, '');
    const hasToken = !!rawToken && rawToken !== 'null';

    function buildHandlerQuery(): { [name: string]: string | number } {
        const q: { [name: string]: string | number } = {
            userID: req?.user?.id || '',
            _authHeader: req?.headers?.authorization || '',
        };
        for (let key of Object.keys(req?.query || {})) {
            q[key] = req?.query?.[key] || '';
        }
        return q;
    }

    async function authMwAdapter(
        n_: string,
        q_: any,
        next: (n__: string, q__: any) => Promise<any>
    ): Promise<any> {
        // Anonymous request — bypass Clerk verification so public
        // namespaces (rulings, results, etc.) still load for logged-out
        // viewers. Handlers see an empty userID and can decide whether
        // to serve or reject the request.
        if (!hasToken) {
            return await next(namespace, buildHandlerQuery());
        }

        let ret: any = null;
        let callbackReached = false;

        await authMiddleware(req, async (rq) => {
            callbackReached = true;
            ret = await next(namespace, buildHandlerQuery());
        });

        if (!callbackReached) {
            // A token was provided but failed to verify. Fall through to
            // the anonymous path so stale or invalid tokens don't break
            // access to public data.
            console.warn(
                `[FETCH-DOC] auth middleware did not complete; falling through anonymously: namespace=${namespace} type=${type}`
            );
            return await next(namespace, buildHandlerQuery());
        }

        return ret;
    }

    const doc = await getDocument(namespace, req?.query || {}, authMwAdapter);

    return doc;
}
