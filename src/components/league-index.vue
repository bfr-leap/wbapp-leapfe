<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { SeasonSimsessionIndex } from '../iracing-endpoints';
import {
    getCuratedBlockedSeasons,
    getLeagueSimsessionIndex,
    getCuratedActiveLeagueSchedule,
} from '@/fetch-util';
import type { LeagueIndexModel } from '@/models/league-index-model';
import { getLeagueIndexModel } from '@/models/league-index-model';
import { getDefaultLeagueIndexModel } from '@/models/league-index-model';

const props = defineProps<{
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
}>();

let leagueIndexModel: Ref<LeagueIndexModel> = ref(getDefaultLeagueIndexModel());

async function fetchModel() {
    leagueIndexModel.value = await getLeagueIndexModel(
        props.leagueId,
        props.seasonId || '',
        props.subsessionId || '',
        props.simsessionId || ''
    );
}

watchEffect(fetchModel);
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
                        {{ leagueIndexModel.leagueOptions.selected }}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li
                            v-for="leagueOption in leagueIndexModel
                                .leagueOptions.options"
                        >
                            <a
                                class="dropdown-item"
                                type="button"
                                v-bind:href="leagueOption.href"
                            >
                                {{ leagueOption.display }}
                            </a>
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
                        {{ leagueIndexModel.seasonOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="seasonOption in leagueIndexModel
                                .seasonOptions.options"
                        >
                            <a
                                class="dropdown-item"
                                type="button"
                                v-bind:href="seasonOption.href"
                            >
                                {{ seasonOption.display }}
                            </a>
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
                        {{ leagueIndexModel.subsessionOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="subsessionOption in leagueIndexModel
                                .subsessionOptions.options"
                        >
                            <a
                                class="dropdown-item"
                                type="button"
                                v-bind:href="subsessionOption.href"
                            >
                                {{ subsessionOption.display }}
                            </a>
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
                        {{ leagueIndexModel.simsessionOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="simsessionOption in leagueIndexModel
                                .simsessionOptions.options"
                        >
                            <a
                                class="dropdown-item"
                                type="button"
                                v-bind:href="simsessionOption.href"
                            >
                                {{ simsessionOption.display }}
                            </a>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    </div>
</template>
