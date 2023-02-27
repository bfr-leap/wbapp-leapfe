<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';

interface TeamView {}

const props = defineProps<{
    league: string;
    team: string;
}>();

let view: Ref<TeamView> = ref({});

async function fetchData() {}

watchEffect(fetchData);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            {{ props.league + ' ' + props.team }}
        </div>
    </div>
</template>
