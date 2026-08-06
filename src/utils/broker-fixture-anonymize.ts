/**
 * Anonymize broker responses before they're written to disk as test
 * fixtures.
 *
 * Recorded fixtures get committed to the repo so they're part of the
 * test bundle — that means anything PII-shaped (cust_id, display
 * name, email, real names anywhere in the JSON) needs to be replaced
 * with a deterministic placeholder.
 *
 * Deterministic across calls: we use a djb2 hash of the original
 * value rather than an incrementing counter, so the same cust_id
 * maps to the same synthetic number whether it shows up in one
 * fixture or a hundred. Cross-fixture relationships (a driver in
 * `membersData` referencing a result in `simSessionResults`) stay
 * intact even though each fixture is anonymized in its own pass.
 *
 * Three flavors of PII handling:
 *
 *  - PII_NUMBER_KEYS: cust_id / driver_id / discord snowflakes / etc.
 *    Numeric values → small synthetic numbers. String values that
 *    match `/^\d+$/` are treated the same way (broker is loose about
 *    int-vs-string for ids).
 *  - PII_NAME_KEYS: display_name, team_name, etc. → `Driver N`.
 *  - PII_SORT_NAME_KEYS: sort_name → `Driver N, Test`, preserving the
 *    `"Last, First"` comma form consumers split on.
 *  - PII_EMAIL_KEYS: email → `user-N@example.test`.
 *  - PII_REDACT_KEYS: free-text fields likely to contain real names
 *    in prose (`steward_notes`, etc.). The whole value is replaced
 *    with `[redacted]` because we can't safely scrub names out of
 *    arbitrary English without false positives. Narrow, per-namespace
 *    exemptions live in REDACT_EXEMPTIONS.
 *
 * Plus one structural rewrite: broker `leagueDriverStats` (and a few
 * other endpoints) return objects keyed by cust_id. Those outer keys
 * also leak PII, so we detect "object whose keys are all numeric
 * strings" and rewrite the keys through the same anonymization map.
 */

const PII_NUMBER_KEYS = new Set([
    'cust_id',
    // `ldata-srhweb` TeamStanding.cust_ids — the team roster, as a bare
    // number[]. Without this it passes through untouched: real cust_ids get
    // committed to the repo, AND the roster stops joining to the `drivers`
    // map, whose keys ARE rewritten by isCustKeyedMap. The array branch in
    // walkValue() maps each element through syntheticNumber, and because
    // syntheticNumber stringifies its input, `174470` and `'174470'` hash
    // identically — so the join survives.
    'cust_ids',
    'driver_id',
    'iracing_id',
    'user_id',
    'team_id',
    'discord_user_id',
    'discord_id',
    'member_id',
]);

const PII_NAME_KEYS = new Set([
    'display_name',
    'driver_name',
    'name',
    'short_name',
    'first_name',
    'last_name',
    'full_name',
    'team_name',
    'club_name',
    'discord_username',
    'discord_display_name',
]);

const PII_EMAIL_KEYS = new Set(['email', 'email_address']);

/**
 * Names published as `"Last, First"` — `ldata-srhweb` SeasonDriver.sort_name.
 * A real name, so it has to go, but the comma form is load-bearing: consumers
 * split on it to get first/last. Anonymize to the same shape rather than a
 * flat `Driver N`, so fixtures exercise the same code path production does.
 */
const PII_SORT_NAME_KEYS = new Set(['sort_name']);

/**
 * Redaction exemptions, by namespace.
 *
 * PII_REDACT_KEYS is deliberately blunt — it stamps out whole free-text
 * fields because names can't be scrubbed from arbitrary prose. But `blunt`
 * costs real information when a field is free text in name only.
 *
 * `ldata-srhweb` adjudication `description` is a league-authored label for a
 * points adjustment: "Fastest race lap", "Pole position", "Major Penalty" —
 * three distinct values across an entire season, no personal names. It is
 * also the whole point of the stewarding ledger. Redacting it would leave
 * every fixture-mode render and every audit screenshot showing `[redacted]`
 * where the reason should be.
 *
 * Keep these narrow and per-namespace: an exemption is a decision that a
 * specific producer's specific field is safe, not a general relaxation.
 */
const REDACT_EXEMPTIONS: Record<string, ReadonlySet<string>> = {
    'ldata-srhweb': new Set(['description']),
};

const NO_EXEMPTIONS: ReadonlySet<string> = new Set();

/**
 * Free-text fields that frequently embed real driver names in English
 * prose. We can't reliably scrub names out of arbitrary text without
 * a NER model, so just stamp these out wholesale.
 */
const PII_REDACT_KEYS = new Set([
    'steward_notes',
    'notes',
    'comment',
    'comment_text',
    'description',
    'reason',
    'ruling_text',
    'incident_description',
]);

