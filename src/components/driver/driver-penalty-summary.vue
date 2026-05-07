<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type {
    StewardRuling,
    Sanction,
} from '@@/lplib/endpoint-types/iracing-endpoints';
import {
    getDefaultDriverPenaltySummaryModel,
    getDriverPenaltySummaryModel,
} from '@@/src/models/steward/driver-penalty-summary-model';
import type { DriverPenaltySummaryModel } from '@@/src/models/steward/driver-penalty-summary-model';
import { parseRulingDate } from '@@/src/models/steward/steward-rulings-model';

const props = defineProps<{
    league: string;
    season: string;
    driver: string;
}>();

const model: Ref<DriverPenaltySummaryModel> = ref(
    getDefaultDriverPenaltySummaryModel()
);

async function fetchModel() {
    if (!props.league || !props.season || !props.driver) return;
    model.value = await getDriverPenaltySummaryModel(
        props.league,
        props.season,
        props.driver
    );
}

watchEffect(fetchModel);

const hasRulings = computed(() => model.value.rulings.length > 0);

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = parseRulingDate(iso);
    if (!d) return iso;
    // Formats the UTC instant in the user's locale and time zone.
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

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

function joinedSanctions(r: StewardRuling): string {
    if (!r.sanctions || r.sanctions.length === 0) return '';
    return r.sanctions.map(sanctionLabel).join(', ');
}
</script>

<template>
    <section v-if="hasRulings" class="section">
        <header class="section__head">
            <span class="section__title">Steward Rulings</span>
        </header>

        <div class="penalty-totals">
            <div class="penalty-total">
                <span class="penalty-total-label">License points</span>
                <span class="penalty-total-value num">{{
                    model.totalLicensePoints
                }}</span>
            </div>
            <div class="penalty-total">
                <span class="penalty-total-label">Rulings</span>
                <span class="penalty-total-value num">{{
                    model.totalRulings
                }}</span>
            </div>
            <div class="penalty-total">
                <span class="penalty-total-label">Champ. pts</span>
                <span class="penalty-total-value num">{{
                    model.totalChampionshipPointDeduction
                }}</span>
            </div>
        </div>

        <table class="penalty-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Classification</th>
                    <th>Infraction</th>
                    <th>Sanctions</th>
                    <th class="text-end">License pts</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="r in model.rulings" :key="r.ruling_id">
                    <td class="num">{{ formatDate(r.ruling_date) }}</td>
                    <td>{{ r.classification || '—' }}</td>
                    <td>{{ r.infraction || '—' }}</td>
                    <td>{{ joinedSanctions(r) || '—' }}</td>
                    <td class="text-end num">{{ r.license_points || 0 }}</td>
                </tr>
            </tbody>
        </table>
    </section>
</template>

<style scoped>
.penalty-totals {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-4);
}

.penalty-total {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 7rem;
}
.penalty-total-label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    font-weight: 600;
}
.penalty-total-value {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
}

.penalty-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
}
.penalty-table th {
    text-align: left;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--text-muted);
    font-weight: 600;
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--rule);
}
.penalty-table td {
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--rule);
    color: var(--text-primary);
}
.penalty-table tbody tr:last-child td {
    border-bottom: 0;
}
.penalty-table .text-end {
    text-align: right;
}
</style>
