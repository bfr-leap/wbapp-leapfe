<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import { getLeagueSeasons, getBlockedSeasons } from '@/fetch-util';

const props = defineProps<{
    league: string;
    season: string;
    targetPage: string;
}>();

let currentLeague: Ref<string> = ref('League Name');

let seasonOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '---',
    options: [{ display: '--', href: '#' }],
});

async function fectchJsonData() {
    let blockedSeasons = await getBlockedSeasons();
    let leagueSeasons = await getLeagueSeasons(props.league);

    let currentSeason = leagueSeasons.seasons.find(
        (s) => s.season_id.toString() === props.season
    );

    seasonOptions.value.selected = currentSeason?.season_name || '---';
    currentLeague.value = 'iFormula League';

    seasonOptions.value.options = [];
    for (let season of leagueSeasons.seasons) {
        if (!blockedSeasons[`${props.league}_${season.season_id}`]) {
            seasonOptions.value.options.push({
                display: season.season_name,
                href: `${props.targetPage}?league=${props.league}&season=${season.season_id}`,
            });
        }
    }
}
watchEffect(fectchJsonData);
watch(props, fectchJsonData);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <form class="row row-cols-lg-auto g-3 align-items-center">
                <span>
                    {{ currentLeague }}
                </span>
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