const NUMERIC_STRING = /^\d+$/;

/**
 * djb2 (Bernstein) hash → small synthetic id.
 *
 * Stateless and deterministic: a given input always produces the same
 * output, across calls and across separate fixture-capture runs. The
 * exact numeric range (1000 + hash % 90000) doesn't matter for
 * tests; the point is just that real cust_ids never leak through.
 */
function djb2(input: string): number {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function syntheticNumber(originalId: string | number): number {
    return 100000 + (djb2(`id:${originalId}`) % 900000);
}

function syntheticName(original: string): string {
    return `Driver ${1000 + (djb2(`name:${original}`) % 9000)}`;
}

function syntheticEmail(original: string): string {
    return `user-${1000 + (djb2(`email:${original}`) % 9000)}@example.test`;
}

/** Preserves the `"Last, First"` shape while replacing both halves. */
function syntheticSortName(original: string): string {
    const n = 1000 + (djb2(`name:${original}`) % 9000);
    return `Driver${n}, Test`;
}

/**
 * Walk arbitrary JSON, replacing PII-shaped values keyed by known
 * field names. Pure: returns a new object, doesn't mutate input.
 *
 * `namespace` is optional and only selects redaction exemptions — omitting it
 * is always the safe direction (more redaction, never less).
 */
export function anonymizeBrokerDoc(doc: unknown, namespace?: string): unknown {
    const exempt = (namespace && REDACT_EXEMPTIONS[namespace]) || NO_EXEMPTIONS;
    return walk(doc, exempt);
}

function walk(node: unknown, exempt: ReadonlySet<string>): unknown {
    if (Array.isArray(node)) {
        return node.map((item) => walk(item, exempt));
    }
    if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        const keys = Object.keys(obj);
        const out: Record<string, unknown> = {};

        if (isCustKeyedMap(keys, obj)) {
            for (const k of keys) {
                const newKey = String(syntheticNumber(k));
                out[newKey] = walk(obj[k], exempt);
            }
            return out;
        }

        for (const key of keys) {
            out[key] = walkValue(key, obj[key], exempt);
        }
        return out;
    }
    return node;
}

/**
 * Heuristic: an object whose keys are all numeric strings, with at
 * least two entries, is treated as a "keyed by cust_id" map. Common
 * shape from the broker's stats / lookup endpoints.
 */
function isCustKeyedMap(keys: string[], obj: Record<string, unknown>): boolean {
    if (keys.length < 2) return false;
    if (!keys.every((k) => NUMERIC_STRING.test(k))) return false;
    // Avoid mis-detecting sparse arrays-as-objects or short lookups
    // by also requiring the values to be objects (vs. primitives).
    return keys.every((k) => obj[k] !== null && typeof obj[k] === 'object');
}

function walkValue(
    key: string,
    value: unknown,
    exempt: ReadonlySet<string>
): unknown {
    if (PII_REDACT_KEYS.has(key) && !exempt.has(key)) {
        if (typeof value === 'string') return '[redacted]';
        if (value == null) return value;
        // Structured notes (rare): redact to an empty marker rather
        // than recursing — preserves the shape, loses the content.
        return Array.isArray(value) ? [] : '[redacted]';
    }

    if (PII_NUMBER_KEYS.has(key)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return syntheticNumber(value);
        }
        if (typeof value === 'string' && NUMERIC_STRING.test(value)) {
            return String(syntheticNumber(value));
        }
        if (Array.isArray(value)) {
            return value.map((v) => {
                if (typeof v === 'number' && Number.isFinite(v)) {
                    return syntheticNumber(v);
                }
                if (typeof v === 'string' && NUMERIC_STRING.test(v)) {
                    return String(syntheticNumber(v));
                }
                return walk(v, exempt);
            });
        }
        return walk(value, exempt);
    }

    if (
        key === 'team_members' &&
        Array.isArray(value) &&
        value.every(
            (v) =>
                typeof v === 'number' ||
                (typeof v === 'string' && NUMERIC_STRING.test(v))
        )
    ) {
        return (value as (number | string)[]).map((n) =>
            typeof n === 'number'
                ? syntheticNumber(n)
                : String(syntheticNumber(n))
        );
    }

    if (PII_SORT_NAME_KEYS.has(key) && typeof value === 'string') {
        return value.length === 0 ? value : syntheticSortName(value);
    }
    if (PII_NAME_KEYS.has(key) && typeof value === 'string') {
        return value.length === 0 ? value : syntheticName(value);
    }
    if (PII_EMAIL_KEYS.has(key) && typeof value === 'string') {
        return value.length === 0 ? value : syntheticEmail(value);
    }

    return walk(value, exempt);
}
