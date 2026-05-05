<script setup lang="ts">
/**
 * Admin CRUD placeholder page.
 *
 * Surfaces the LEAP Data Broker's seven global admin CRUD endpoints so
 * we can probe them and learn their request/response shapes. Gated
 * client-side by the `global_admin` feature flag (the broker enforces
 * the same gate server-side).
 *
 * Every action logs a `[ADMCRUD-UI]` group with inputs, the resolved
 * envelope, and the embedded data. Share the console output from a
 * preview deployment so we can iterate on a real admin UI from there.
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

const featureChecked = ref(false);
const featureEnabled = ref(false);
const featureList: Ref<string[]> = ref([]);

const tableName = ref('');
const bodyJson = ref(
    '{\n    "// fill in PK columns for lookup/update/delete,": "",\n    "// or full row for create": ""\n}'
);
const lastAction = ref<string>('');
const lastResult: Ref<CrudResult | null> = ref(null);
const isLoading = ref(false);
const errorBanner = ref<string>('');

const probeOutput = ref<string>('');
const probeRunning = ref(false);
const probeCopied = ref(false);

function trimmedJson(v: unknown, max = 8000): string {
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

function extractTableNames(data: unknown): string[] {
    if (!data) return [];
    if (Array.isArray(data)) {
        const names: string[] = [];
        for (const item of data) {
            if (typeof item === 'string') {
                names.push(item);
            } else if (item && typeof item === 'object') {
                const o = item as Record<string, unknown>;
                const n = o.name ?? o.table ?? o.table_name ?? o.id;
                if (n !== undefined && n !== null) names.push(String(n));
            }
        }
        return names;
    }
    if (typeof data === 'object') {
        const o = data as Record<string, unknown>;
        if (Array.isArray(o.tables)) return extractTableNames(o.tables);
        if (Array.isArray(o.data)) return extractTableNames(o.data);
        if (Array.isArray(o.rows)) return extractTableNames(o.rows);
        return Object.keys(o);
    }
    return [];
}

async function runProbe() {
    probeRunning.value = true;
    probeCopied.value = false;
    const lines: string[] = [];
    const push = (s = '') => lines.push(s);

    function dump(label: string, result: CrudResult) {
        push(`--- ${label} ---`);
        push(`> ${result._method ?? '?'} ${result._url ?? '(no url)'}`);
        if (result._status !== undefined) {
            push(
                `< HTTP ${result._status} in ${result._durationMs ?? '?'}ms${
                    result._error ? '  (ERROR)' : ''
                }`
            );
        } else if (result._error) {
            push(`< (no HTTP response) ERROR`);
        }
        if (result._message) push(`! ${result._message}`);
        push(trimmedJson(result._data));
        push();
    }

    push(`=== ADMCRUD discovery probe @ ${new Date().toISOString()} ===`);
    push(`user features: ${JSON.stringify(featureList.value)}`);
    push(`page origin: ${window.location.origin}`);
    push();

    try {
        const tablesResult = await listCrudTables();
        dump('1. crudTables (GET /admin/crud/tables)', tablesResult);

        const tableNames = extractTableNames(tablesResult._data);
        push(
            `extracted ${tableNames.length} table name(s): ${JSON.stringify(
                tableNames
            )}`
        );
        push();

        const probeTables = tableNames.slice(0, 5);
        for (const name of probeTables) {
            const schema = await getCrudSchema(name);
            dump(`2. crudSchema (table=${name})`, schema);

            const list = await listCrudRows(name);
            dump(`3. crudList (table=${name})`, list);
        }

        if (probeTables.length > 0) {
            const lookup = await lookupCrudRow(probeTables[0], {});
            dump(
                `4. crudGet w/ empty body (table=${probeTables[0]}) — probing for required-field error shape`,
                lookup
            );
        }

        push('=== probe complete ===');
        push(
            'NOTE: create / update / delete were NOT exercised — share the above and we can pick a safe table for mutation tests.'
        );
    } catch (e) {
        push(`!!! probe threw: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        probeOutput.value = lines.join('\n');
        probeRunning.value = false;
        console.log('[ADMCRUD-UI] probe output ready', {
            length: probeOutput.value.length,
        });
    }
}

async function copyProbe() {
    if (!probeOutput.value) return;
    try {
        await navigator.clipboard.writeText(probeOutput.value);
        probeCopied.value = true;
        setTimeout(() => (probeCopied.value = false), 2000);
    } catch (e) {
        console.warn('[ADMCRUD-UI] clipboard write failed', e);
        errorBanner.value =
            'Could not write to clipboard — select the text manually.';
    }
}

async function ensureFeatures() {
    if (featureChecked.value) return;
    try {
        const features = await getUserFeatures();
        featureList.value = Array.isArray(features) ? features : [];
        featureEnabled.value = featureList.value.includes(FEATURE_FLAG);
        console.log('[ADMCRUD-UI] feature check', {
            flag: FEATURE_FLAG,
            enabled: featureEnabled.value,
            features: featureList.value,
        });
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

function parseBody(): unknown {
    const raw = bodyJson.value.trim();
    if (!raw) return undefined;
    try {
        return JSON.parse(raw);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errorBanner.value = `Body is not valid JSON: ${msg}`;
        throw e;
    }
}

async function run(
    name: string,
    fn: () => Promise<CrudResult>,
    inputs: Record<string, unknown>
) {
    errorBanner.value = '';
    isLoading.value = true;
    lastAction.value = name;
    const t0 = Date.now();
    console.groupCollapsed(`[ADMCRUD-UI] ${name}`);
    console.log('inputs', inputs);
    try {
        const result = await fn();
        lastResult.value = result;
        console.log('envelope', result);
        console.log('data', result?._data);
        console.log(`elapsed ${Date.now() - t0}ms`);
    } catch (e) {
        console.error('threw', e);
        lastResult.value = {
            _error: true,
            _source: name,
            _message: e instanceof Error ? e.message : String(e),
        };
    } finally {
        console.groupEnd();
        isLoading.value = false;
    }
}

function callListTables() {
    run('listTables', () => listCrudTables(), {});
}

function callGetSchema() {
    if (!tableName.value) {
        errorBanner.value = 'table name is required';
        return;
    }
    run('getSchema', () => getCrudSchema(tableName.value), {
        table: tableName.value,
    });
}

function callListRows() {
    if (!tableName.value) {
        errorBanner.value = 'table name is required';
        return;
    }
    run('listRows', () => listCrudRows(tableName.value), {
        table: tableName.value,
    });
}

function callLookup() {
    if (!tableName.value) {
        errorBanner.value = 'table name is required';
        return;
    }
    let body: unknown;
    try {
        body = parseBody();
    } catch {
        return;
    }
    run('lookup', () => lookupCrudRow(tableName.value, body), {
        table: tableName.value,
        body,
    });
}

function callCreate() {
    if (!tableName.value) {
        errorBanner.value = 'table name is required';
        return;
    }
    let body: unknown;
    try {
        body = parseBody();
    } catch {
        return;
    }
    run('create', () => createCrudRow(tableName.value, body), {
        table: tableName.value,
        body,
    });
}

function callUpdate() {
    if (!tableName.value) {
        errorBanner.value = 'table name is required';
        return;
    }
    let body: unknown;
    try {
        body = parseBody();
    } catch {
        return;
    }
    run('update', () => updateCrudRow(tableName.value, body), {
        table: tableName.value,
        body,
    });
}

function callDelete() {
    if (!tableName.value) {
        errorBanner.value = 'table name is required';
        return;
    }
    let body: unknown;
    try {
        body = parseBody();
    } catch {
        return;
    }
    run('delete', () => deleteCrudRow(tableName.value, body), {
        table: tableName.value,
        body,
    });
}

const prettyResult = computed(() => {
    if (!lastResult.value) return '';
    try {
        return JSON.stringify(lastResult.value, null, 2);
    } catch {
        return String(lastResult.value);
    }
});
</script>

<template>
    <div class="admcrud-page">
        <header class="admcrud-header">
            <h1>Admin · Data Broker CRUD</h1>
            <p class="admcrud-subtitle">
                Placeholder probe for
                <code>/api/admin/crud/*</code> — open the browser console to see
                <code>[ADMCRUD-UI]</code> and server <code>[ADMCRUD]</code> logs
                (the latter appear in the dev / Vercel server log).
            </p>
        </header>

        <SignedOut>
            <div class="admcrud-callout">
                You must be signed in to use admin CRUD.
                <SignInButton />
            </div>
        </SignedOut>

        <SignedIn>
            <div v-if="!featureChecked" class="admcrud-callout">
                Checking feature flag…
            </div>

            <div
                v-else-if="!featureEnabled"
                class="admcrud-callout admcrud-callout--warn"
            >
                <strong
                    >Feature flag <code>{{ FEATURE_FLAG }}</code> is not enabled
                    for your account.</strong
                >
                <div>
                    Features seen for this user:
                    <code>{{ JSON.stringify(featureList) }}</code>
                </div>
                <div>
                    The page is otherwise wired up — once the broker enables the
                    flag, the buttons below will fire real requests.
                </div>
            </div>

            <div v-else>
                <div v-if="errorBanner" class="admcrud-error">
                    {{ errorBanner }}
                </div>

                <section class="admcrud-section admcrud-section--probe">
                    <h2>One-click discovery probe</h2>
                    <p class="admcrud-meta">
                        Hits every read-only endpoint (tables, schema for the
                        first 5 tables, list rows for each, and an empty-body
                        lookup) and dumps the full envelopes into the textarea.
                        Nothing is created, updated, or deleted.
                    </p>
                    <div class="admcrud-button-row">
                        <button
                            type="button"
                            class="admcrud-btn admcrud-btn--primary"
                            v-bind:disabled="probeRunning"
                            v-on:click="runProbe"
                        >
                            {{
                                probeRunning
                                    ? 'Running probe…'
                                    : 'Run discovery probe'
                            }}
                        </button>
                        <button
                            type="button"
                            class="admcrud-btn"
                            v-bind:disabled="!probeOutput"
                            v-on:click="copyProbe"
                        >
                            {{ probeCopied ? 'Copied ✓' : 'Copy to clipboard' }}
                        </button>
                    </div>
                    <textarea
                        class="admcrud-textarea admcrud-probe-output"
                        readonly
                        spellcheck="false"
                        placeholder="Click 'Run discovery probe' above — output appears here, then 'Copy to clipboard' and paste back."
                        v-bind:value="probeOutput"
                    ></textarea>
                </section>

                <section class="admcrud-section">
                    <h2>1. List tables</h2>
                    <button
                        type="button"
                        class="admcrud-btn"
                        v-bind:disabled="isLoading"
                        v-on:click="callListTables"
                    >
                        GET /admin/crud/tables
                    </button>
                </section>

                <section class="admcrud-section">
                    <h2>2. Pick a table</h2>
                    <label class="admcrud-label">
                        Table name
                        <input
                            v-model="tableName"
                            type="text"
                            class="admcrud-input"
                            placeholder="e.g. users"
                        />
                    </label>
                    <div class="admcrud-button-row">
                        <button
                            type="button"
                            class="admcrud-btn"
                            v-bind:disabled="isLoading"
                            v-on:click="callGetSchema"
                        >
                            GET …/:table/schema
                        </button>
                        <button
                            type="button"
                            class="admcrud-btn"
                            v-bind:disabled="isLoading"
                            v-on:click="callListRows"
                        >
                            GET …/:table
                        </button>
                    </div>
                </section>

                <section class="admcrud-section">
                    <h2>
                        3. JSON body (for lookup / create / update / delete)
                    </h2>
                    <textarea
                        v-model="bodyJson"
                        class="admcrud-textarea"
                        rows="8"
                        spellcheck="false"
                    ></textarea>
                    <div class="admcrud-button-row">
                        <button
                            type="button"
                            class="admcrud-btn"
                            v-bind:disabled="isLoading"
                            v-on:click="callLookup"
                        >
                            POST …/lookup
                        </button>
                        <button
                            type="button"
                            class="admcrud-btn admcrud-btn--primary"
                            v-bind:disabled="isLoading"
                            v-on:click="callCreate"
                        >
                            POST …/:table (create)
                        </button>
                        <button
                            type="button"
                            class="admcrud-btn"
                            v-bind:disabled="isLoading"
                            v-on:click="callUpdate"
                        >
                            PATCH …/:table (update)
                        </button>
                        <button
                            type="button"
                            class="admcrud-btn admcrud-btn--danger"
                            v-bind:disabled="isLoading"
                            v-on:click="callDelete"
                        >
                            DELETE …/:table
                        </button>
                    </div>
                </section>

                <section class="admcrud-section">
                    <h2>Last response</h2>
                    <div v-if="lastAction" class="admcrud-meta">
                        action: <code>{{ lastAction }}</code>
                        <span v-if="lastResult?._method">
                            · {{ lastResult._method }}
                        </span>
                        <span v-if="lastResult?._url">
                            · <code>{{ lastResult._url }}</code>
                        </span>
                        <span v-if="lastResult?._status">
                            · status {{ lastResult._status }}
                        </span>
                        <span
                            v-if="
                                lastResult?._durationMs !== undefined &&
                                lastResult?._durationMs !== null
                            "
                        >
                            · {{ lastResult._durationMs }}ms
                        </span>
                    </div>
                    <pre
                        v-if="prettyResult"
                        class="admcrud-result"
                    ><code>{{ prettyResult }}</code></pre>
                    <p v-else class="admcrud-meta">
                        No response yet — click a button above.
                    </p>
                </section>
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

.admcrud-header h1 {
    margin: 0 0 4px;
    font-size: 1.5rem;
}

.admcrud-subtitle {
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.875rem;
    margin: 0 0 24px;
}

.admcrud-callout {
    padding: 16px;
    border: 1px solid var(--gh-border-default, #30363d);
    border-radius: 6px;
    background: var(--gh-canvas-subtle, #161b22);
    margin-bottom: 16px;
}

.admcrud-callout--warn {
    border-color: #9e6a03;
    background: #1f1500;
}

.admcrud-error {
    padding: 8px 12px;
    border: 1px solid #f85149;
    background: #2a0f10;
    color: #ffa198;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 0.875rem;
}

.admcrud-section {
    border: 1px solid var(--gh-border-default, #30363d);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 16px;
    background: var(--gh-canvas-subtle, #161b22);
}

.admcrud-section h2 {
    margin: 0 0 12px;
    font-size: 1rem;
    font-weight: 600;
}

.admcrud-label {
    display: block;
    font-size: 0.875rem;
    color: var(--gh-fg-muted, #8b949e);
    margin-bottom: 12px;
}

.admcrud-input,
.admcrud-textarea {
    display: block;
    width: 100%;
    margin-top: 4px;
    padding: 6px 10px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-canvas-default, #0d1117);
    color: inherit;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-size: 0.875rem;
}

.admcrud-textarea {
    min-height: 140px;
    resize: vertical;
}

.admcrud-section--probe {
    border-color: #2ea043;
}

.admcrud-probe-output {
    margin-top: 12px;
    min-height: 280px;
    font-size: 0.75rem;
    line-height: 1.4;
}

.admcrud-button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

.admcrud-btn {
    padding: 6px 12px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-btn-bg, #21262d);
    color: inherit;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    font-family: inherit;
}

.admcrud-btn:hover:not(:disabled) {
    background: #30363d;
}

.admcrud-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.admcrud-btn--primary {
    background: #238636;
    border-color: #2ea043;
}

.admcrud-btn--primary:hover:not(:disabled) {
    background: #2ea043;
}

.admcrud-btn--danger {
    background: #6e2222;
    border-color: #8e3a3a;
}

.admcrud-btn--danger:hover:not(:disabled) {
    background: #8e3a3a;
}

.admcrud-meta {
    font-size: 0.8125rem;
    color: var(--gh-fg-muted, #8b949e);
    margin-bottom: 8px;
}

.admcrud-meta code {
    word-break: break-all;
}

.admcrud-result {
    background: var(--gh-canvas-default, #0d1117);
    border: 1px solid var(--gh-border-default, #30363d);
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    max-height: 480px;
    font-size: 0.8125rem;
    white-space: pre;
    margin: 0;
}

code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-size: 0.875em;
}
</style>
