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
                    class="license-chip"
                    v-bind:class="`license-chip--${props.licenseLevel.toLowerCase()}`"
                >
                    <span class="license-chip__rating">{{
                        props.iRating
                    }}</span>
                    <span class="license-chip__sep">·</span>
                    <span class="license-chip__class">{{
                        props.licenseLevel
                    }}</span>
                    <span class="license-chip__sr">{{
                        props.safetyRating
                    }}</span>
                </span>
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
.last-name,
.firt-name {
    color: var(--gh-header-text);
    font-weight: 600;
}

.license-chip {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-1);
    padding: 1px var(--space-2);
    margin-left: var(--space-1);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
    line-height: 1.5;
    white-space: nowrap;
}
.license-chip__rating {
    color: var(--text-primary);
}
.license-chip__sep {
    color: var(--text-muted);
}
.license-chip__class {
    color: var(--chip-class-color, var(--text-primary));
    font-weight: 700;
}
.license-chip__sr {
    color: var(--text-secondary);
}

.license-chip--a {
    --chip-class-color: var(--license-a);
}
.license-chip--b {
    --chip-class-color: var(--license-b);
}
.license-chip--c {
    --chip-class-color: var(--license-c);
}
.license-chip--d {
    --chip-class-color: var(--license-d);
}
.license-chip--r,
.license-chip--e {
    --chip-class-color: var(--license-r);
}
</style>
