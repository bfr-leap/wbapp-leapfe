<script setup lang="ts">
import { ref, reactive, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import type { Ref } from 'vue';
import { getLeagueCardSelectorModel } from '@/models/league-card-selector-model';


const route = useRoute();

let leagueSelection: Ref<any> = ref(
    [
        { isActive: true, name: 'iGP' },
        { isActive: false, name: 'iFL' },
        { isActive: true, name: 'J2iCS' },
        { isActive: false, name: 'LZ' },
    ]
);

function saveState() {
    console.log('save');
}

let _saveTimeout: any = 0;

function onClick(league: any) {
    league.isActive = !league.isActive;

    if (_saveTimeout) {
        clearTimeout(_saveTimeout);
    }
    _saveTimeout = setTimeout(saveState, 1000);
}

async function fectchModel() {
    await getLeagueCardSelectorModel();
}

watchEffect(fectchModel);
watch(route, fectchModel);

</script>
<template>
    <div v-for="league in  leagueSelection " class="col">
        <div class="wrap" @click="onClick(league)">
            <img class="bg" v-bind:src="`./tracks/123.jpg`" />
            <div class="hv content d-flex h-100">
                <div class="d-flex flex-column fs-6 justify-content-center mx-1 mx-sm-3">
                    <div class="" style="line-height: 1rem">
                        <span>{{ '' }}</span>
                    </div>

                    <template v-for="cName of [
        'd-flex d-sm-none justify-content-center fs-4',
        'd-none d-sm-flex d-md-none justify-content-center fs-2',
        'd-none d-sm-none d-md-flex justify-content-center fs-1']">
                        <div v-bind:class="cName" style="line-height: 1em">
                            <span>{{ league.isActive ? '✔️' : '❌' }}</span>
                        </div>
                    </template>
                </div>
                <template v-for="cName of [
        'fs-6 d-flex d-sm-none flex-grow-1 justify-content-center align-items-center',
        'fs-3 d-none d-sm-flex d-md-none flex-grow-1 justify-content-center align-items-center',
        'fs-2 d-none d-sm-none d-md-flex flex-grow-1 justify-content-center align-items-center']">
                    <div v-bind:class="cName">
                        {{ league.name }}
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
<style scoped>
.wrap {
    overflow: hidden;
    position: relative;
}

.bg {
    opacity: 0.3;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.content {
    position: relative;
}

.hv:hover {
    color: rgb(131, 164, 255);
}
</style>