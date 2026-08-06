<script setup lang="ts">
/**
 * League steward decisions — the points adjustments behind results that
 * otherwise look wrong.
 *
 * Deliberately NOT merged with `penalty-ledger.vue`: that reads steward
 * rulings from `ldata-stwdcfg`, a different producer with a different
 * vocabulary and a different authority. Showing both under one heading would
 * misattribute one league's decisions to another's process.
 *
 * This is the lazy tier — two documents per race — so it loads on the client
 * only, after mount. Never during SSR.
 */
import { computed, onMounted, ref } from 'vue';
import type { SeasonInfo } from '@@/src/services/srhweb-types';
import type { SrhRaceDetailModel } from '@@/src/models/driver/srh-race-detail-model';
import {
    getSrhRaceDetailModel,
    getDefaultSrhRaceDetailModel,
    observedDescriptions,
} from '@@/src/models/driver/srh-race-detail-model';
import { listRacedSessionKeys } from '@@/src/models/driver/srh-standings-model';

const props = defineProps<{ info: SeasonInfo }>();

const detail = ref<SrhRaceDetailModel>(getDefaultSrhRaceDetailModel());
const loading = ref(false);
const activeFilter = ref<string | null>(null);

const raceCount = computed(() => listRacedSessionKeys(props.info).length);

onMounted(async () => {
    loading.value = true;
    try {
        detail.value = await getSrhRaceDetailModel(props.info);
    } finally {
        loading.value = false;
    }
});

// Built from what is actually present — the wording is whatever the league
// typed, and there is no controlled vocabulary to hardcode.
const filters = computed(() => observedDescriptions(detail.value.ledger));

const rows = computed(() =>
    activeFilter.value
        ? detail.value.ledger.filter(
              (r) => r.description === activeFilter.value
          )
        : detail.value.ledger
);

function toggle(f: string) {
    activeFilter.value = activeFilter.value === f ? null : f;
}
</script>

<template>
    <section class="section">
        <header class="section__head">
            <span class="section__title">Steward Decisions</span>
            <span v-if="detail.loaded" class="count-chip"
                >{{ detail.ledger.length }} this season</span
            >
        </header>

        <p class="explainer">
            Points added or deducted by the league after a race. A driver whose
            points don't match their finishing position usually has a row here.
        </p>

        <p v-if="loading" class="muted">
            Loading per-race detail ({{ raceCount * 2 }} documents)…
        </p>

        <template v-else-if="detail.loaded">
            <p v-if="detail.omittedRaces > 0" class="muted">
                Showing the most recent races; {{ detail.omittedRaces }} earlier
                race(s) not loaded.
            </p>

            <div v-if="filters.length > 1" class="filters">
                <button
                    v-for="f in filters"
                    v-bind:key="f"
                    type="button"
                    class="filter-chip"
                    v-bind:class="{ 'filter-chip--on': activeFilter === f }"
                    v-on:click="toggle(f)"
                >
                    {{ f }}
                </button>
            </div>

            <div v-if="rows.length" class="table-scroll">
                <table class="ledger">
                    <thead>
                        <tr>
                            <th>Rd</th>
                            <th>Session</th>
                            <th>Driver</th>
                            <th class="num-col">Pts</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="r in rows"
                            v-bind:key="r.adjustmentId"
                            v-bind:class="`row--${r.kind}`"
                        >
                            <td class="num">{{ r.round }}</td>
                            <td class="muted">
                                {{
                                    r.simsessionNumber === 0
                                        ? 'Feature'
                                        : `Heat ${Math.abs(r.simsessionNumber)}`
                                }}
                            </td>
                            <td>{{ r.driverName }}</td>
                            <td class="num num-col" v-bind:class="r.kind">
                                {{ r.signedPoints > 0 ? '+' : ''
                                }}{{ r.signedPoints }}
                            </td>
                            <td>{{ r.description }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Most races are scored without intervention; an empty ledger is
                 a normal outcome, not a gap. -->
            <p v-else class="muted">
                No stewarding adjustments recorded this season.
            </p>
        </template>
    </section>
</template>

<style scoped>
.count-chip,
.filter-chip {
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    color: var(--text-secondary, #8b949e);
    border: 1px solid var(--border, #30363d);
    border-radius: 3px;
    padding: 0.1rem 0.45rem;
    background: transparent;
}

.filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
}

.filter-chip {
    cursor: pointer;
}

.filter-chip--on {
    color: var(--text-primary, #e6edf3);
    border-color: var(--text-secondary, #8b949e);
}

.explainer {
    color: var(--text-secondary, #8b949e);
    font-size: 0.85rem;
    margin: 0 0 0.75rem;
}

.muted {
    color: var(--text-secondary, #8b949e);
    font-size: 0.85rem;
}

.table-scroll {
    overflow-x: auto;
}

.ledger {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.ledger th,
.ledger td {
    padding: 0.3rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border, #30363d);
    white-space: nowrap;
}

.ledger th {
    color: var(--text-secondary, #8b949e);
    font-weight: 400;
}

.num-col {
    text-align: right;
}

.penalty {
    color: var(--danger, #f85149);
}

.bonus {
    color: var(--success, #3fb950);
}
</style>
