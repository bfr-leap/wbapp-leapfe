<script setup lang="ts">
/**
 * Admin CRUD probe — single-button placeholder.
 *
 * Hits every endpoint and tries multiple body shapes for the mutating
 * verbs so we can discover which one the broker accepts in one round
 * trip. Output is dumped to a copyable textarea and auto-copied to the
 * clipboard. Self-cleans the test rows it creates.
 *
 * Gated client-side by the `global_admin` feature flag.
 */
import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { useAuth, SignedIn, SignedOut, SignInButton } from 'vue-clerk';
import { setAuth, setToken } from '@@/src/utils/api-client';
import { getUserFeatures } from '@@/src/services/user-service';
import {
    listCrudTables,
    getCrudSchema,
    listCrudRows,
    lookupCrudRow,
    createCrudRow,
    updateCrudRow,
    deleteCrudRow,
    type CrudResult,
} from '@@/src/services/admin-crud-service';

const FEATURE_FLAG = 'global_admin';

const auth = useAuth();
setAuth(auth);

const serverInitialState = useState<AuthObject | undefined>(
    'clerk-initial-state'
);
if (import.meta.server) {
    setToken(serverInitialState.value?.token);
}

const runtimeConfig = useRuntimeConfig();
const buildSha = String(runtimeConfig.public.BUILD_COMMIT_SHA || 'dev');
const buildShaShort = buildSha === 'dev' ? 'dev' : buildSha.slice(0, 7);
const buildTime = String(runtimeConfig.public.BUILD_TIME || '');

const featureChecked = ref(false);
const featureEnabled = ref(false);
const featureList: Ref<string[]> = ref([]);

const probeOutput = ref<string>('');
const probeRunning = ref(false);
const probeAutoCopied = ref(false);
const probeCopyManual = ref(false);

async function ensureFeatures() {
    if (featureChecked.value) return;
    try {
        const features = await getUserFeatures();
        featureList.value = Array.isArray(features) ? features : [];
        featureEnabled.value = featureList.value.includes(FEATURE_FLAG);
    } catch (e) {
        console.error('[ADMCRUD-UI] feature check failed', e);
        featureEnabled.value = false;
    } finally {
        featureChecked.value = true;
    }
}

if (import.meta.client) {
    ensureFeatures();
}

// ---------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------

function trimmedJson(v: unknown, max = 6000): string {
    if (v === undefined) return '(undefined)';
    if (v === null) return 'null';
    let s: string;
    try {
        s = JSON.stringify(v, null, 2);
    } catch {
        s = String(v);
    }
    if (s.length > max) {
        return s.slice(0, max) + `\n…[truncated ${s.length - max} chars]`;
    }
    return s;
}

function shapeOf(data: unknown): string {
    if (data === null || data === undefined) return 'null';
    if (Array.isArray(data)) return `array[${data.length}]`;
    if (typeof data === 'object') {
        return `object{${Object.keys(data as object)
            .slice(0, 8)
            .join(',')}}`;
    }
    return typeof data;
}

// ---------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------

const PROBE_TABLE = 'app_features';

interface ProbeAttempt {
    label: string;
    body: unknown;
    fn: (body: unknown) => Promise<CrudResult>;
}

async function tryAttempts(
    out: string[],
    section: string,
    attempts: ProbeAttempt[]
): Promise<{ winner: ProbeAttempt | null; result: CrudResult | null }> {
    out.push(`========== ${section} ==========`);
    let winner: ProbeAttempt | null = null;
    let winningResult: CrudResult | null = null;
    for (const a of attempts) {
        out.push(`--- attempt: ${a.label}`);
        out.push(`request body: ${trimmedJson(a.body)}`);
        let r: CrudResult | null = null;
        try {
            r = await a.fn(a.body);
        } catch (e) {
            out.push(`! threw: ${e instanceof Error ? e.message : String(e)}`);
            out.push('');
            continue;
        }
        out.push(`> ${r._method ?? '?'} ${r._url ?? '?'}`);
        if (r._status !== undefined) {
            out.push(
                `< HTTP ${r._status} in ${r._durationMs ?? '?'}ms${
                    r._error ? '  (ERROR)' : '  (OK)'
                }`
            );
        }
        if (r._requestBody !== undefined) {
            out.push(`echoed _requestBody: ${trimmedJson(r._requestBody)}`);
        } else {
            out.push(`echoed _requestBody: (missing — old build?)`);
        }
        if (r._message) out.push(`! ${r._message}`);
        out.push(`response shape: ${shapeOf(r._data)}`);
        out.push(trimmedJson(r._data));
        out.push('');
        if (r._ok && !winner) {
            winner = a;
            winningResult = r;
        }
    }
    if (winner) {
        out.push(`>>> ${section} winner: "${winner.label}"`);
    } else {
        out.push(`>>> ${section}: no shape succeeded`);
    }
    out.push('');
    return { winner, result: winningResult };
}

