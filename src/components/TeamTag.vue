<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getCuratedLeagueTeamsInfo, getSingleMemberData } from '@/fetch-util';
import { getFirstLastNames } from './driverUtils';

const props = defineProps<{
    teamId: number;
    leagueId: string;
}>();
interface DriverView {
    lastname: string;
}

interface TeamView {
    name: string;
    sof: string;
    drivers: DriverView[];
}

let view: Ref<TeamView> = ref({
    name: 'default name',
    sof: '1.5k',
    drivers: [
        { lastname: 'Smith' },
        { lastname: 'Miller' },
        { lastname: 'Barry' },
    ],
});

async function fetchData() {
    if (!props.leagueId) return;

    let teams = await getCuratedLeagueTeamsInfo(props.leagueId);

    let driverIds = [];

    for (let season of teams.seasons) {
        for (let team of season.teams) {
            if (team.team_id === props.teamId) {
                view.value = {
                    name: team.team_name,
                    sof: '',
                    drivers: [],
                };
                driverIds = team.team_members;

                for (let driverId of driverIds) {
                    let driver = await getSingleMemberData(driverId.toString());
                    view.value.drivers.push({
                        lastname: getFirstLastNames(driver.display_name)
                            .lastName,
                    });
                }
            }

            return;
        }
    }
}
watchEffect(fetchData);
</script>
<template>
    <div class="driver">
        <span style="display: inline-block">
            <div>
                <RouterLink
                    class="link-light"
                    v-if="leagueId && leagueId"
                    v-bind:to="`?m=driver&league=${leagueId}&driver=${teamId}`"
                    ><span class="last-name">{{ view.name }} </span></RouterLink
                >
                <template v-else>
                    <span class="last-name">{{ view.name }} </span>
                </template>
                <span>{{ view.sof }}</span>
            </div>
            <div>
                <span v-for="driver of view.drivers">{{
                    driver.lastname + ' '
                }}</span>
            </div>
        </span>
    </div>
</template>
