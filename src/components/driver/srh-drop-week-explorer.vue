<script setup lang="ts">
/**
 * What the drop-week rules are hiding.
 *
 * The one thing the computed standings cannot show at all: which races
 * actually scored, which were discarded, and how much of a driver's total
 * has no race behind it yet.
 *
 * Renders the FULL calendar, not just the races run — an unrun round is the
 * honest way to show how far into the season we are, and it is where the
 * "season in progress" signal comes from (`is_provisional` is false on every
 * row in the dataset even mid-season, so it cannot be used).
 */
import { computed } from 'vue';
import type {
    DriverStandingsModel,
    DriverModel,
} from '@@/src/models/driver/driver-standings-model';
import {
    sessionKeyId,
    eventLabel,
} from '@@/src/models/driver/srh-standings-model';

const props = defineProps<{ view: DriverStandingsModel }>();

const srh = computed(() => props.view.srh!);

/** Calendar rounds, each with the race sessions it ran. */
const rounds = computed(() =>
    srh.value.schedule.map((event, i) => ({
        round: i + 1,
        label: eventLabel(event),
        subsessionId: event.subsession_id,
        races: (event.sessions || []).filter((s) => s.is_race),
    }))
);

type CellState = 'counted' | 'dropped' | 'absent' | 'unrun';

function cellState(
    driver: DriverModel,
    key: string,
    unrun: boolean
): CellState {
    if (unrun) return 'unrun';
    const srhd = driver.srh;
    if (!srhd) return 'absent';
    if (srhd.counted.some((k) => sessionKeyId(k) === key)) return 'counted';
    if (srhd.dropped.some((k) => sessionKeyId(k) === key)) return 'dropped';
    return 'absent';
}

const CELL_TITLE: Record<CellState, string> = {
    counted: 'Counted toward the championship',
    dropped: 'Dropped under the drop-week rules',
    absent: 'Did not start',
    unrun: 'Not yet run',
};

const ruleLabel = computed(() => {
    const { keepWeeks, dropWeeks } = srh.value;
    const parts: string[] = [];
    if (keepWeeks) parts.push(`best ${keepWeeks}`);
    if (dropWeeks)
        parts.push(`${dropWeeks} drop week${dropWeeks === 1 ? '' : 's'}`);
    return parts.join(' · ');
});
</script>

<template>
    <section v-if="srh.dropWeeks" class="section">
        <header class="section__head">
            <span class="section__title">Drop Weeks</span>
            <span class="rule-chip">{{ ruleLabel }}</span>
        </header>

        <p class="explainer">
            A dropped race still happened — it just doesn't count toward the
            championship total. Rounds
            {{ srh.progress.roundsRun + 1 }}–{{ srh.progress.roundsTotal }}
            have not been run yet.
        </p>

        <div class="grid-scroll">
            <table class="drop-grid">
                <thead>
                    <tr>
                        <th class="driver-col">Driver</th>
                        <th
                            v-for="r in rounds"
                            v-bind:key="r.round"
                            v-bind:title="r.label"
                            class="round-col"
                        >
                            {{ r.round }}
                        </th>
                        <th class="counted-col" title="Races counted">Cnt</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="d in view.drivers" v-bind:key="d.custId">
                        <th class="driver-col" scope="row">
                            <span class="pos num">{{ d.position }}</span>
                            {{ d.lastName }}
                        </th>

                        <template v-for="r in rounds" v-bind:key="r.round">
                            <td
                                v-if="r.subsessionId === null"
                                class="cell cell--unrun"
                                v-bind:title="CELL_TITLE.unrun"
                            >
                                <span class="dot"></span>
                            </td>
                            <td v-else class="cell">
                                <span
                                    v-for="race in r.races"
                                    v-bind:key="race.simsession_number"
                                    class="dot"
                                    v-bind:class="`dot--${cellState(
                                        d,
                                        sessionKeyId([
                                            r.subsessionId,
                                            race.simsession_number,
                                        ]),
                                        false
                                    )}`"
                                    v-bind:title="`${r.label} · ${
                                        race.session_type
                                    } — ${
                                        CELL_TITLE[
                                            cellState(
                                                d,
                                                sessionKeyId([
                                                    r.subsessionId,
                                                    race.simsession_number,
                                                ]),
                                                false
                                            )
                                        ]
                                    }`"
                                ></span>
                            </td>
                        </template>

                        <td class="counted-col num">
                            {{ d.srh?.racesCounted ?? '—'
                            }}<span
                                v-if="(d.srh?.unattributedStarts ?? 0) > 0"
                                class="unattributed"
                                v-bind:title="`${d.srh?.unattributedStarts} start(s) the league has scored but the lake has not resolved to a session — counted in the total, absent from this grid`"
                                >+{{ d.srh?.unattributedStarts }}?</span
                            >
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <ul class="legend">
            <li><span class="dot dot--counted"></span> counted</li>
            <li><span class="dot dot--dropped"></span> dropped</li>
            <li><span class="dot dot--absent"></span> did not start</li>
            <li><span class="dot dot--unrun"></span> not yet run</li>
        </ul>
    </section>
</template>

<style scoped>
.rule-chip {
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-secondary, #8b949e);
    border: 1px solid var(--border, #30363d);
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
}

.explainer {
    color: var(--text-secondary, #8b949e);
    font-size: 0.85rem;
    margin: 0 0 0.75rem;
}

/* Wide seasons scroll inside the section rather than the page. */
.grid-scroll {
    overflow-x: auto;
}

.drop-grid {
    border-collapse: collapse;
    font-size: 0.85rem;
    width: 100%;
}

.drop-grid th,
.drop-grid td {
    padding: 0.25rem 0.3rem;
    text-align: center;
    white-space: nowrap;
}

.driver-col {
    text-align: left;
    position: sticky;
    left: 0;
    background: var(--surface-1, #0d1117);
    z-index: 1;
    font-weight: 400;
}

.driver-col .pos {
    color: var(--text-secondary, #8b949e);
    margin-right: 0.4rem;
}

.round-col,
.counted-col {
    color: var(--text-secondary, #8b949e);
    font-weight: 400;
}

.cell {
    display: table-cell;
}

.dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin: 0 1px;
    background: transparent;
    border: 1px solid var(--border, #30363d);
}

.dot--counted {
    background: var(--success, #3fb950);
    border-color: var(--success, #3fb950);
}

/* Dimmed and hollow — the race happened, the points didn't count. */
.dot--dropped {
    background: transparent;
    border-color: var(--warning, #d29922);
    box-shadow: inset 0 0 0 1px rgba(210, 153, 34, 0.35);
}

.dot--absent {
    background: transparent;
    border-color: var(--border, #30363d);
    opacity: 0.4;
}

.dot--unrun {
    background: transparent;
    border-style: dashed;
    opacity: 0.35;
}

.unattributed {
    color: var(--warning, #d29922);
    margin-left: 0.15rem;
    cursor: help;
}

.legend {
    display: flex;
    gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0.6rem 0 0;
    font-size: 0.75rem;
    color: var(--text-secondary, #8b949e);
}

.legend li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}
</style>
