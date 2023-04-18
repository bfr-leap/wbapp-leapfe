<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getCuratedLeagueTeamsInfo, getSingleMemberData } from '@/fetch-util';
import { getFirstLastNames, getRoadLicense } from './driverUtils';

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
    name: '----',
    sof: '----',
    drivers: [{ lastname: '----' }, { lastname: '----' }, { lastname: '----' }],
});

async function fetchData() {
    // view.value.name = props.teamId + '';

    console.log(props);

    if (!props.leagueId) return;

    let teams = await getCuratedLeagueTeamsInfo(props.leagueId);
    let log = '';

    for (let season of teams.seasons) {
        for (let team of season.teams) {
            if (team.team_id === props.teamId) {
                view.value = {
                    name: team.team_name,
                    sof: '',
                    drivers: [],
                };
                let driverIds = team.team_members;

                let cumulativeIRating = 0;

                for (let driverId of driverIds) {
                    let driver = await getSingleMemberData(driverId.toString());
                    let raiting = getRoadLicense(driver.licenses).irating;
                    cumulativeIRating += raiting;
                    view.value.drivers.push({
                        lastname: getFirstLastNames(driver.display_name)
                            .lastName,
                    });

                    log += `${driver.display_name} ${raiting}\n`;
                }

                let averageRating = cumulativeIRating / driverIds.length;
                // console.log(log);
                // console.log(averageRating);
                // console.log('\n\n\n');

                view.value.sof =
                    Math.floor(averageRating / 1000).toFixed(0) +
                    '.' +
                    ((averageRating % 1000) / 100).toFixed(0) +
                    'k';

                return;
            }
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
                    v-bind:to="`?m=team&league=${leagueId}&team=${teamId}`"
                    ><span class="last-name">{{ view.name }} </span></RouterLink
                >
                <template v-else>
                    <span class="last-name">{{ view.name }} </span>
                </template>
                <span>{{ ' ' + view.sof }}</span>
            </div>
            <div>
                <span v-for="(driver, index) of view.drivers">{{
                    driver.lastname +
                    (index < view.drivers.length - 1 ? ',  ' : '')
                }}</span>
            </div>
        </span>
    </div>
</template>
