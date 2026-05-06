<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type {
    StewardRuling,
    Sanction,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    getDefaultStewardRulingsModel,
    getStewardRulingsModel,
    parseRulingDate,
    resolveRulingDriverName,
} from '@@/src/models/steward/steward-rulings-model';
import type {
    StewardRulingsModel,
    DriverLicenseStanding,
} from '@@/src/models/steward/steward-rulings-model';

const props = defineProps<{
    league: string;
    season: string;
}>();

const model: Ref<StewardRulingsModel> = ref(getDefaultStewardRulingsModel());
const loading = ref(false);
const errorMsg = ref<string | null>(null);

async function fetchModel() {
    if (!props.league || !props.season) return;
    loading.value = true;
    errorMsg.value = null;
    try {
        model.value = await getStewardRulingsModel(props.league, props.season);
    } catch (e) {
        errorMsg.value = e instanceof Error ? e.message : 'Failed to load.';
    } finally {
        loading.value = false;
    }
}

watchEffect(fetchModel);

// -- Tabs --

type TabKey = 'ledger' | 'standings';
const activeTab: Ref<TabKey> = ref('ledger');

// -- Filters --

const driverFilter = ref('');
const classificationFilter = ref('');

const classifications = computed(() => {
    const set = new Set<string>();
    for (const r of model.value.rulings) {
        if (r.classification) set.add(r.classification);
    }
    return Array.from(set).sort();
});

function rulingDriverName(r: StewardRuling): string {
    return resolveRulingDriverName(r, model.value.driverNameMap);
}

const filteredRulings = computed(() => {
    const dq = driverFilter.value.trim().toLowerCase();
    const cq = classificationFilter.value;
    return model.value.rulings.filter((r) => {
        if (cq && r.classification !== cq) return false;
        if (dq) {
            const name = rulingDriverName(r).toLowerCase();
            const did = (r.discord_user_id || '').toLowerCase();
            if (!name.includes(dq) && !did.includes(dq)) return false;
        }
        return true;
    });
});

// -- Formatting helpers --

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = parseRulingDate(iso);
    if (!d) return iso;
    // Formats the UTC instant in the user's locale and time zone.
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Render a session label like "Feature Race — Lap 1".
 * Both fields are optional and rendered conditionally.
 */
function sessionLabel(r: StewardRuling): string {
    const parts: string[] = [];
    if (r.session_type) {
        parts.push(
            r.session_type
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())
        );
    }
    if (r.lap_number != null) {
        parts.push(`Lap ${r.lap_number}`);
    }
    return parts.join(' — ');
}

/**
 * Convert a sanction into a human-readable label. Sanction types are
 * open-ended; unknown types fall back to a generic format so the UI
 * never silently drops information.
 */
function sanctionLabel(s: Sanction): string {
    if (s.description) return s.description;
    const v = s.value;
    switch (s.type) {
        case 'championship_point_deduction':
            return v != null
                ? `${v} championship point deduction`
                : 'Championship point deduction';
        case 'license_points':
            return v != null ? `${v} license points` : 'License points';
        case 'qualifying_ban':
            return 'Qualifying ban';
        case 'race_ban':
            return v != null ? `${v}-race ban` : 'Race ban';
        case 'grid_penalty':
            return v != null ? `${v}-place grid penalty` : 'Grid penalty';
        case 'time_penalty':
            return v != null ? `${v}s time penalty` : 'Time penalty';
        case 'reprimand':
            return 'Reprimand';
        default: {
            const pretty = s.type ? s.type.replace(/_/g, ' ') : 'Sanction';
            return v != null ? `${pretty}: ${v}` : pretty;
        }
    }
}

