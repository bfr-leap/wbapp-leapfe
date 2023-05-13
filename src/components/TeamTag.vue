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
    driverId: string;
}

interface TeamView {
    name: string;
    sof: string;
    drivers: DriverView[];
}

let view: Ref<TeamView> = ref({
    name: '----',
    sof: '----',
    drivers: [
        { lastname: '----', driverId: '' },
        { lastname: '----', driverId: '' },
        { lastname: '----', driverId: '' },
    ],
});

async function sortDriverIdsByIRating(driverIds: string[]) {
    let driverIRatings: { [name: string]: number } = {};

    for (let driverId of driverIds) {
        let driver = await getSingleMemberData(driverId.toString());
        let raiting = getRoadLicense(driver.licenses).irating;
        driverIRatings[driverId] = raiting;
    }

    let sortedDriverIds = driverIds.sort((a, b) => {
        return driverIRatings[b] - driverIRatings[a];
    });

    return sortedDriverIds;
}

async function fetchData() {
    if (!props.leagueId) return;

    let teams = await getCuratedLeagueTeamsInfo(props.leagueId);

    let sortedSeasons = teams.seasons.sort((a, b) => {
        return b.season_id - a.season_id;
    });

    for (let season of sortedSeasons) {
        for (let team of season.teams) {
            if (team.team_id === props.teamId) {
                view.value = {
                    name: team.team_name,
                    sof: '',
                    drivers: [],
                };
                let driverIds = await sortDriverIdsByIRating(
                    team.team_members.map((v) => v.toString())
                );

                let cumulativeIRating = 0;

                for (let driverId of driverIds) {
                    let driver = await getSingleMemberData(driverId.toString());
                    let raiting = getRoadLicense(driver.licenses).irating;
                    cumulativeIRating += raiting;
                    view.value.drivers.push({
                        lastname: getFirstLastNames(driver.display_name)
                            .lastName,
                        driverId: driverId,
                    });
                }

                let averageRating = cumulativeIRating / driverIds.length;

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
                <span v-for="(driver, index) of view.drivers"
                    ><RouterLink
                        class="link-light text-decoration-none"
                        v-bind:to="`?m=driver&league=${leagueId}&driver=${driver.driverId}`"
                        >{{
                            driver.lastname +
                            (index < view.drivers.length - 1 ? ',  ' : '')
                        }}</RouterLink
                    ></span
                >
            </div>
        </span>
    </div>
</template>
