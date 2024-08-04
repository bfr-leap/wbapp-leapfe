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
            isSignedIn,
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
                        class="btn btn-secondary dropdown-toggle truncate-button"
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
            </form>
        </div>
    </div>
</template>
<style scoped>
.truncate-button {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

@media (min-width: 820px) and (max-width: 859px) {
    .truncate-button {
        max-width: 400px;
    }
}

@media (min-width: 801px) and (max-width: 819px) {
    .truncate-button {
        max-width: 390px;
    }
}

@media (min-width: 768px) and (max-width: 800px) {
    .truncate-button {
        max-width: 365px;
    }
}

@media (min-width: 694px) and (max-width: 767px) {
    .truncate-button {
        max-width: 290px;
    }
}

@media (min-width: 676px) and (max-width: 693px) {
    .truncate-button {
        max-width: 275px;
    }
}

@media (min-width: 652px) and (max-width: 675px) {
    .truncate-button {
        max-width: 248px;
    }
}

@media (min-width: 638px) and (max-width: 651px) {
    .truncate-button {
        max-width: 235px;
    }
}

@media (min-width: 600px) and (max-width: 637px) {
    .truncate-button {
        max-width: 200px;
    }
}

@media (min-width: 550px) and (max-width: 599px) {
    .truncate-button {
        max-width: 410px;
    }
}

@media (min-width: 430px) and (max-width: 549px) {
    .truncate-button {
        max-width: 280px;
    }
}

@media (min-width: 414px) and (max-width: 429px) {
    .truncate-button {
        max-width: 275px;
    }
}

@media (min-width: 390px) and (max-width: 413px) {
    .truncate-button {
        max-width: 250px;
    }
}

@media (min-width: 375px) and (max-width: 389px) {
    .truncate-button {
        max-width: 235px;
    }
}

@media (min-width: 1px) and (max-width: 374px) {
    .truncate-button {
        max-width: 200px;
    }
}
</style>
