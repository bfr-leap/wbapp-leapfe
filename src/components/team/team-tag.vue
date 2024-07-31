<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { TeamTagModel } from '@/models/team/team-tag-model';
import {
    getTeamTagModel,
    getDefaultTeamTagModel,
} from '@/models/team/team-tag-model';
import RouterLinkProxy from '@/components/nav/router-link-proxy.vue';

const props = defineProps<{
    teamId: number;
    leagueId: string;
}>();

let teamTagModel: Ref<TeamTagModel> = ref(getDefaultTeamTagModel());

async function fetchModel() {
    teamTagModel.value = await getTeamTagModel(props.teamId, props.leagueId);
}

watchEffect(fetchModel);
</script>
<template>
    <div class="driver">
        <span style="display: inline-block">
            <div>
                <RouterLinkProxy
                    class="link-light"
                    v-if="leagueId && leagueId"
                    v-bind:to="`?m=team&league=${leagueId}&team=${teamId}`"
                    ><span class="last-name"
                        >{{ teamTagModel.name }}
                    </span></RouterLinkProxy
                >
                <template v-else>
                    <span class="last-name">{{ teamTagModel.name }} </span>
                </template>
                <span>{{ ' ' + teamTagModel.sof }}</span>
            </div>
            <div>
                <span v-for="(driver, index) of teamTagModel.drivers">
                    <RouterLinkProxy
                        class="link-light text-decoration-none"
                        v-bind:to="`?m=driver&league=${leagueId}&driver=${driver.driverId}`"
                        >{{
                            driver.lastname +
                            (index < teamTagModel.drivers.length - 1
                                ? ',  '
                                : '')
                        }}</RouterLinkProxy
                    >
                </span>
            </div>
        </span>
    </div>
</template>