function isValidUrl(u: string): boolean {
    try {
        const parsed = new URL(u);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Compress evidence URLs to host + a short tail so a Discord link
 * doesn't dominate the row with a long opaque ID. Falls back to
 * the raw string if the URL doesn't parse.
 */
function shortenUrl(u: string): string {
    try {
        const parsed = new URL(u);
        if (parsed.host.endsWith('discord.com')) return 'Discord message';
        return parsed.host;
    } catch {
        return u;
    }
}

/**
 * Map a classification string to the .tag color modifier so a
 * "Disqualification" reads red, "Major Penalty" orange, "Minor
 * Penalty" yellow, and "Reprimand" stays neutral. Unknown
 * classifications fall through to no modifier.
 */
function classificationTagClass(classification: string): string {
    const k = classification.toLowerCase();
    if (k.includes('disqualif')) return 'tag--dq';
    if (k.includes('major')) return 'tag--penalty';
    if (k.includes('minor') || k.includes('warn')) return 'tag--warn';
    return '';
}

const standings = computed<DriverLicenseStanding[]>(
    () => model.value.standings
);
</script>

<template>
    <div class="page">
        <!-- ── Tabs ────────────────────────────────────────────── -->
        <div class="tabs" role="tablist">
            <button
                type="button"
                class="tabs__item"
                v-bind:class="{ 'tabs__item--active': activeTab === 'ledger' }"
                role="tab"
                v-bind:aria-selected="activeTab === 'ledger'"
                @click="activeTab = 'ledger'"
            >
                Penalty Ledger
            </button>
            <button
                type="button"
                class="tabs__item"
                v-bind:class="{
                    'tabs__item--active': activeTab === 'standings',
                }"
                role="tab"
                v-bind:aria-selected="activeTab === 'standings'"
                @click="activeTab = 'standings'"
            >
                License Standings
            </button>
        </div>

        <div v-if="errorMsg" class="alert alert-danger">
            {{ errorMsg }}
        </div>

        <!-- ── Penalty Ledger Tab ──────────────────────────────── -->
        <div v-if="activeTab === 'ledger'">
            <div class="ledger-filters">
                <div class="ledger-filter">
                    <label
                        for="ledgerDriverFilter"
                        class="ledger-filter-label"
                    >
                        Driver
                    </label>
                    <input
                        id="ledgerDriverFilter"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="Filter by name or Discord id..."
                        v-model="driverFilter"
                    />
                </div>
                <div class="ledger-filter">
                    <label
                        for="ledgerClassFilter"
                        class="ledger-filter-label"
                    >
                        Classification
                    </label>
                    <select
                        id="ledgerClassFilter"
                        class="form-select form-select-sm"
                        v-model="classificationFilter"
                    >
                        <option value="">All classifications</option>
                        <option v-for="c in classifications" :key="c" :value="c">
                            {{ c }}
                        </option>
                    </select>
                </div>
                <button
                    v-if="driverFilter || classificationFilter"
                    type="button"
                    class="button button--ghost button--sm ledger-filter-clear"
                    @click="
                        driverFilter = '';
                        classificationFilter = '';
                    "
                >
                    Clear
                </button>
            </div>

            <div
                v-if="
                    !loading &&
                    filteredRulings.length === 0 &&
                    model.rulings.length === 0
                "
                class="ledger-empty"
            >
                No steward rulings have been issued for this season.
            </div>
            <div
                v-else-if="
                    !loading &&
                    filteredRulings.length === 0 &&
                    model.rulings.length > 0
                "
                class="ledger-empty"
            >
                No rulings match the current filters.
            </div>

            <div
                v-for="r in filteredRulings"
                :key="r.ruling_id"
                class="ruling-card"
            >
                <div class="ruling-card-header">
                    <div>
                        <div class="ruling-driver">
                            {{ rulingDriverName(r) }}
                        </div>
                        <div class="ruling-meta">
                            {{ formatDate(r.ruling_date) }}
                            <span v-if="sessionLabel(r)">
                                · {{ sessionLabel(r) }}
                            </span>
                        </div>
                    </div>
                    <div class="ruling-tags">
                        <span
                            v-if="r.classification"
                            class="tag"
                            v-bind:class="classificationTagClass(r.classification)"
                        >
                            {{ r.classification }}
                        </span>
                        <span
                            class="tag tag--dq"
                            title="License points assigned"
                        >
                            {{ r.license_points || 0 }} pts
                        </span>
                    </div>
                </div>

                <div v-if="r.infraction" class="ruling-row">
                    <span class="ruling-label">Infraction</span>
                    <span>{{ r.infraction }}</span>
                </div>

                <div
                    v-if="r.sanctions && r.sanctions.length > 0"
                    class="ruling-row"
                >
                    <span class="ruling-label">Sanctions</span>
                    <ul class="ruling-sanctions">
                        <li v-for="(s, i) in r.sanctions" :key="i">
                            {{ sanctionLabel(s) }}
                        </li>
                    </ul>
                </div>

                <div
                    v-if="r.evidence_urls && r.evidence_urls.length > 0"
                    class="ruling-row"
                >
                    <span class="ruling-label">Evidence</span>
                    <ul class="ruling-evidence">
                        <li v-for="(u, i) in r.evidence_urls" :key="i">
                            <a
                                v-if="isValidUrl(u)"
                                :href="u"
                                target="_blank"
                                rel="noopener noreferrer"
                                >{{ shortenUrl(u) }} →</a
                            >
                            <span v-else>{{ u }}</span>
                        </li>
                    </ul>
                </div>

                <div v-if="r.steward_notes" class="ruling-row">
                    <span class="ruling-label">Steward notes</span>
                    <div class="ruling-notes">{{ r.steward_notes }}</div>
                </div>
            </div>
        </div>

        <!-- ── License Standings Tab ───────────────────────────── -->
        <div v-if="activeTab === 'standings'">
            <div
                v-if="!loading && standings.length === 0"
                class="ledger-empty"
            >
                No license points have been issued this season.
            </div>
            <table v-else class="standings-table">
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Driver</th>
                        <th class="text-end num">License pts</th>
                        <th class="text-end num">Rulings</th>
                        <th class="text-end num">Champ. pts</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(s, i) in standings" :key="s.key">
                        <td class="num">{{ i + 1 }}</td>
                        <td>{{ s.driverName }}</td>
                        <td class="text-end num">
                            {{ s.totalLicensePoints }}
                        </td>
                        <td class="text-end num">{{ s.totalRulings }}</td>
                        <td class="text-end num">
                            {{ s.totalChampionshipPointDeduction }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.alert {
    background: rgba(214, 36, 58, 0.08);
    border: 1px solid var(--dq);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    padding: var(--space-3) var(--space-4);
    margin-bottom: var(--space-4);
    font-size: var(--text-sm);
}

.ledger-empty {
    color: var(--text-muted);
    text-align: center;
    padding: var(--space-6) 0;
    font-size: var(--text-sm);
}

/* ── Filter bar ─────────────────────────────────────────────── */
.ledger-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
}

.ledger-filter {
    flex: 1 1 220px;
    min-width: 0;
}

.ledger-filter-label {
    display: block;
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    margin-bottom: var(--space-1);
}

.ledger-filter-clear {
    flex: 0 0 auto;
}

.ledger-filters :deep(.form-control),
.ledger-filters :deep(.form-select) {
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
    width: 100%;
}
.ledger-filters :deep(.form-control::placeholder) {
    color: var(--text-muted);
}
.ledger-filters :deep(.form-control:focus),
.ledger-filters :deep(.form-select:focus) {
    background: var(--surface-3);
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
    color: var(--text-primary);
    outline: none;
}

.ledger-filters :deep(.form-select) {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23a8b1bd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right var(--space-3) center;
    background-size: 12px 8px;
    padding-right: 2rem;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
}
.ledger-filters :deep(.form-select option) {
    background: var(--surface-1);
    color: var(--text-primary);
}

/* ── Ruling card ────────────────────────────────────────────── */
.ruling-card {
    padding: var(--space-3) 0;
    border-bottom: var(--rule);
}
.ruling-card:last-child {
    border-bottom: 0;
}

.ruling-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
}

