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
            // isSignedIn,
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchLeagueSeasonMenuModel,
        getDefaultLeagueSeasonMenuModel,
        [() => props.league, () => props.season, () => props.targetPage]
    );
</script>

<template>
    <div class="gh-nav-bar">
        <div class="dropdown">
            <button
                class="btn btn-dark dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {{ leagueSeasonMenuModel.leagueOptions.selected }}
            </button>
            <ul class="dropdown-menu">
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
                class="btn btn-dark dropdown-toggle"
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
    </div>
</template>

<style scoped>
.gh-nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    flex-wrap: wrap;
}
</style>
