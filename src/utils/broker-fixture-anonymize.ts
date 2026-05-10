/**
 * Anonymize broker responses before they're written to disk as test
 * fixtures.
 *
 * Recorded fixtures get committed to the repo so they're part of the
 * test bundle — that means anything PII-shaped (cust_id, display
 * name, email, real names anywhere in the JSON) needs to be replaced
 * with a deterministic placeholder. Deterministic is important: two
 * fixtures referencing the same cust_id should still match after
 * anonymization so cross-record relationships (e.g. a driver in
 * `membersData` matched against a result in `simSessionResults`) stay
 * intact.
 *
 * Strategy: walk the JSON tree, identify known PII keys by name, and
 * replace values using a hash-keyed map. Numeric ids → small synthetic
 * numbers. Strings → `Driver <n>` or `user-<n>@example.test`
 * depending on the key. Other strings unchanged.
 */

const PII_NUMBER_KEYS = new Set([
    'cust_id',
    'driver_id',
    'iracing_id',
    'user_id',
    'team_id', // teams are also "PII-shaped" in the sense that team names below get replaced
]);

const PII_NAME_KEYS = new Set([
    'display_name',
    'driver_name',
    'name', // applies to teams/leagues — coarse but consistent
    'short_name',
    'first_name',
    'last_name',
    'full_name',
    'team_name',
    'club_name',
]);

const PII_EMAIL_KEYS = new Set(['email', 'email_address']);

interface AnonymizerState {
    nextNumber: number;
    numberMap: Map<number, number>;
    nextName: number;
    nameMap: Map<string, string>;
    nextEmail: number;
    emailMap: Map<string, string>;
}

function freshState(): AnonymizerState {
    return {
        nextNumber: 1000,
        numberMap: new Map(),
        nextName: 1,
        nameMap: new Map(),
        nextEmail: 1,
        emailMap: new Map(),
    };
}

function rewriteNumber(state: AnonymizerState, n: number): number {
    if (!Number.isFinite(n)) return n;
    const existing = state.numberMap.get(n);
    if (existing != null) return existing;
    const v = state.nextNumber++;
    state.numberMap.set(n, v);
    return v;
}

function rewriteName(state: AnonymizerState, s: string): string {
    if (typeof s !== 'string' || s.length === 0) return s;
    const existing = state.nameMap.get(s);
    if (existing != null) return existing;
    const v = `Driver ${state.nextName++}`;
    state.nameMap.set(s, v);
    return v;
}

function rewriteEmail(state: AnonymizerState, s: string): string {
    if (typeof s !== 'string' || s.length === 0) return s;
    const existing = state.emailMap.get(s);
    if (existing != null) return existing;
    const v = `user-${state.nextEmail++}@example.test`;
    state.emailMap.set(s, v);
    return v;
}

/**
 * Walk arbitrary JSON, replacing PII-shaped values keyed by known
 * field names. Pure: returns a new object, doesn't mutate input.
 */
export function anonymizeBrokerDoc(doc: unknown): unknown {
    const state = freshState();
    return walk(doc, state);
}

function walk(node: unknown, state: AnonymizerState): unknown {
    if (Array.isArray(node)) {
        return node.map((item) => walk(item, state));
    }
    if (node && typeof node === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(
            node as Record<string, unknown>
        )) {
            out[key] = walkValue(key, value, state);
        }
        return out;
    }
    return node;
}

function walkValue(
    key: string,
    value: unknown,
    state: AnonymizerState
): unknown {
    // Numeric PII (ids). Array-of-ids handled inline so
    // `team_members: [123, 456]` becomes `[1000, 1001]`.
    if (PII_NUMBER_KEYS.has(key)) {
        if (typeof value === 'number') return rewriteNumber(state, value);
        if (Array.isArray(value)) {
            return value.map((v) =>
                typeof v === 'number' ? rewriteNumber(state, v) : walk(v, state)
            );
        }
        return walk(value, state);
    }
    // Some endpoints expose member id arrays under `team_members`.
    if (
        key === 'team_members' &&
        Array.isArray(value) &&
        value.every((v) => typeof v === 'number')
    ) {
        return (value as number[]).map((n) => rewriteNumber(state, n));
    }
    if (PII_NAME_KEYS.has(key) && typeof value === 'string') {
        return rewriteName(state, value);
    }
    if (PII_EMAIL_KEYS.has(key) && typeof value === 'string') {
        return rewriteEmail(state, value);
    }
    return walk(value, state);
}
