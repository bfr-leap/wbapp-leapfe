<script setup lang="ts">
import type { Ref } from 'vue';
import { ref, watchEffect } from 'vue';
import type { DriverResults } from 'lplib/endpoint-types/iracing-endpoints';
import type { ResultsTableModel } from '@/models/event/results-table-model';
import { getResultsTableModel } from '@/models/event/results-table-model';
import RouterLinkProxy from '@/components/nav/router-link-proxy.vue';

const props = defineProps<{
    results: DriverResults;
    seasonId: number;
    leagueId: string;
}>();

const resultsTableModel: Ref<ResultsTableModel> = ref([]);

async function fetchModel() {
    if (!props) return;

    resultsTableModel.value = await getResultsTableModel(
        props.results,
        props.seasonId,
        props.leagueId
    );
}
watchEffect(fetchModel);
</script>

<template>
    <div class="table-responsive">
        <table
            v-if="resultsTableModel.length > 0"
            class="table table-dark table-hover"
        >
            <thead style="position: sticky; top: 0">
                <tr>
                    <th class="header" scope="col">session</th>
                    <th class="header" scope="col">position</th>
                    <th class="header" scope="col">points</th>
                    <th class="header" scope="col">start position</th>
                    <th class="header" scope="col">fast lap</th>
                    <th class="header" scope="col">fastest lap time</th>
                    <th class="header" scope="col">pace percent</th>
                    <th class="header" scope="col">incidents</th>
                    <th class="header" scope="col">laps completed</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="result in resultsTableModel">
                    <td v-if="result.sessionId > 0">
                        <RouterLinkProxy
                            class="link-light"
                            :to="`/?m=results&league=${props.leagueId}&season=${props.seasonId}&simsession=0&subsession=${result.sessionId}`"
                        >
                            {{ result.sessionName }}</RouterLinkProxy
                        >
                    </td>
                    <td v-else>
                        {{ result.sessionName }}
                    </td>
                    <td>{{ result.resultEntry.position }}</td>
                    <td>{{ result.resultEntry.points }}</td>
                    <td>{{ result.resultEntry.start_position }}</td>
                    <td>
                        {{
                            isNaN(result.resultEntry.fast_lap)
                                ? '--'
                                : result.resultEntry.fast_lap
                        }}
                    </td>
                    <td>
                        {{
                            isNaN(result.resultEntry.fastest_lap_time)
                                ? '--'
                                : `${
                                      Math.round(
                                          result.resultEntry.fastest_lap_time /
                                              100
                                      ) / 100
                                  }s`
                        }}
                    </td>
                    <td>
                        {{
                            null === result.resultEntry.pace_percent
                                ? '--'
                                : `${result.resultEntry.pace_percent}%`
                        }}
                    </td>
                    <td>{{ result.resultEntry.incidents }}</td>
                    <td>{{ result.resultEntry.laps_completed }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.table {
    /* background: #ee99a0; */
    border-radius: 0.2rem;
    width: 100%;
    padding-bottom: 1rem;
    /* color: #212529; */
    margin-bottom: 0;
}

.table th:first-child,
.table td:first-child {
    position: sticky;
    left: 0;
    /* background-color: #ad6c80;
    color: #373737; */
}
</style>
