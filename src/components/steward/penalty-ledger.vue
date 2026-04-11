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
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
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

const standings = computed<DriverLicenseStanding[]>(
    () => model.value.standings
);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <!-- ── Tabs ────────────────────────────────────────────── -->
            <ul class="nav nav-tabs mb-3">
                <li class="nav-item">
                    <button
                        type="button"
                        class="nav-link"
                        :class="{ active: activeTab === 'ledger' }"
                        @click="activeTab = 'ledger'"
                    >
                        Penalty Ledger
                    </button>
                </li>
                <li class="nav-item">
                    <button
                        type="button"
                        class="nav-link"
                        :class="{ active: activeTab === 'standings' }"
                        @click="activeTab = 'standings'"
                    >
                        License Standings
                    </button>
                </li>
            </ul>

            <div v-if="errorMsg" class="alert alert-danger">
                {{ errorMsg }}
            </div>

            <!-- ── Penalty Ledger Tab ──────────────────────────────── -->
            <div v-if="activeTab === 'ledger'">
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <input
                            type="text"
                            class="form-control"
                            placeholder="Filter by driver name or Discord id..."
                            v-model="driverFilter"
                        />
                    </div>
                    <div class="col-md-6">
                        <select
                            class="form-select"
                            v-model="classificationFilter"
                        >
                            <option value="">All classifications</option>
                            <option
                                v-for="c in classifications"
                                :key="c"
                                :value="c"
                            >
                                {{ c }}
                            </option>
                        </select>
                    </div>
                </div>

                <div
                    v-if="
                        !loading &&
                        filteredRulings.length === 0 &&
                        model.rulings.length === 0
                    "
                    class="text-muted py-4 text-center"
                >
                    No steward rulings have been issued for this season.
                </div>
                <div
                    v-else-if="
                        !loading &&
                        filteredRulings.length === 0 &&
                        model.rulings.length > 0
                    "
                    class="text-muted py-4 text-center"
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
                                <span v-if="sessionLabel(r)" class="ms-2">
                                    · {{ sessionLabel(r) }}
                                </span>
                            </div>
                        </div>
                        <div class="ruling-tags">
                            <span
                                v-if="r.classification"
                                class="badge bg-warning text-dark"
                            >
                                {{ r.classification }}
                            </span>
                            <span
                                class="badge bg-danger ms-1"
                                title="License points assigned"
                            >
                                {{ r.license_points || 0 }} pts
                            </span>
                        </div>
                    </div>

                    <div v-if="r.infraction" class="ruling-row">
                        <span class="ruling-label">Infraction:</span>
                        <span>{{ r.infraction }}</span>
                    </div>

                    <div
                        v-if="r.sanctions && r.sanctions.length > 0"
                        class="ruling-row"
                    >
                        <span class="ruling-label">Sanctions:</span>
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
                        <span class="ruling-label">Evidence:</span>
                        <ul class="ruling-evidence">
                            <li v-for="(u, i) in r.evidence_urls" :key="i">
                                <a
                                    v-if="isValidUrl(u)"
                                    :href="u"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {{ u }}
                                </a>
                                <span v-else>{{ u }}</span>
                            </li>
                        </ul>
                    </div>

                    <div v-if="r.steward_notes" class="ruling-row">
                        <span class="ruling-label">Steward notes:</span>
                        <div class="ruling-notes">{{ r.steward_notes }}</div>
                    </div>
                </div>
            </div>

            <!-- ── License Standings Tab ───────────────────────────── -->
            <div v-if="activeTab === 'standings'">
                <div
                    v-if="!loading && standings.length === 0"
                    class="text-muted py-4 text-center"
                >
                    No license points have been issued this season.
                </div>
                <table v-else class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Driver</th>
                            <th class="text-end">License points</th>
                            <th class="text-end">Rulings</th>
                            <th class="text-end">Champ. pts deducted</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(s, i) in standings" :key="s.key">
                            <td>{{ i + 1 }}</td>
                            <td>{{ s.driverName }}</td>
                            <td class="text-end">{{ s.totalLicensePoints }}</td>
                            <td class="text-end">{{ s.totalRulings }}</td>
                            <td class="text-end">
                                {{ s.totalChampionshipPointDeduction }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ruling-card {
    border: 1px solid var(--gh-border-default);
    border-radius: var(--gh-radius-md);
    padding: 12px;
    margin-bottom: 12px;
    background-color: var(--gh-canvas-subtle);
}

.ruling-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
}

.ruling-driver {
    font-weight: 600;
    font-size: 1rem;
}

.ruling-meta {
    font-size: 0.85rem;
    color: var(--gh-fg-muted);
}

.ruling-tags {
    flex-shrink: 0;
}

.ruling-row {
    margin-top: 6px;
    font-size: 0.9rem;
}

.ruling-label {
    font-weight: 600;
    color: var(--gh-fg-muted);
    margin-right: 6px;
}

.ruling-sanctions,
.ruling-evidence {
    margin: 4px 0 0;
    padding-left: 20px;
}

.ruling-notes {
    margin-top: 4px;
    white-space: pre-wrap;
}

.nav-tabs .nav-link {
    color: var(--gh-fg-muted);
    background: transparent;
    border-color: transparent;
}

.nav-tabs .nav-link.active {
    color: var(--gh-fg-default);
    background-color: var(--gh-canvas-subtle);
    border-color: var(--gh-border-default) var(--gh-border-default) transparent;
}
</style>
