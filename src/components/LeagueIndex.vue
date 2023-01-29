<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { SeasonSimsessionIndex } from '../iracing-endpoints';
import { getBlockedSeasons, getLeagueSimsessionIndex } from '@/fetch-util';

const props = defineProps<{
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
}>();

let seasons: Ref<SeasonSimsessionIndex[]> = ref([]);

let currentLeague: Ref<string> = ref('iFormula League');

let seasonOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '---',
    options: [{ display: '--', href: '#' }],
});

let subsessionOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '----',
    options: [{ display: '---', href: '#' }],
});

let simsessionOptions: Ref<{
    selected: string;
    options: { display: string; href: string }[];
}> = ref({
    selected: '-----',
    options: [{ display: '----', href: '#' }],
});

async function fectchJsonData() {
    let leagueId: string = props.leagueId;
    let seasonId: string = props.seasonId || '';
    let subsessionId: string = props.subsessionId || '';
    let simsessionId: string = props.simsessionId || '';

    let seasonSimsessionIndex: SeasonSimsessionIndex[];

    let blockedSeasons = await getBlockedSeasons();

    seasonSimsessionIndex = seasons.value = await getLeagueSimsessionIndex(
        leagueId
    );

    let selectedSeason = seasonSimsessionIndex.find(
        (s) => s.season_id.toString() === seasonId
    );

    let selectedSubsession = selectedSeason?.sessions.find(
        (s) => s.subsession_id.toString() === subsessionId
    );

    let selectedSimsession = selectedSubsession?.simsessions.find(
        (s) => s.simsession_id.toString() === simsessionId
    );

    seasonOptions.value.selected = selectedSeason?.season_title || '---';
    subsessionOptions.value.selected =
        selectedSubsession?.session_title || '---';
    simsessionOptions.value.selected = selectedSimsession?.type || '---';

    seasonOptions.value.options = [];
    subsessionOptions.value.options = [];
    simsessionOptions.value.options = [];

    if (!selectedSimsession || !selectedSubsession || !selectedSeason) {
        return;
    }

    for (let seasonIt of seasonSimsessionIndex) {
        if (
            !blockedSeasons[`${leagueId}_${seasonIt.season_id}`] &&
            seasonIt.sessions.length > 0
        ) {
            seasonOptions.value.options.push({
                display: seasonIt.season_title,
                href: `?m=results&league=${leagueId}&season=${seasonIt.season_id}&subsession=${seasonIt.sessions[0]?.subsession_id}&simsession=${seasonIt.sessions[0]?.simsessions[0]?.simsession_id}`,
            });
        }
    }

    for (let subsessionIt of selectedSeason.sessions) {
        subsessionOptions.value.options.push({
            display: subsessionIt.session_title,
            href: `?m=results&league=${leagueId}&season=${selectedSeason.season_id}&subsession=${subsessionIt.subsession_id}&simsession=${subsessionIt.simsessions[0]?.simsession_id}`,
        });
    }

    for (let simsessionIt of selectedSubsession.simsessions) {
        if (
            simsessionIt.type === 'race' ||
            simsessionIt.type === 'sprint' ||
            simsessionIt.type === 'qualify'
        )
            simsessionOptions.value.options.push({
                display: simsessionIt.type,
                href: `?m=results&league=${leagueId}&season=${selectedSeason.season_id}&subsession=${selectedSubsession.subsession_id}&simsession=${simsessionIt.simsession_id}`,
            });
    }
}
watchEffect(fectchJsonData);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <form class="row row-cols-auto g-3 align-items-center">
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

                <div class="dropdown">
                    <button
                        class="btn btn-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        {{ subsessionOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="subsessionOption in subsessionOptions.options"
                        >
                            <RouterLink
                                class="dropdown-item"
                                type="button"
                                v-bind:to="subsessionOption.href"
                            >
                                {{ subsessionOption.display }}
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
                        {{ simsessionOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="simsessionOption in simsessionOptions.options"
                        >
                            <RouterLink
                                class="dropdown-item"
                                type="button"
                                v-bind:to="simsessionOption.href"
                            >
                                {{ simsessionOption.display }}
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    </div>
</template>
