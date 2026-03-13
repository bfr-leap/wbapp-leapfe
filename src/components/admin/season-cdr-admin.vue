<script setup lang="ts">
import { ref, reactive, watch, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { getBootstrapModal } from '@@/src/utils/bootstrap-utils';

import {
    getDefaultCdrAdminModel,
    getCdrAdminModel,
    createSchedEvent,
    updateSchedEvent,
    deleteSchedEvent,
} from '@@/src/models/admin/season-cdr-admin-model';
import type {
    CdrAdminEvent,
    CdrAdminModel,
} from '@@/src/models/admin/season-cdr-admin-model';

const props = defineProps<{
    league: string;
    season: string;
}>();

let forms = reactive({ time: '', track: '', defaultTrack: '' });

let cdrAdminModel: Ref<CdrAdminModel> = ref(getDefaultCdrAdminModel());

let isAdding: Ref<boolean> = ref(false);
let currentEvent: CdrAdminEvent | null = null;

async function fetchModel() {
    cdrAdminModel.value = await getCdrAdminModel(props.league, props.season);
}

async function onRemove(event: CdrAdminEvent) {
    cdrAdminModel.value = await deleteSchedEvent(
        cdrAdminModel.value,
        event.eventId
    );
}

function onEdit(event: CdrAdminEvent) {
    isAdding.value = false;
    forms.time = event.time.toString();
    forms.track = event.trackDisplayName;
    forms.defaultTrack = event.trackDisplayName;

    currentEvent = event;
}

function onAdd() {
    isAdding.value = true;

    forms.time = new Date(
        cdrAdminModel.value.events[
            cdrAdminModel.value.events.length - 1
        ].time.getTime() +
            1000 * 60 * 60 * 24 * 7
    ).toString();

    forms.track = '';
}

async function onSave() {
    var myModalEl = document.getElementById('cdrEditModal');
    var modal = getBootstrapModal(myModalEl);
    modal?.hide();

    const time = new Date(forms.time).getTime().toString();

    const tID =
        cdrAdminModel.value.tracks.find((t) => t.name === forms.track)?.id ||
        '';

    if (isAdding.value) {
        cdrAdminModel.value = await createSchedEvent(
            cdrAdminModel.value,
            props.season,
            time,
            tID.toString()
        );
    } else {
        cdrAdminModel.value = await updateSchedEvent(
            cdrAdminModel.value,
            currentEvent?.eventId || '',
            time,
            tID.toString()
        );
    }

    // updateSchedEvent(model: CdrAdminModel, event: string, time: string, track: string)
}

watchEffect(fetchModel);
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-2">
            <div class="container">
                <table class="table table-dark table-hover">
                    <thead style="position: sticky; top: 0">
                        <tr>
                            <th>❏</th>
                            <th>Time</th>
                            <th>Track</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr v-for="event in cdrAdminModel.events">
                            <td>
                                <button
                                    @click="onEdit(event)"
                                    type="button"
                                    class="btn btn-secondary"
                                    data-bs-toggle="modal"
                                    data-bs-target="#cdrEditModal"
                                >
                                    ✎
                                </button>
                            </td>
                            <td>{{ event.time }}</td>
                            <td>{{ event.trackDisplayName }}</td>
                            <td>
                                <button
                                    @click="onRemove(event)"
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
                                    data-bs-target="#cdrEditModal"
                                    @click="onAdd()"
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
        </div>
    </div>

    <!-- Modal -->
    <div
        class="modal fade"
        id="cdrEditModal"
        tabindex="-1"
        aria-labelledby="cdrEditModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog">
            <div class="bg-toplevel modal-content">
                <div class="modal-header">
                    <h5 class="modal-title text-bg" id="cdrEditModalLabel">
                        Event Details
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
                            <label
                                for="recipient-name"
                                class="col-form-label text-bg"
                                >Time:</label
                            >
                            <input
                                class="form-control"
                                list="datalistOptions"
                                id="exampleDataList"
                                placeholder="Type to search..."
                                v-model="forms.time"
                            />
                        </div>

                        <div class="mb-3">
                            <label
                                for="recipient-name"
                                class="col-form-label text-bg"
                                >Track:</label
                            >
                            <input
                                class="form-control"
                                list="trackOptions"
                                id="trackDataList"
                                placeholder="Type to search..."
                                v-model="forms.track"
                            />
                            <datalist id="trackOptions">
                                <option
                                    v-for="track in cdrAdminModel.tracks"
                                    v-bind:value="track.name"
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
                        v-bind:class="cdrAdminModel.tracks
                        .map((m) => m.name)
                        .indexOf(forms.track) > -1 && !isNaN(new Date(forms.time).getTime()) && 
                        forms.track !== forms.defaultTrack
                        ? 'btn btn-primary'
                        : 'btn btn-primary disabled'
                        "
                        @click="onSave()"
                    >
                        <span v-if="isAdding">Add Event</span>
                        <span v-if="!isAdding">Save Event</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.text-bg {
    color: var(--gh-fg-muted);
}
</style>