function extractCreatedId(data: unknown): number | null {
    if (!data || typeof data !== 'object') return null;
    const o = data as Record<string, unknown>;
    if (typeof o.id === 'number') return o.id;
    if (typeof o.lastInsertRowid === 'number') return o.lastInsertRowid;
    if (typeof o.lastID === 'number') return o.lastID;
    if (o.row && typeof o.row === 'object') {
        return extractCreatedId(o.row);
    }
    if (o.data && typeof o.data === 'object') {
        return extractCreatedId(o.data);
    }
    return null;
}

async function findProbeRows(): Promise<number[]> {
    const list = await listCrudRows(PROBE_TABLE);
    const data = list?._data as
        | { rows?: Array<Record<string, unknown>> }
        | undefined;
    const rows = data?.rows ?? [];
    return rows
        .filter(
            (r) =>
                typeof r.display_name === 'string' &&
                (r.display_name as string).startsWith('_admcrud_probe_')
        )
        .map((r) => Number(r.id))
        .filter((id) => Number.isFinite(id));
}

async function runProbe() {
    probeRunning.value = true;
    probeAutoCopied.value = false;
    probeCopyManual.value = false;
    const out: string[] = [];
    const probeName = `_admcrud_probe_${Date.now()}`;
    const probeNewName = `${probeName}_renamed`;

    out.push(`=== ADMCRUD full probe @ ${new Date().toISOString()} ===`);
    out.push(`build: ${buildShaShort}  buildTime: ${buildTime}`);
    out.push(
        `page origin: ${
            typeof window !== 'undefined' ? window.location.origin : '(ssr)'
        }`
    );
    out.push(`features: ${JSON.stringify(featureList.value)}`);
    out.push(`probe table: ${PROBE_TABLE}`);
    out.push(`probe row name: ${probeName}`);
    out.push('');

    // ---- 1. Read-only baseline ------------------------------------
    try {
        const t = await listCrudTables();
        out.push('========== 1. listTables ==========');
        out.push(`> ${t._method} ${t._url}`);
        out.push(`< HTTP ${t._status} in ${t._durationMs}ms`);
        out.push(trimmedJson(t._data));
        out.push('');

        const s = await getCrudSchema(PROBE_TABLE);
        out.push(`========== 2. schema(${PROBE_TABLE}) ==========`);
        out.push(`> ${s._method} ${s._url}`);
        out.push(`< HTTP ${s._status} in ${s._durationMs}ms`);
        out.push(trimmedJson(s._data));
        out.push('');

        const l = await listCrudRows(PROBE_TABLE);
        out.push(`========== 3. listRows(${PROBE_TABLE}) ==========`);
        out.push(`> ${l._method} ${l._url}`);
        out.push(`< HTTP ${l._status} in ${l._durationMs}ms`);
        out.push(trimmedJson(l._data));
        out.push('');
    } catch (e) {
        out.push(
            `!!! read-only suite threw: ${
                e instanceof Error ? e.message : String(e)
            }`
        );
    }

    // ---- 2. Lookup body-shape discovery (against existing id=11) ---
    let lookupWinner: ProbeAttempt | null = null;
    try {
        const r = await tryAttempts(out, '4. lookup body shapes', [
            {
                label: 'wrapped values: {values: {id: 11}}',
                body: { values: { id: 11 } },
                fn: (b) => lookupCrudRow(PROBE_TABLE, b),
            },
            {
                label: 'wrapped data: {data: {id: 11}}',
                body: { data: { id: 11 } },
                fn: (b) => lookupCrudRow(PROBE_TABLE, b),
            },
            {
                label: 'wrapped row: {row: {id: 11}}',
                body: { row: { id: 11 } },
                fn: (b) => lookupCrudRow(PROBE_TABLE, b),
            },
            {
                label: 'wrapped pk: {pk: {id: 11}}',
                body: { pk: { id: 11 } },
                fn: (b) => lookupCrudRow(PROBE_TABLE, b),
            },
        ]);
        lookupWinner = r.winner;
    } catch (e) {
        out.push(
            `!!! lookup discovery threw: ${
                e instanceof Error ? e.message : String(e)
            }`
        );
    }

    // ---- 3. Create body-shape discovery ----------------------------
    let createdId: number | null = null;
    let createWinner: ProbeAttempt | null = null;
    let createWinnerResult: CrudResult | null = null;
    try {
        const r = await tryAttempts(out, '5. create body shapes', [
            {
                label: 'flat columns',
                body: {
                    display_name: probeName,
                    release_to_all: 0,
                    release_to_some: 0,
                },
                fn: (b) => createCrudRow(PROBE_TABLE, b),
            },
            {
                label: 'wrapped row',
                body: {
                    row: {
                        display_name: probeName,
                        release_to_all: 0,
                        release_to_some: 0,
                    },
                },
                fn: (b) => createCrudRow(PROBE_TABLE, b),
            },
            {
                label: 'wrapped values',
                body: {
                    values: {
                        display_name: probeName,
                        release_to_all: 0,
                        release_to_some: 0,
                    },
                },
                fn: (b) => createCrudRow(PROBE_TABLE, b),
            },
        ]);
        createWinner = r.winner;
        createWinnerResult = r.result;
        createdId = extractCreatedId(createWinnerResult?._data);
        out.push(`extracted createdId: ${createdId ?? '(none — see data)'}`);
        out.push('');
    } catch (e) {
        out.push(
            `!!! create discovery threw: ${
                e instanceof Error ? e.message : String(e)
            }`
        );
    }

    // ---- 4. If create worked, do lookup/update/delete on test row -
    if (createWinner && createdId !== null) {
        try {
            const r = await tryAttempts(
                out,
                `6. lookup test row id=${createdId}`,
                [
                    {
                        label: 'wrapped values: {values: {id}}',
                        body: { values: { id: createdId } },
                        fn: (b) => lookupCrudRow(PROBE_TABLE, b),
                    },
                    {
                        label: 'wrapped data: {data: {id}}',
                        body: { data: { id: createdId } },
                        fn: (b) => lookupCrudRow(PROBE_TABLE, b),
                    },
                ]
            );
            void r;
        } catch (e) {
            out.push(
                `!!! lookup of test row threw: ${
                    e instanceof Error ? e.message : String(e)
                }`
            );
        }

        try {
            const r = await tryAttempts(out, '7. update body shapes', [
                {
                    label: 'all-in-values: {values: {id, display_name}}',
                    body: {
                        values: {
                            id: createdId,
                            display_name: probeNewName,
                        },
                    },
                    fn: (b) => updateCrudRow(PROBE_TABLE, b),
                },
                {
                    label: 'pk-out + values: {id, values: {display_name}}',
                    body: {
                        id: createdId,
                        values: { display_name: probeNewName },
                    },
                    fn: (b) => updateCrudRow(PROBE_TABLE, b),
                },
                {
                    label: 'where + values: {where: {id}, values: {display_name}}',
                    body: {
                        where: { id: createdId },
                        values: { display_name: probeNewName },
                    },
                    fn: (b) => updateCrudRow(PROBE_TABLE, b),
                },
                {
                    label: 'data-only: {data: {id, display_name}}',
                    body: {
                        data: {
                            id: createdId,
                            display_name: probeNewName,
                        },
                    },
                    fn: (b) => updateCrudRow(PROBE_TABLE, b),
                },
            ]);
            void r;
        } catch (e) {
            out.push(
                `!!! update discovery threw: ${
                    e instanceof Error ? e.message : String(e)
                }`
            );
        }

        try {
            const r = await tryAttempts(out, '8. delete body shapes', [
                {
                    label: 'wrapped values: {values: {id}}',
                    body: { values: { id: createdId } },
                    fn: (b) => deleteCrudRow(PROBE_TABLE, b),
                },
                {
                    label: 'wrapped data: {data: {id}}',
                    body: { data: { id: createdId } },
                    fn: (b) => deleteCrudRow(PROBE_TABLE, b),
                },
                {
                    label: 'wrapped pk: {pk: {id}}',
                    body: { pk: { id: createdId } },
                    fn: (b) => deleteCrudRow(PROBE_TABLE, b),
                },
            ]);
            void r;
        } catch (e) {
            out.push(
                `!!! delete discovery threw: ${
                    e instanceof Error ? e.message : String(e)
                }`
            );
        }

        // ---- 5. Verify deletion -----------------------------------
        try {
            out.push('========== 9. verify post-delete listRows ==========');
            const list = await listCrudRows(PROBE_TABLE);
            const data = list?._data as
                | {
                      rows?: Array<Record<string, unknown>>;
                      total?: number;
                  }
                | undefined;
            const stillThere = (data?.rows ?? []).filter(
                (r) =>
                    typeof r.display_name === 'string' &&
                    ((r.display_name as string) === probeName ||
                        (r.display_name as string) === probeNewName)
            );
            out.push(
                `total rows: ${data?.total ?? '?'}, leftover probe rows: ${
                    stillThere.length
                }`
            );
            if (stillThere.length) {
                out.push(trimmedJson(stillThere));
            }
            out.push('');
        } catch (e) {
            out.push(
                `!!! verify threw: ${
                    e instanceof Error ? e.message : String(e)
                }`
            );
        }
    } else {
        out.push(
            `(skipping lookup/update/delete on test row: create did not return a usable id — winner=${
                createWinner?.label ?? 'none'
            }, createdId=${createdId})`
        );
        out.push('');
    }

    // ---- 6. Sweep stale probe rows --------------------------------
    try {
        const stale = await findProbeRows();
        out.push(`========== 10. sweep stale probe rows ==========`);
        out.push(
            `found ${stale.length} stale row(s): ${JSON.stringify(stale)}`
        );
        const deleteShapes: {
            label: string;
            build: (id: number) => unknown;
        }[] = [
            { label: 'values', build: (id) => ({ values: { id } }) },
            { label: 'data', build: (id) => ({ data: { id } }) },
            { label: 'pk', build: (id) => ({ pk: { id } }) },
            { label: 'flat', build: (id) => ({ id }) },
            { label: 'where', build: (id) => ({ where: { id } }) },
        ];
        for (const id of stale) {
            let cleaned = false;
            for (const shape of deleteShapes) {
                const r = await deleteCrudRow(PROBE_TABLE, shape.build(id));
                out.push(
                    `  delete id=${id} via ${shape.label} → HTTP ${r._status} ${
                        r._error ? '(error)' : '(ok)'
                    }`
                );
                if (r._ok) {
                    cleaned = true;
                    break;
                }
            }
            if (!cleaned) {
                out.push(`  ! id=${id} could not be deleted with any shape`);
            }
        }
        out.push('');
    } catch (e) {
        out.push(
            `!!! sweep threw: ${e instanceof Error ? e.message : String(e)}`
        );
    }

    out.push('=== probe complete ===');
    out.push(`lookup winner: ${lookupWinner?.label ?? '(none)'}`);
    out.push(`create winner: ${createWinner?.label ?? '(none)'}`);
    out.push('');
    out.push(
        'Tip: search for ">>>" markers above to see which body shape won each verb.'
    );

    probeOutput.value = out.join('\n');
    probeRunning.value = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(probeOutput.value);
            probeAutoCopied.value = true;
        } catch {
            probeCopyManual.value = true;
        }
    } else {
        probeCopyManual.value = true;
    }
}

