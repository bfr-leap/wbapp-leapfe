<script setup lang="ts">
/**
 * Admin · schema-driven table browser.
 *
 * Generic CRUD UI over the LEAP Data Broker's `/api/admin/crud/*`
 * endpoints. Pick a table, browse paginated rows, edit/create/delete
 * via a form auto-generated from the table's schema.
 *
 * Gated client-side by the `global_admin` feature flag (broker
 * enforces the same gate server-side).
 */
import { ref, computed, watch } from 'vue';
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
    type CrudKey,
    type CrudResult,
    type CrudValues,
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

// ---------------------------------------------------------------------
// Feature gate
// ---------------------------------------------------------------------

const featureChecked = ref(false);
const featureEnabled = ref(false);
const featureList: Ref<string[]> = ref([]);

async function ensureFeatures() {
    if (featureChecked.value) return;
    try {
        const features = await getUserFeatures();
        featureList.value = Array.isArray(features) ? features : [];
        featureEnabled.value = featureList.value.includes(FEATURE_FLAG);
    } catch (e) {
        console.error('[ADMIN] feature check failed', e);
        featureEnabled.value = false;
    } finally {
        featureChecked.value = true;
    }
}

if (import.meta.client) {
    ensureFeatures();
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

interface TableInfo {
    table: string;
    kafkaNamespace?: string;
    kafkaEntity?: string;
}

interface SchemaColumn {
    name: string;
    type: string;
    notnull: boolean;
    pk: number;
    dflt_value: string | null;
}

interface TableSchema {
    table: string;
    columns: SchemaColumn[];
    pkColumns: string[];
}

interface ListPayload {
    table: string;
    rows: Record<string, unknown>[];
    total: number;
    pageSize: number;
    offset: number;
}

type FormMode = 'create' | 'edit' | null;

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------

const route = useRoute();
const router = useRouter();

const tables: Ref<TableInfo[]> = ref([]);
const tablesError = ref('');
const tablesLoading = ref(false);

const selectedTable = ref<string>(
    typeof route.query.table === 'string' ? route.query.table : ''
);

const schema: Ref<TableSchema | null> = ref(null);
const rows: Ref<Record<string, unknown>[]> = ref([]);
const totalRows = ref(0);
const pageSize = ref(25);
const offset = ref(0);
const listLoading = ref(false);
const listError = ref('');

const orderBy = ref<string>('');
const orderDir = ref<'ASC' | 'DESC' | ''>('');
const filters = ref<Record<string, string>>({});

const form = ref<{
    mode: FormMode;
    values: Record<string, string | null>;
    nullFlags: Record<string, boolean>;
    key: CrudKey | null;
    busy: boolean;
    error: string;
}>({
    mode: null,
    values: {},
    nullFlags: {},
    key: null,
    busy: false,
    error: '',
});

const toast = ref<{ msg: string; kind: 'ok' | 'err' } | null>(null);
function showToast(msg: string, kind: 'ok' | 'err' = 'ok') {
    toast.value = { msg, kind };
    setTimeout(() => {
        if (toast.value?.msg === msg) toast.value = null;
    }, 4000);
}

// ---------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------

async function loadTables() {
    tablesLoading.value = true;
    tablesError.value = '';
    try {
        const r = await listCrudTables();
        if (r._error) {
            tablesError.value = explain(r);
            return;
        }
        const data = r._data as { tables?: TableInfo[] } | null;
        tables.value = data?.tables ?? [];
    } catch (e) {
        tablesError.value = e instanceof Error ? e.message : String(e);
    } finally {
        tablesLoading.value = false;
    }
}

async function loadSchema(table: string) {
    schema.value = null;
    if (!table) return;
    const r = await getCrudSchema(table);
    if (r._error) {
        listError.value = explain(r);
        return;
    }
    schema.value = r._data as TableSchema;
}

async function loadRows() {
    if (!selectedTable.value) return;
    listLoading.value = true;
    listError.value = '';
    try {
        const where: Record<string, string> = {};
        for (const [k, v] of Object.entries(filters.value)) {
            const trimmed = (v ?? '').trim();
            if (trimmed !== '') where[k] = trimmed;
        }
        const r = await listCrudRows(selectedTable.value, {
            pageSize: pageSize.value,
            offset: offset.value,
            orderBy: orderBy.value || undefined,
            orderDir: orderDir.value || undefined,
            where: Object.keys(where).length ? where : undefined,
        });
        if (r._error) {
            listError.value = explain(r);
            rows.value = [];
            totalRows.value = 0;
            return;
        }
        const data = r._data as ListPayload | null;
        rows.value = data?.rows ?? [];
        totalRows.value = data?.total ?? 0;
    } catch (e) {
        listError.value = e instanceof Error ? e.message : String(e);
    } finally {
        listLoading.value = false;
    }
}

function explain(r: CrudResult): string {
    if (r._data && typeof r._data === 'object') {
        const o = r._data as Record<string, unknown>;
        if (typeof o.error === 'string') return o.error;
    }
    return r._message ?? `HTTP ${r._status ?? '?'}`;
}

// ---------------------------------------------------------------------
// Table selection
// ---------------------------------------------------------------------

async function onSelectTable(name: string) {
    selectedTable.value = name;
    offset.value = 0;
    orderBy.value = '';
    orderDir.value = '';
    filters.value = {};
    closeForm();
    router.replace({
        path: '/admin',
        query: name ? { table: name } : {},
    });
    if (!name) {
        schema.value = null;
        rows.value = [];
        totalRows.value = 0;
        return;
    }
    await loadSchema(name);
    await loadRows();
}

// ---------------------------------------------------------------------
// Sort and filter
// ---------------------------------------------------------------------

function cycleSort(colName: string) {
    if (orderBy.value !== colName) {
        orderBy.value = colName;
        orderDir.value = 'ASC';
    } else if (orderDir.value === 'ASC') {
        orderDir.value = 'DESC';
    } else {
        orderBy.value = '';
        orderDir.value = '';
    }
    offset.value = 0;
    loadRows();
}

function applyFilters() {
    offset.value = 0;
    loadRows();
}

function clearFilters() {
    filters.value = {};
    offset.value = 0;
    loadRows();
}

const hasActiveFilters = computed(() =>
    Object.values(filters.value).some((v) => (v ?? '').trim() !== '')
);

// ---------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------

const hasNext = computed(
    () => offset.value + rows.value.length < totalRows.value
);

async function nextPage() {
    if (!hasNext.value) return;
    offset.value += pageSize.value;
    await loadRows();
}

async function prevPage() {
    if (offset.value === 0) return;
    offset.value = Math.max(0, offset.value - pageSize.value);
    await loadRows();
}

watch(pageSize, async () => {
    offset.value = 0;
    if (selectedTable.value) await loadRows();
});

// ---------------------------------------------------------------------
// Row identity
// ---------------------------------------------------------------------

function rowKeyValue(row: Record<string, unknown>): string {
    if (!schema.value) return JSON.stringify(row);
    return schema.value.pkColumns
        .map((c) => `${c}=${JSON.stringify(row[c])}`)
        .join(',');
}

function buildKey(row: Record<string, unknown>): CrudKey {
    const out: CrudKey = {};
    if (!schema.value) return out;
    for (const col of schema.value.pkColumns) {
        const v = row[col];
        if (typeof v === 'number' || typeof v === 'string') {
            out[col] = v;
        } else if (v != null) {
            out[col] = String(v);
        }
    }
    return out;
}

function describeKey(key: CrudKey | null): string {
    if (!key) return '';
    return Object.entries(key)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
}

function formatCell(v: unknown): string {
    if (v === null || v === undefined) return '∅';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

// ---------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------

function isPkColumn(col: SchemaColumn): boolean {
    return !!schema.value?.pkColumns.includes(col.name);
}

function isAutoIncrementPk(col: SchemaColumn): boolean {
    return (
        isPkColumn(col) &&
        col.type.toUpperCase() === 'INTEGER' &&
        schema.value?.pkColumns.length === 1
    );
}

function inputTypeFor(col: SchemaColumn): string {
    return col.type.toUpperCase() === 'INTEGER' ? 'number' : 'text';
}

function formColumns(): SchemaColumn[] {
    if (!schema.value) return [];
    if (form.value.mode === 'create') {
        return schema.value.columns.filter((c) => !isAutoIncrementPk(c));
    }
    return schema.value.columns;
}

function startCreate() {
    if (!schema.value) return;
    const values: Record<string, string | null> = {};
    const nullFlags: Record<string, boolean> = {};
    for (const col of schema.value.columns) {
        if (isAutoIncrementPk(col)) continue;
        if (col.dflt_value !== null && col.dflt_value !== undefined) {
            values[col.name] = String(col.dflt_value);
        } else {
            values[col.name] = '';
        }
        nullFlags[col.name] = false;
    }
    form.value = {
        mode: 'create',
        values,
        nullFlags,
        key: null,
        busy: false,
        error: '',
    };
}

function startEdit(row: Record<string, unknown>) {
    if (!schema.value) return;
    const values: Record<string, string | null> = {};
    const nullFlags: Record<string, boolean> = {};
    for (const col of schema.value.columns) {
        const raw = row[col.name];
        if (raw === null || raw === undefined) {
            values[col.name] = '';
            nullFlags[col.name] = !col.notnull;
        } else {
            values[col.name] =
                typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
            nullFlags[col.name] = false;
        }
    }
    form.value = {
        mode: 'edit',
        values,
        nullFlags,
        key: buildKey(row),
        busy: false,
        error: '',
    };
}

function closeForm() {
    form.value = {
        mode: null,
        values: {},
        nullFlags: {},
        key: null,
        busy: false,
        error: '',
    };
}

function coerceValue(
    col: SchemaColumn,
    raw: string | null,
    isNull: boolean
): string | number | null | undefined {
    if (isNull) return null;
    if (raw === null) return null;
    const trimmed = raw.trim();
    if (trimmed === '') {
        if (!col.notnull) return null;
        return undefined;
    }
    if (col.type.toUpperCase() === 'INTEGER') {
        const n = Number(trimmed);
        if (!Number.isFinite(n)) {
            throw new Error(`column "${col.name}" expects INTEGER`);
        }
        return n;
    }
    return trimmed;
}

async function submitForm() {
    if (!schema.value || !form.value.mode) return;
    form.value.busy = true;
    form.value.error = '';
    try {
        const values: CrudValues = {};
        for (const col of schema.value.columns) {
            if (form.value.mode === 'create' && isAutoIncrementPk(col)) {
                continue;
            }
            const raw = form.value.values[col.name] ?? '';
            const isNull = !!form.value.nullFlags[col.name];
            const coerced = coerceValue(col, raw, isNull);
            if (coerced === undefined) {
                if (form.value.mode === 'edit' && isPkColumn(col)) continue;
                if (col.dflt_value !== null) continue;
                throw new Error(`column "${col.name}" requires a value`);
            }
            values[col.name] = coerced;
        }

        let result: CrudResult;
        if (form.value.mode === 'create') {
            result = await createCrudRow(selectedTable.value, values);
        } else {
            const setValues: CrudValues = {};
            for (const [k, v] of Object.entries(values)) {
                if (schema.value.pkColumns.includes(k)) continue;
                setValues[k] = v;
            }
            if (Object.keys(setValues).length === 0) {
                throw new Error('no non-PK columns to update');
            }
            result = await updateCrudRow(
                selectedTable.value,
                form.value.key!,
                setValues
            );
        }
        if (result._error) {
            form.value.error = explain(result);
            return;
        }
        showToast(
            form.value.mode === 'create' ? 'Row created' : 'Row updated',
            'ok'
        );
        closeForm();
        await loadRows();
    } catch (e) {
        form.value.error = e instanceof Error ? e.message : String(e);
    } finally {
        form.value.busy = false;
    }
}

async function deleteSelected() {
    if (!form.value.key) return;
    const desc = describeKey(form.value.key);
    if (!confirm(`Delete row ${desc} from ${selectedTable.value}?`)) return;
    form.value.busy = true;
    form.value.error = '';
    try {
        const r = await deleteCrudRow(selectedTable.value, form.value.key);
        if (r._error) {
            form.value.error = explain(r);
            return;
        }
        const data = r._data as { deleted?: boolean } | null;
        if (data?.deleted === false) {
            showToast('Row not found', 'err');
        } else {
            showToast('Row deleted', 'ok');
        }
        closeForm();
        await loadRows();
    } catch (e) {
        form.value.error = e instanceof Error ? e.message : String(e);
    } finally {
        form.value.busy = false;
    }
}

async function refreshSelected() {
    if (!form.value.key) return;
    const r = await lookupCrudRow(selectedTable.value, form.value.key);
    if (r._error) {
        form.value.error = explain(r);
        return;
    }
    if (!r._data) {
        showToast('Row no longer exists', 'err');
        closeForm();
        return;
    }
    startEdit(r._data as Record<string, unknown>);
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------

async function boot() {
    await ensureFeatures();
    if (!featureEnabled.value) return;
    await loadTables();
    if (selectedTable.value) {
        await loadSchema(selectedTable.value);
        await loadRows();
    }
}

if (import.meta.client) {
    boot();
}

const pageInfo = computed(() => {
    if (totalRows.value === 0) return rows.value.length ? '' : 'no rows';
    const from = offset.value + 1;
    const to = offset.value + rows.value.length;
    return `${from}–${to} of ${totalRows.value}`;
});
</script>

<template>
    <div class="admin-page">
        <header class="admin-build-banner">
            <span class="admin-build-label">build:</span>
            <code class="admin-build-sha">{{ buildShaShort }}</code>
            <span v-if="buildTime" class="admin-build-time">{{
                buildTime
            }}</span>
        </header>

        <h1>Admin · Tables</h1>

        <SignedOut>
            <p class="admin-callout">
                You must be signed in.
                <SignInButton />
            </p>
        </SignedOut>

        <SignedIn>
            <p v-if="!featureChecked" class="admin-callout">
                Checking feature flag…
            </p>

            <p
                v-else-if="!featureEnabled"
                class="admin-callout admin-callout--warn"
            >
                Feature flag <code>{{ FEATURE_FLAG }}</code> is not enabled for
                your account. Features:
                <code>{{ JSON.stringify(featureList) }}</code>
            </p>

            <div v-else class="admin-content">
                <Transition name="admin-toast">
                    <div
                        v-if="toast"
                        class="admin-toast"
                        v-bind:class="`admin-toast--${toast.kind}`"
                    >
                        {{ toast.msg }}
                    </div>
                </Transition>

                <section class="admin-picker">
                    <label for="table-select" class="admin-picker-label"
                        >Table</label
                    >
                    <select
                        id="table-select"
                        class="admin-select"
                        v-bind:value="selectedTable"
                        v-bind:disabled="tablesLoading"
                        v-on:change="
                            onSelectTable(
                                ($event.target as HTMLSelectElement).value
                            )
                        "
                    >
                        <option value="">— pick a table —</option>
                        <option
                            v-for="t in tables"
                            v-bind:key="t.table"
                            v-bind:value="t.table"
                        >
                            {{ t.table }}
                        </option>
                    </select>
                    <span v-if="tablesError" class="admin-error">{{
                        tablesError
                    }}</span>
                    <span v-if="schema" class="admin-meta">
                        PK: <code>{{ schema.pkColumns.join(', ') }}</code> ·
                        {{ schema.columns.length }} cols
                    </span>
                </section>

                <div v-if="selectedTable" class="admin-toolbar">
                    <button
                        type="button"
                        class="admin-btn admin-btn--primary"
                        v-bind:disabled="!schema || form.mode !== null"
                        v-on:click="startCreate"
                    >
                        + New row
                    </button>
                    <button
                        type="button"
                        class="admin-btn"
                        v-bind:disabled="listLoading"
                        v-on:click="loadRows"
                    >
                        Reload
                    </button>
                    <span class="admin-toolbar-spacer"></span>
                    <span v-if="listLoading" class="admin-meta">
                        Loading…
                    </span>
                    <span v-else class="admin-meta">{{ pageInfo }}</span>
                    <label class="admin-page-size">
                        page size
                        <select
                            class="admin-select admin-select--small"
                            v-model.number="pageSize"
                        >
                            <option v-bind:value="10">10</option>
                            <option v-bind:value="25">25</option>
                            <option v-bind:value="50">50</option>
                            <option v-bind:value="100">100</option>
                        </select>
                    </label>
                    <button
                        type="button"
                        class="admin-btn"
                        v-bind:disabled="offset === 0 || listLoading"
                        v-on:click="prevPage"
                    >
                        ‹ Prev
                    </button>
                    <button
                        type="button"
                        class="admin-btn"
                        v-bind:disabled="!hasNext || listLoading"
                        v-on:click="nextPage"
                    >
                        Next ›
                    </button>
                </div>

                <p v-if="listError" class="admin-error">
                    {{ listError }}
                </p>

                <div v-if="schema" class="admin-grid-wrap">
                    <table class="admin-grid">
                        <thead>
                            <tr>
                                <th
                                    v-for="col in schema.columns"
                                    v-bind:key="col.name"
                                    class="admin-grid-header"
                                    v-bind:class="{
                                        'admin-grid-pk': col.pk > 0,
                                        'admin-grid-header--sorted':
                                            orderBy === col.name,
                                    }"
                                    v-bind:title="`Click to sort by ${col.name}`"
                                    v-on:click="cycleSort(col.name)"
                                >
                                    {{ col.name }}
                                    <span
                                        v-if="orderBy === col.name"
                                        class="admin-sort-arrow"
                                        >{{
                                            orderDir === 'ASC' ? '↑' : '↓'
                                        }}</span
                                    >
                                    <span
                                        v-if="col.pk > 0"
                                        class="admin-pk-marker"
                                        >PK</span
                                    >
                                    <small class="admin-col-type">{{
                                        col.type
                                    }}</small>
                                </th>
                                <th class="admin-grid-actions">edit</th>
                            </tr>
                            <tr class="admin-filter-row">
                                <th
                                    v-for="col in schema.columns"
                                    v-bind:key="col.name"
                                >
                                    <input
                                        v-model="filters[col.name]"
                                        v-bind:type="
                                            col.type.toUpperCase() === 'INTEGER'
                                                ? 'number'
                                                : 'text'
                                        "
                                        class="admin-filter-input"
                                        v-bind:placeholder="`filter…`"
                                        v-bind:disabled="listLoading"
                                        v-on:change="applyFilters"
                                        v-on:keyup.enter="applyFilters"
                                    />
                                </th>
                                <th class="admin-grid-actions">
                                    <button
                                        v-if="hasActiveFilters"
                                        type="button"
                                        class="admin-btn admin-btn--small"
                                        v-on:click="clearFilters"
                                    >
                                        clear
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="row in rows"
                                v-bind:key="rowKeyValue(row)"
                                v-bind:class="{
                                    'admin-grid-row--active':
                                        form.mode === 'edit' &&
                                        rowKeyValue(row) ===
                                            describeKey(form.key) +
                                                ' ' +
                                                rowKeyValue(row),
                                }"
                            >
                                <td
                                    v-for="col in schema.columns"
                                    v-bind:key="col.name"
                                    v-bind:title="formatCell(row[col.name])"
                                >
                                    <span
                                        v-if="row[col.name] === null"
                                        class="admin-null"
                                        >∅</span
                                    >
                                    <span v-else>{{
                                        formatCell(row[col.name])
                                    }}</span>
                                </td>
                                <td class="admin-grid-actions">
                                    <button
                                        type="button"
                                        class="admin-btn admin-btn--small"
                                        v-on:click="startEdit(row)"
                                    >
                                        edit
                                    </button>
                                </td>
                            </tr>
                            <tr v-if="!rows.length && !listLoading">
                                <td
                                    v-bind:colspan="schema.columns.length + 1"
                                    class="admin-grid-empty"
                                >
                                    {{
                                        hasActiveFilters
                                            ? 'No rows match the active filters.'
                                            : 'No rows.'
                                    }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <section v-if="form.mode" class="admin-form">
                    <header class="admin-form-header">
                        <h2 class="admin-form-title">
                            {{
                                form.mode === 'create'
                                    ? `New ${selectedTable} row`
                                    : `Edit ${selectedTable}`
                            }}
                            <small v-if="form.mode === 'edit'"
                                >· {{ describeKey(form.key) }}</small
                            >
                        </h2>
                        <button
                            type="button"
                            class="admin-btn"
                            v-on:click="closeForm"
                        >
                            Close
                        </button>
                    </header>

                    <div class="admin-form-fields">
                        <div
                            v-for="col in formColumns()"
                            v-bind:key="col.name"
                            class="admin-form-field"
                        >
                            <label class="admin-form-label">
                                {{ col.name }}
                                <small class="admin-col-type">
                                    {{ col.type
                                    }}{{ col.notnull ? '' : ' · nullable' }}
                                    <span
                                        v-if="
                                            form.mode === 'edit' &&
                                            isPkColumn(col)
                                        "
                                    >
                                        · PK (read-only)
                                    </span>
                                </small>
                            </label>
                            <div class="admin-form-input-row">
                                <input
                                    v-bind:type="inputTypeFor(col)"
                                    class="admin-input"
                                    v-bind:disabled="
                                        form.busy ||
                                        form.nullFlags[col.name] ||
                                        (form.mode === 'edit' &&
                                            isPkColumn(col))
                                    "
                                    v-bind:placeholder="
                                        form.nullFlags[col.name]
                                            ? '(null)'
                                            : col.dflt_value ?? ''
                                    "
                                    v-model="form.values[col.name]"
                                />
                                <label
                                    v-if="!col.notnull"
                                    class="admin-null-toggle"
                                >
                                    <input
                                        type="checkbox"
                                        v-bind:disabled="form.busy"
                                        v-model="form.nullFlags[col.name]"
                                    />
                                    null
                                </label>
                            </div>
                        </div>
                    </div>

                    <p v-if="form.error" class="admin-error">
                        {{ form.error }}
                    </p>

                    <footer class="admin-form-actions">
                        <button
                            type="button"
                            class="admin-btn admin-btn--primary"
                            v-bind:disabled="form.busy"
                            v-on:click="submitForm"
                        >
                            {{ form.mode === 'create' ? 'Create' : 'Save' }}
                        </button>
                        <button
                            type="button"
                            class="admin-btn"
                            v-bind:disabled="form.busy"
                            v-on:click="closeForm"
                        >
                            Cancel
                        </button>
                        <button
                            v-if="form.mode === 'edit'"
                            type="button"
                            class="admin-btn"
                            v-bind:disabled="form.busy"
                            v-on:click="refreshSelected"
                        >
                            Refresh
                        </button>
                        <span class="admin-toolbar-spacer"></span>
                        <button
                            v-if="form.mode === 'edit'"
                            type="button"
                            class="admin-btn admin-btn--danger"
                            v-bind:disabled="form.busy"
                            v-on:click="deleteSelected"
                        >
                            Delete row
                        </button>
                    </footer>
                </section>
            </div>
        </SignedIn>
    </div>
</template>

<style scoped>
.admin-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px 16px 64px;
    color: var(--gh-fg-default, #e6edf3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.admin-build-banner {
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

.admin-build-label {
    color: var(--gh-fg-muted, #8b949e);
}

.admin-build-sha {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-weight: 600;
    color: #7ee787;
    padding: 2px 6px;
    background: rgba(46, 160, 67, 0.15);
    border-radius: 3px;
}

.admin-build-time {
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.75rem;
}

h1 {
    font-size: 1.5rem;
    margin: 0 0 16px;
}

.admin-callout {
    padding: 16px;
    border: 1px solid var(--gh-border-default, #30363d);
    border-radius: 6px;
    background: var(--gh-canvas-subtle, #161b22);
    margin: 0;
}

.admin-callout--warn {
    border-color: #9e6a03;
    background: #1f1500;
}

.admin-meta {
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.8125rem;
}

.admin-error {
    color: #ffa198;
    font-size: 0.875rem;
    background: #2a0f10;
    border: 1px solid #f85149;
    padding: 8px 12px;
    border-radius: 6px;
    margin: 8px 0;
}

.admin-picker {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
}

.admin-picker-label {
    font-weight: 600;
}

.admin-select {
    padding: 6px 10px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-canvas-default, #0d1117);
    color: inherit;
    border-radius: 6px;
    font-size: 0.875rem;
    min-width: 220px;
}

.admin-select--small {
    min-width: 60px;
}

.admin-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.admin-toolbar-spacer {
    flex: 1;
}

.admin-page-size {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.8125rem;
}

.admin-btn {
    padding: 6px 12px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-btn-bg, #21262d);
    color: inherit;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    font-family: inherit;
}

.admin-btn:hover:not(:disabled) {
    background: #30363d;
}

.admin-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.admin-btn--small {
    padding: 2px 8px;
    font-size: 0.75rem;
}

.admin-btn--primary {
    background: #238636;
    border-color: #2ea043;
}

.admin-btn--primary:hover:not(:disabled) {
    background: #2ea043;
}

.admin-btn--danger {
    background: #6e2222;
    border-color: #8e3a3a;
}

.admin-btn--danger:hover:not(:disabled) {
    background: #8e3a3a;
}

.admin-grid-wrap {
    overflow-x: auto;
    border: 1px solid var(--gh-border-default, #30363d);
    border-radius: 6px;
    margin-bottom: 16px;
    background: var(--gh-canvas-subtle, #161b22);
}

.admin-grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
}

.admin-grid th,
.admin-grid td {
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid var(--gh-border-default, #30363d);
    white-space: nowrap;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.admin-grid th {
    background: var(--gh-canvas-default, #0d1117);
    font-weight: 600;
    position: sticky;
    top: 0;
}

.admin-grid-header {
    cursor: pointer;
    user-select: none;
}

.admin-grid-header:hover {
    background: rgba(56, 139, 253, 0.12);
}

.admin-grid-header--sorted {
    background: rgba(46, 160, 67, 0.12);
}

.admin-sort-arrow {
    color: #7ee787;
    margin-left: 4px;
    font-weight: 700;
}

.admin-filter-row th {
    background: var(--gh-canvas-subtle, #161b22);
    padding: 4px 6px;
    font-weight: 400;
    border-bottom: 1px solid var(--gh-border-default, #30363d);
    position: sticky;
    top: 32px;
}

.admin-filter-input {
    width: 100%;
    padding: 3px 6px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-canvas-default, #0d1117);
    color: inherit;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-size: 0.75rem;
    box-sizing: border-box;
}

.admin-grid-empty {
    text-align: center;
    color: var(--gh-fg-muted, #8b949e);
    padding: 24px;
    font-style: italic;
}

.admin-grid-pk {
    color: #7ee787;
}

.admin-col-type {
    color: var(--gh-fg-muted, #8b949e);
    font-weight: 400;
    font-size: 0.6875rem;
    margin-left: 4px;
}

.admin-pk-marker {
    color: #7ee787;
    font-size: 0.625rem;
    font-weight: 700;
    margin-left: 4px;
    padding: 0 4px;
    border: 1px solid #2ea043;
    border-radius: 3px;
}

.admin-grid tbody tr:hover {
    background: rgba(56, 139, 253, 0.08);
}

.admin-grid-actions {
    width: 1%;
    white-space: nowrap;
}

.admin-null {
    color: var(--gh-fg-muted, #8b949e);
}

.admin-form {
    margin-top: 16px;
    border: 1px solid #2ea043;
    background: var(--gh-canvas-subtle, #161b22);
    border-radius: 6px;
    padding: 16px;
}

.admin-form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.admin-form-title {
    margin: 0;
    font-size: 1rem;
}

.admin-form-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
}

.admin-form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.admin-form-label {
    font-size: 0.8125rem;
    font-weight: 600;
}

.admin-form-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.admin-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--gh-border-default, #30363d);
    background: var(--gh-canvas-default, #0d1117);
    color: inherit;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        monospace;
    font-size: 0.875rem;
}

.admin-input:disabled {
    opacity: 0.6;
}

.admin-null-toggle {
    color: var(--gh-fg-muted, #8b949e);
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
}

.admin-form-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.admin-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 10px 16px;
    border-radius: 6px;
    border: 1px solid;
    font-size: 0.875rem;
    z-index: 1000;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.admin-toast--ok {
    background: #0f2a16;
    border-color: #2ea043;
    color: #7ee787;
}

.admin-toast--err {
    background: #2a0f10;
    border-color: #f85149;
    color: #ffa198;
}

.admin-toast-enter-active,
.admin-toast-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.admin-toast-enter-from,
.admin-toast-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
