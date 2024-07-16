<script setup lang="ts">
import { ref, reactive, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import type { Ref } from 'vue';
import {
    getDefaultLeagueCardSelectorModel,
    getLeagueCardSelectorModel,
    saveLeagueCardSelectorModel,
} from '@/models/league-card-selector-model';

const route = useRoute();

let forms = reactive({ newLeague: '' });

let leagueSelection: Ref<any> = ref(getDefaultLeagueCardSelectorModel());

async function saveState() {
    await saveLeagueCardSelectorModel(leagueSelection.value);
}

let _saveTimeout: any = 0;

function onClick(league: any) {
    league.isActive = !league.isActive;

    if (_saveTimeout) {
        clearTimeout(_saveTimeout);
    }
    _saveTimeout = setTimeout(saveState, 1000);
}

function onAddLeagueBtn() {
    let i = leagueSelection.value.map((m) => m.name).indexOf(forms.newLeague);
    if (i < 0) return;

    var myModalEl = document.getElementById('exampleModal');
    var modal = (<any>global).bootstrap.Modal.getInstance(myModalEl);
    modal.hide();
    forms.newLeague = '';

    let league = leagueSelection.value[i];
    league.isActive = false;
    onClick(league);
}

async function fectchModel() {
    leagueSelection.value = await getLeagueCardSelectorModel();
}

watchEffect(fectchModel);
watch(route, fectchModel);
</script>
<template>
    <div>
        <table class="table table-dark table-hover">
            <thead style="position: sticky; top: 0">
                <tr>
                    <th>❏</th>
                    <th>Name</th>
                    <th>League ID</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                <tr v-for="league in leagueSelection.filter((l) => l.isActive)">
                    <td>❏</td>
                    <td>{{ league.name }}</td>
                    <td>{{ league.leagueID }}</td>
                    <td>
                        <button
                            @click="onClick(league)"
                            type="button"
                            class="btn btn-secondary"
                        >
                            ❌
                        </button>
                    </td>
                </tr>

                <tr>
                    <td>
                        <button
                            type="button"
                            class="btn btn-primary"
                            data-bs-toggle="modal"
                            data-bs-target="#exampleModal"
                        >
                            ✚
                        </button>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Modal -->
    <div
        class="modal fade"
        id="exampleModal"
        tabindex="-1"
        aria-labelledby="exampleModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog">
            <div class="bg-toplevel modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLabel">
                        Modal title
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="mb-3">
                            <label for="recipient-name" class="col-form-label"
                                >Recipient:</label
                            >
                            <input
                                class="form-control"
                                list="datalistOptions"
                                id="exampleDataList"
                                placeholder="Type to search..."
                                v-model="forms.newLeague"
                            />
                            <datalist id="datalistOptions">
                                <option
                                    v-for="league in leagueSelection.filter(
                                        (l) => !l.isActive
                                    )"
                                    v-bind:value="league.name"
                                ></option>
                            </datalist>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-bs-dismiss="modal"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        v-bind:class="
                            leagueSelection
                                .map((m) => m.name)
                                .indexOf(forms.newLeague) > -1
                                ? 'btn btn-primary'
                                : 'btn btn-primary disabled'
                        "
                        @click="onAddLeagueBtn()"
                    >
                        Add League
                    </button>
                </div>
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
