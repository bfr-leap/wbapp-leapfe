<script setup lang="ts">
import type { Ref } from 'vue';
import type { LeagueSeasonMenuModel } from '@@/src/models/nav/league-season-menu-model';
import {
    getDefaultLeagueSeasonMenuModel,
    getLeagueSeasonMenuModel,
} from '@@/src/models/nav/league-season-menu-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    league: string;
    season: string;
    targetPage: string;
}>();

const { isSignedIn } = useAuthState();

async function fetchLeagueSeasonMenuModel() {
    return await getLeagueSeasonMenuModel(
        props.league,
        props.season,
        props.targetPage,
        isSignedIn
    );
}

const leagueSeasonMenuModel: Ref<LeagueSeasonMenuModel> =
    await asyncDataWithReactiveModel<LeagueSeasonMenuModel>(
        `LeagueSeasonMenuModel-${[
            props.league,
            props.season,
            props.targetPage,
            isSignedIn,
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchLeagueSeasonMenuModel,
        getDefaultLeagueSeasonMenuModel,
        [() => props.league, () => props.season, () => props.targetPage]
    );
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
                        {{ leagueSeasonMenuModel.leagueOptions.selected }}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li
                            v-for="leagueOption in leagueSeasonMenuModel
                                .leagueOptions.options"
                        >
                            <RouterLinkProxy
                                class="dropdown-item"
                                type="button"
                                v-bind:to="leagueOption.href"
                            >
                                {{ leagueOption.display }}
                            </RouterLinkProxy>
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
                        {{ leagueSeasonMenuModel.seasonOptions.selected }}
                    </button>
                    <ul class="dropdown-menu">
                        <li
                            v-for="seasonOption in leagueSeasonMenuModel
                                .seasonOptions.options"
                        >
                            <RouterLinkProxy
                                class="dropdown-item"
                                type="button"
                                v-bind:to="seasonOption.href"
                            >
                                {{ seasonOption.display }}
                            </RouterLinkProxy>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    </div>
</template>
