<script setup lang="ts">
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';

const props = defineProps<{
    clubId: number;
    lastName: string;
    firstName: string;
    iRating: string;
    licenseLevel: string;
    safetyRating: string;
    teamName: string;
    driverId?: string;
    leagueId?: string;
    teamId?: string;
}>();
</script>

<template>
    <div class="driver">
        <span style="display: inline-block">
            <div>
                <RouterLinkProxy
                    class="link-light"
                    v-if="leagueId && driverId"
                    v-bind:to="`?m=driver&league=${leagueId}&driver=${driverId}`"
                    ><span class="last-name"
                        >{{ props.lastName.toUpperCase() + ', ' }}
                    </span>
                    <span class="firt-name"
                        >{{ props.firstName + ' ' }}
                    </span></RouterLinkProxy
                >
                <template v-else>
                    <span class="last-name"
                        >{{ props.lastName.toUpperCase() + ', ' }}
                    </span>
                    <span class="firt-name">{{ props.firstName + ' ' }} </span>
                </template>
                <span
                    v-bind:class="`badge rounded-pill license-pill-${props.licenseLevel.toLowerCase()}`"
                    >{{ props.iRating }} | {{ props.licenseLevel }}
                    {{ props.safetyRating }}</span
                >
            </div>
            <div>
                <RouterLinkProxy
                    v-if="leagueId && teamId"
                    class="link-light text-decoration-none"
                    v-bind:to="`?m=team&league=${props.leagueId}&team=${props.teamId}`"
                    >{{ props.teamName }}</RouterLinkProxy
                ><span v-else>{{ props.teamName }}</span>
            </div>
        </span>
    </div>
</template>

<style scoped>
.license-pill-a {
    color: var(--gh-label-blue-text) !important;
    background-color: var(--gh-label-blue-bg) !important;
    border: 1px solid rgba(56, 139, 253, 0.3);
}

.license-pill-b {
    color: var(--gh-label-green-text) !important;
    background-color: var(--gh-label-green-bg) !important;
    border: 1px solid rgba(46, 160, 67, 0.3);
}

.license-pill-c {
    color: var(--gh-label-yellow-text) !important;
    background-color: var(--gh-label-yellow-bg) !important;
    border: 1px solid rgba(187, 128, 9, 0.3);
}

.license-pill-d {
    color: var(--gh-label-orange-text) !important;
    background-color: var(--gh-label-orange-bg) !important;
    border: 1px solid rgba(219, 109, 40, 0.3);
}

.license-pill-r {
    color: var(--gh-label-red-text) !important;
    background-color: var(--gh-label-red-bg) !important;
    border: 1px solid rgba(248, 81, 73, 0.3);
}

.license-pill-e {
    color: var(--gh-label-red-text) !important;
    background-color: var(--gh-label-red-bg) !important;
    border: 1px solid rgba(248, 81, 73, 0.3);
}
</style>
