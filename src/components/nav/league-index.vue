<script setup lang="ts">
import type { Ref } from 'vue';
import type { LeagueIndexModel } from '@@/src/models/nav/league-index-model';
import { getLeagueIndexModel } from '@@/src/models/nav/league-index-model';
import { getDefaultLeagueIndexModel } from '@@/src/models/nav/league-index-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const { isSignedIn } = useAuthState();

const props = defineProps<{
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
}>();

async function fetchModel() {
    return await getLeagueIndexModel(
        props.leagueId || '',
        props.seasonId || '',
        props.subsessionId || '',
        props.simsessionId || '',
        isSignedIn
    );
}

const leagueIndexModel: Ref<LeagueIndexModel> =
    await asyncDataWithReactiveModel<LeagueIndexModel>(
        `LeagueIndexModel-${[
            props.leagueId || '',
            props.seasonId || '',
            props.subsessionId || '',
            props.simsessionId || '',
            // isSignedIn,
        ]
            .map((v) => v.toString())
            .join('-')}`,
        fetchModel,
        getDefaultLeagueIndexModel,
        [
            () => props.leagueId,
            () => props.seasonId,
            () => props.subsessionId,
            () => props.simsessionId,
        ]
    );
</script>

<template>
    <div v-cloak class="gh-nav-bar">
        <div class="dropdown">
            <button
                class="btn btn-dark dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {{ leagueIndexModel.leagueOptions.selected }}
            </button>
            <ul class="dropdown-menu">
                <li
                    v-for="leagueOption in leagueIndexModel
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
                {{ leagueIndexModel.seasonOptions.selected }}
            </button>
            <ul class="dropdown-menu">
                <li
                    v-for="seasonOption in leagueIndexModel
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

        <div class="dropdown">
            <button
                class="btn btn-dark dropdown-toggle truncate-button"
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
                    <RouterLinkProxy
                        class="dropdown-item"
                        type="button"
                        v-bind:to="subsessionOption.href"
                    >
                        {{ subsessionOption.display }}
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
                {{ leagueIndexModel.simsessionOptions.selected }}
            </button>
            <ul class="dropdown-menu">
                <li
                    v-for="simsessionOption in leagueIndexModel
                        .simsessionOptions.options"
                >
                    <RouterLinkProxy
                        class="dropdown-item"
                        type="button"
                        v-bind:to="simsessionOption.href"
                    >
                        {{ simsessionOption.display }}
                    </RouterLinkProxy>
                </li>
            </ul>
        </div>
    </div>
</template>
<style scoped>
[v-cloak] {
    display: none;
}

.gh-nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    flex-wrap: wrap;
}

.truncate-button {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

@media (max-width: 767px) {
    .truncate-button {
        max-width: 250px;
    }
}

@media (max-width: 480px) {
    .truncate-button {
        max-width: 200px;
    }
}
</style>