const buttonLabel = computed(() => {
    if (probeRunning.value) return 'Running probe…';
    if (probeOutput.value) return 'Run again';
    return 'Run full probe';
});
</script>

<template>
    <div class="admcrud-page">
        <header class="admcrud-build-banner">
            <span class="admcrud-build-label">build:</span>
            <code class="admcrud-build-sha">{{ buildShaShort }}</code>
            <span v-if="buildTime" class="admcrud-build-time">{{
                buildTime
            }}</span>
        </header>

        <h1>Admin CRUD probe</h1>

        <SignedOut>
            <p class="admcrud-callout">
                You must be signed in.
                <SignInButton />
            </p>
        </SignedOut>

        <SignedIn>
            <p v-if="!featureChecked" class="admcrud-callout">
                Checking feature flag…
            </p>

            <p
                v-else-if="!featureEnabled"
                class="admcrud-callout admcrud-callout--warn"
            >
                Feature flag <code>{{ FEATURE_FLAG }}</code> is not enabled for
                your account. Features:
                <code>{{ JSON.stringify(featureList) }}</code>
            </p>

            <div v-else>
                <p class="admcrud-meta">
                    One click: lists tables, lists schemas/rows for
                    <code>app_features</code>, then tries multiple body shapes
                    for lookup / create / update / delete using a self-cleaning
                    <code>_admcrud_probe_*</code> test row. Output is
                    auto-copied to your clipboard.
                </p>

                <button
                    type="button"
                    class="admcrud-big-button"
                    v-bind:disabled="probeRunning"
                    v-on:click="runProbe"
                >
                    {{ buttonLabel }}
                </button>

                <p v-if="probeAutoCopied" class="admcrud-status">
                    ✓ Output copied to clipboard — paste it back to me.
                </p>
                <p v-else-if="probeCopyManual" class="admcrud-status">
                    Auto-copy failed — select all in the textarea below and copy
                    manually.
                </p>

                <textarea
                    class="admcrud-output"
                    readonly
                    spellcheck="false"
                    placeholder="Click the button above. Output appears here."
                    v-bind:value="probeOutput"
                ></textarea>
            </div>
        </SignedIn>
    </div>
