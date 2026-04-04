/**
 * Core API client — handles HTTP fetching, auth, and response caching.
 *
 * All data fetching in the app flows through this module.
 * Service modules (src/services/) use these primitives to build
 * domain-specific data accessors.
 */

const DEBUG_PREFETCH = false;

let API_BASE_URL = '';
export function setApiBaseURL(url: string) {
    API_BASE_URL = url;
}

interface AuthProvider {
    getToken?: { value: () => Promise<string | null> };
}

let _auth: AuthProvider | null = null;
export function setAuth(auth: AuthProvider | null) {
    _auth = auth;
}

let _token: string = '';
export function setToken(token: string) {
    _token = token;
}

// ---------------------------------------------------------------------------
// Low-level fetch
// ---------------------------------------------------------------------------

async function fetchObjects(urls: string[]): Promise<unknown[]> {
    try {
        if (!urls || urls.length === 0) {
            throw new Error('No URLs provided');
        }

        let url = urls[0];

        let token: string = '';

        if (import.meta.server) {
            token = _token;
            url = API_BASE_URL + url;
        } else {
            token = _auth?.getToken ? await _auth.getToken.value() : null;
        }

        const t0 = Date.now();
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const obj = await response.json();
        if (!import.meta.server) {
            console.log(
                `[DIAG][http] ${response.status} ${Date.now() - t0}ms ${
                    urls[0]
                }`
            );
        }
        return [obj];
    } catch (e) {
        if (!import.meta.server) {
            console.error(`[DIAG][http] FAIL ${urls[0]}`, e);
        } else {
            console.error('Error fetching object:', e);
        }
        return [null];
    }
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------

type CacheStorage = {
    [name: string]: Promise<unknown[]>;
};
let _cacheStorage: CacheStorage = {};

/** Exposed for testing — clears the in-memory cache. */
export function clearCache() {
    _cacheStorage = {};
}

export function prepUrl(args: { [name: string]: string | number }): string {
    let ret = [];
    let keys = Object.keys(args);
    for (let key of keys) {
        ret.push(`${key}=${args[key]}`);
    }
    return `/api/fetch-document?${ret.join('&')}`;
}

// ---------------------------------------------------------------------------
// Prefetch
// ---------------------------------------------------------------------------

let _prefetchPromise: Promise<unknown> | null = null;

async function toPromise(v: unknown): Promise<unknown[]> {
    return v as unknown[];
}

interface PrefetchArgs {
    league?: string;
    season?: string;
    subsession?: string;
    [key: string]: string | undefined;
}

export async function preFetch(args: PrefetchArgs) {
    if (DEBUG_PREFETCH) {
        console.log('preFetch() start');
    }

    if (_prefetchPromise) {
        if (DEBUG_PREFETCH) {
            console.log('preFetch() skip');
        }
        await _prefetchPromise;
        return;
    }

    args.league = args.league || '';
    args.season = args.season || '';
    args.subsession = args.subsession || '';

    let keys = Object.keys(args);
    let argv = keys.map((v: string) => `${v}=${args[v]}`);

    let url = `/api/prefetch-load/?${argv.join('&')}`;

    let p = fetchObjects([url]);

    _prefetchPromise = p;

    let x = (await p)[0] as
        | { docs: Record<string, unknown> }
        | null
        | undefined;

    _prefetchPromise = null;

    keys = Object.keys(x?.docs || {});
    for (let key of keys) {
        if (x?.docs[key]) {
            _cacheStorage[key] = toPromise([{ doc: x.docs[key] }]);
        }
    }
    if (DEBUG_PREFETCH) {
        console.log('preFetch() done');
    }
}

// ---------------------------------------------------------------------------
// Cached document fetcher — the primary data access primitive
// ---------------------------------------------------------------------------

export async function fetchCachedDocument<T>(args: {
    [name: string]: string | number;
}): Promise<T | null> {
    if (_prefetchPromise) {
        await _prefetchPromise;
    }

    let source: string = prepUrl(args);
    let p = _cacheStorage[source];
    const cacheHit = !!p;

    if (!p) {
        if (DEBUG_PREFETCH) {
            console.log('looking for: ', source);
        }

        p = fetchObjects([source]);
        _cacheStorage[source] = p;
    }

    let a = await p;
    let result = a[0];
    if (result) {
        const parsed = result as { doc: T };
        try {
            const cloned = structuredClone(parsed.doc);
            if (!import.meta.server) {
                console.log(
                    `[DIAG][cache] ${cacheHit ? 'HIT' : 'MISS'} ${source} → ${
                        cloned == null ? 'null' : 'ok'
                    }`
                );
            }
            return cloned;
        } catch (cloneErr) {
            // structuredClone failure — fall back to JSON round-trip
            console.error(
                `[DIAG][cache] structuredClone FAILED for ${source}, falling back to JSON clone`,
                cloneErr
            );
            return JSON.parse(JSON.stringify(parsed.doc)) as T;
        }
    }
    if (!import.meta.server) {
        console.log(
            `[DIAG][cache] ${cacheHit ? 'HIT' : 'MISS'} ${source} → no result`
        );
    }
    return null;
}

/**
 * Fetch without caching — used for mutations and user-specific state
 * that should not be cached in the shared document cache.
 */
export async function fetchUncached<T = unknown>(args: {
    [name: string]: string | number;
}): Promise<T> {
    let source: string = prepUrl(args);
    let ret = await fetchObjects([source]);
    return (ret[0] as { doc: T } | null)?.doc as T;
}
