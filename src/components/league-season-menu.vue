<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, watchEffect, watch } from 'vue';
import type { Ref } from 'vue';
import type { LeagueSeasonMenuModel } from '@/models/league-season-menu-model';
import {
    getDefaultLeagueSeasonMenuModel,
    getLeagueSeasonMenuModel,
} from '@/models/league-season-menu-model';
import { useAuth } from 'vue-clerk';

const { isSignedIn } = useAuth();

const props = defineProps<{
    league: string;
    season: string;
    targetPage: string;
}>();


let leagueSeasonMenuModel: Ref<LeagueSeasonMenuModel> = ref(
    getDefaultLeagueSeasonMenuModel()
);

async function fetchModel() {
    leagueSeasonMenuModel.value = await getLeagueSeasonMenuModel(
        props.league,
        props.season,
        props.targetPage,
        isSignedIn.value === true
    );
}
watchEffect(fetchModel);
watch(props, fetchModel);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <form class="row row-cols-auto g-3 align-items-center">
                <div class="dropdown">
                    <button class="btn btn-dark dropdown-toggle" type="button" data-bs-toggle="dropdown"
                        aria-expanded="false">
                        {{ leagueSeasonMenuModel.leagueOptions.selected }}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li v-for="leagueOption in leagueSeasonMenuModel
                            .leagueOptions.options">
                            <RouterLink class="dropdown-item" type="button" v-bind:to="leagueOption.href">
                                {{ leagueOption.display }}
                            </RouterLink>
                        </li>
                    </ul>
                </div>
                <div class="dropdown">
                    <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown"
                        aria-expanded="false">
                        {{ leagueSeasonMenuModel.seasonOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li v-for="seasonOption in leagueSeasonMenuModel
                            .seasonOptions.options">
                            <RouterLink class="dropdown-item" type="button" v-bind:to="seasonOption.href">
                                {{ seasonOption.display }}
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    </div>
</template>
