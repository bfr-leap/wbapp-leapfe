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
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
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
    <div v-if="hasRulings" class="gh-content-card">
        <h6 class="penalty-header">Steward Rulings</h6>

        <div class="penalty-totals">
            <div class="penalty-total">
                <div class="penalty-total-value">
                    {{ model.totalLicensePoints }}
                </div>
                <div class="penalty-total-label">License points</div>
            </div>
            <div class="penalty-total">
                <div class="penalty-total-value">{{ model.totalRulings }}</div>
                <div class="penalty-total-label">Rulings</div>
            </div>
            <div class="penalty-total">
                <div class="penalty-total-value">
                    {{ model.totalChampionshipPointDeduction }}
                </div>
                <div class="penalty-total-label">Champ. pts deducted</div>
            </div>
        </div>

        <table class="table table-dark table-sm mt-3">
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
                    <td>{{ formatDate(r.ruling_date) }}</td>
                    <td>{{ r.classification || '—' }}</td>
                    <td>{{ r.infraction || '—' }}</td>
                    <td>{{ joinedSanctions(r) || '—' }}</td>
                    <td class="text-end">{{ r.license_points || 0 }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.gh-content-card {
    border: 1px solid var(--gh-border-default);
    border-radius: var(--gh-radius-md);
    padding: 16px;
    margin-top: 8px;
}

.penalty-header {
    margin: 0 0 12px;
    font-weight: 600;
    color: var(--gh-text-muted, #8b949e);
}

.penalty-totals {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}

.penalty-total {
    background-color: var(--gh-canvas-subtle);
    border: 1px solid var(--gh-border-default);
    border-radius: var(--gh-radius-md);
    padding: 8px 16px;
    min-width: 120px;
}

.penalty-total-value {
    font-size: 1.5rem;
    font-weight: 600;
}

.penalty-total-label {
    font-size: 0.8rem;
    color: var(--gh-fg-muted);
}
</style>
