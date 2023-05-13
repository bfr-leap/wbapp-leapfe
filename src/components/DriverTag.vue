<script setup lang="ts">
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
                <RouterLink
                    class="link-light"
                    v-if="leagueId && driverId"
                    v-bind:to="`?m=driver&league=${leagueId}&driver=${driverId}`"
                    ><span class="last-name"
                        >{{ props.lastName.toUpperCase() + ', ' }}
                    </span>
                    <span class="firt-name"
                        >{{ props.firstName + ' ' }}
                    </span></RouterLink
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
                <RouterLink
                    v-if="leagueId && teamId"
                    class="link-light text-decoration-none"
                    v-bind:to="`?m=team&league=${props.leagueId}&team=${props.teamId}`"
                    >{{ props.teamName }}</RouterLink
                ><span v-else>{{ props.teamName }}</span>
            </div>
        </span>
    </div>
</template>

<style scoped>
.license-pill-a {
    color: #fff !important;
    background-color: #0d6efd !important;
}

.license-pill-b {
    color: #fff !important;
    background-color: #13795b !important;
}

.license-pill-c {
    color: #fff !important;
    background-color: #664d03 !important;
}

.license-pill-d {
    color: #fff !important;
    background-color: #984c0c !important;
}

.license-pill-r {
    color: #fff !important;
    background-color: #dc3545 !important;
}

.license-pill-e {
    color: #fff !important;
    background-color: #dc3545 !important;
}
</style>
