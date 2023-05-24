<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import {
    getLeagueSeasons,
    getCuratedBlockedSeasons,
    getCuratedActiveLeagueSchedule,
} from '@/fetch-util';

const props = defineProps<{
    league: string;
    season: string;
    targetPage: string;
}>();

let leagueOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '---',
    options: [
        { display: '--', href: '#' },
        { display: '---', href: '#' },
    ],
});

let seasonOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '---',
    options: [{ display: '--', href: '#' }],
});

async function fectchJsonData() {
    let leagueSchedule = await getCuratedActiveLeagueSchedule();
    let blockedSeasons = await getCuratedBlockedSeasons();
    let leagueSeasons = await getLeagueSeasons(props.league);
    leagueSeasons.seasons.sort((a, b) => b.season_id - a.season_id);

    let pSeason = props.season;
    if (!pSeason) {
        pSeason = leagueSeasons.seasons[0].season_id.toString();
    }

    let currentSeason = leagueSeasons.seasons.find(
        (s) => s.season_id.toString() === pSeason
    );

    console.log('here');

    let minSeasonId = <number>(<unknown>blockedSeasons['min_season_id']) || 0;

    leagueSeasons.seasons.sort((a, b) => b.season_id - a.season_id);
    seasonOptions.value.selected = currentSeason?.season_name || '---';
    seasonOptions.value.options = [];
    for (let season of leagueSeasons.seasons) {
        if (
            !blockedSeasons[`${props.league}_${season.season_id}`] &&
            season.season_id > minSeasonId
        ) {
            seasonOptions.value.options.push({
                display: season.season_name,
                href: `?m=${props.targetPage}&league=${props.league}&season=${season.season_id}`,
            });
        }
    }

    leagueOptions.value.selected =
        leagueSchedule.leagues.find(
            (v) => v.league_id.toString() === props.league
        )?.name || '---';

    leagueOptions.value.options = [];
    for (let league of leagueSchedule.leagues) {
        leagueOptions.value.options.push({
            display: league.name,
            href: `?m=${props.targetPage}&league=${league.league_id}`,
        });
    }
}
watchEffect(fectchJsonData);
watch(props, fectchJsonData);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <form class="row row-cols-auto g-3 align-items-center">
                <div class="dropdown">
                    <button
                        class="btn btn-dark dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        {{ leagueOptions.selected }}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li v-for="leagueOption in leagueOptions.options">
                            <RouterLink
                                class="dropdown-item"
                                type="button"
                                v-bind:to="leagueOption.href"
                            >
                                {{ leagueOption.display }}
                            </RouterLink>
                        </li>
                    </ul>
                </div>
                <div class="dropdown">
                    <button
                        class="btn btn-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        {{ seasonOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li v-for="seasonOption in seasonOptions.options">
                            <RouterLink
                                class="dropdown-item"
                                type="button"
                                v-bind:to="seasonOption.href"
                            >
                                {{ seasonOption.display }}
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    </div>
</template>