</template>

<style scoped>
.admcrud-page {
    max-width: 1024px;
    margin: 0 auto;
    padding: 24px 16px 64px;
    color: var(--gh-fg-default, #e6edf3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.admcrud-build-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 16px;
    border: 1px solid #2ea043;
    background: #0f2a16;
    border-radius: 6px;
    font-size: 0.8125rem;
}

.admcrud-build-label {
    color: var(--gh-fg-muted, #8b949e);
}

.admcrud-build-sha {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-weight: 600;
    color: #7ee787;
    padding: 2px 6px;
    background: rgba(46, 160, 67, 0.15);
    border-radius: 3px;
}

.admcrud-build-time {
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.75rem;
}

h1 {
    font-size: 1.5rem;
    margin: 0 0 12px;
}

.admcrud-callout {
    padding: 16px;
    border: 1px solid var(--gh-border-default, #30363d);
    border-radius: 6px;
    background: var(--gh-canvas-subtle, #161b22);
}

.admcrud-callout--warn {
    border-color: #9e6a03;
    background: #1f1500;
}

.admcrud-meta {
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.875rem;
    margin: 0 0 16px;
}

.admcrud-big-button {
    display: block;
    width: 100%;
    padding: 16px;
    font-size: 1.125rem;
    font-weight: 600;
    border: 1px solid #2ea043;
    background: #238636;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 12px;
}

.admcrud-big-button:hover:not(:disabled) {
    background: #2ea043;
}

.admcrud-big-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.admcrud-status {
    margin: 8px 0;
    color: #7ee787;
    font-size: 0.875rem;
}

.admcrud-output {
    display: block;
    width: 100%;
    min-height: 480px;
    margin-top: 8px;
    padding: 12px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-canvas-default, #0d1117);
    color: inherit;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-size: 0.75rem;
    line-height: 1.4;
    resize: vertical;
    white-space: pre;
}

code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-size: 0.875em;
}
</style>