.ruling-driver {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--text-primary);
}

.ruling-meta {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin-top: 2px;
}

.ruling-tags {
    flex-shrink: 0;
    display: inline-flex;
    gap: var(--space-1);
    align-items: center;
}

.ruling-row {
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    line-height: 1.5;
}

.ruling-label {
    display: inline-block;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    font-weight: 600;
    color: var(--text-muted);
    margin-right: var(--space-2);
}

.ruling-sanctions,
.ruling-evidence {
    margin: var(--space-1) 0 0;
    padding-left: var(--space-5);
    color: var(--text-primary);
}
.ruling-sanctions li,
.ruling-evidence li {
    line-height: 1.6;
}

.ruling-evidence a {
    color: var(--text-secondary);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
}
.ruling-evidence a:hover {
    color: var(--text-primary);
}

.ruling-notes {
    margin-top: var(--space-1);
    white-space: pre-wrap;
    color: var(--text-secondary);
}

/* ── License Standings table ───────────────────────────────── */
.standings-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
}
.standings-table th {
    text-align: left;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    font-weight: 600;
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--rule);
}
.standings-table td {
    padding: var(--space-3);
    border-bottom: var(--rule);
    color: var(--text-primary);
}
.standings-table tbody tr:last-child td {
    border-bottom: 0;
}
.standings-table .text-end {
    text-align: right;
}
</style>
