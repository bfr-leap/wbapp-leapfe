<script setup lang="ts">
import { ref, reactive, computed, watchEffect, nextTick } from 'vue';
import type { Ref } from 'vue';
import {
    getBootstrapModal,
    createBootstrapToast,
} from '@@/src/utils/bootstrap-utils';

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

let cdrAdminModel: Ref<CdrAdminModel> = ref(getDefaultCdrAdminModel());

let isAdding: Ref<boolean> = ref(false);
let isSaving: Ref<boolean> = ref(false);
let currentEvent: CdrAdminEvent | null = null;
let pendingDeleteEvent: Ref<CdrAdminEvent | null> = ref(null);

let forms = reactive({
    time: '',
    track: '',
    trackSearch: '',
    originalTime: '',
    originalTrack: '',
});

const toastRef = ref<HTMLElement | null>(null);
const toastMessage = ref('');
const toastIsError = ref(false);

// -- Track filtering --

const filteredTracks = computed(() => {
    const q = forms.trackSearch.toLowerCase();
    if (!q) return cdrAdminModel.value.tracks;
    return cdrAdminModel.value.tracks.filter((t) =>
        t.name.toLowerCase().includes(q)
    );
});

// -- Validation --

const canSave = computed(() => {
    const validTrack = cdrAdminModel.value.tracks.some(
        (t) => t.name === forms.track
    );
    const validTime = !isNaN(new Date(forms.time).getTime());
    const hasChanges =
        isAdding.value ||
        forms.time !== forms.originalTime ||
        forms.track !== forms.originalTrack;
    return validTrack && validTime && hasChanges;
});

// -- Date formatting --

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function toDatetimeLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}` +
        `-${pad(d.getDate())}T${pad(d.getHours())}` +
        `:${pad(d.getMinutes())}`
    );
}

// -- Toast --

function showToast(message: string, isError: boolean) {
    toastMessage.value = message;
    toastIsError.value = isError;
    nextTick(() => {
        const toast = createBootstrapToast(toastRef.value);
        toast?.show();
    });
}

// -- Actions --

async function fetchModel() {
    cdrAdminModel.value = await getCdrAdminModel(props.league, props.season);
}

function onEdit(event: CdrAdminEvent) {
    isAdding.value = false;
    currentEvent = event;

    const dtLocal = toDatetimeLocal(event.time);
    forms.time = dtLocal;
    forms.originalTime = dtLocal;
    forms.track = event.trackDisplayName;
    forms.originalTrack = event.trackDisplayName;
    forms.trackSearch = '';
}

function onAdd() {
    isAdding.value = true;
    currentEvent = null;

    const events = cdrAdminModel.value.events;
    console.log(
        '[CDR-ADMIN] onAdd events:',
        events.map((e) => ({
            eventId: e.eventId,
            time: e.time,
            timeMs: e.time?.getTime?.() ?? e.time,
            type: typeof e.time,
            isDate: e.time instanceof Date,
        }))
    );
    const maxReasonable = Date.now() + 1000 * 60 * 60 * 24 * 365;
    const reasonable = events.filter(
        (e) => e.time.getTime() <= maxReasonable
    );
    const lastTime =
        reasonable.length > 0
            ? reasonable[reasonable.length - 1].time.getTime()
            : Date.now();
    const nextTime = new Date(lastTime + 1000 * 60 * 60 * 24 * 7);
    console.log('[CDR-ADMIN] onAdd result:', {
        totalEvents: events.length,
        reasonableEvents: reasonable.length,
        lastTime,
        nextTime: nextTime.toISOString(),
        formsTime: toDatetimeLocal(nextTime),
    });

    forms.time = toDatetimeLocal(nextTime);
    forms.originalTime = '';
    forms.track = '';
    forms.originalTrack = '';
    forms.trackSearch = '';
}

function onSelectTrack(trackName: string) {
    forms.track = trackName;
    forms.trackSearch = '';
}

function confirmDelete(event: CdrAdminEvent) {
    pendingDeleteEvent.value = event;
}

async function onConfirmDelete() {
    if (!pendingDeleteEvent.value) return;

    const event = pendingDeleteEvent.value;
    const modal = getBootstrapModal(
        document.getElementById('cdrDeleteConfirmModal')
    );
    modal?.hide();
    pendingDeleteEvent.value = null;

    const before = cdrAdminModel.value.events.length;
    cdrAdminModel.value = await deleteSchedEvent(
        cdrAdminModel.value,
        event.eventId
    );
    const after = cdrAdminModel.value.events.length;

    if (after < before) {
        showToast('Event deleted.', false);
    } else {
        showToast('Failed to delete event.', true);
    }
}

async function onSave() {
    const editModal = getBootstrapModal(
        document.getElementById('cdrEditModal')
    );
    editModal?.hide();

    isSaving.value = true;
    const time = new Date(forms.time).getTime().toString();
    const tID =
        cdrAdminModel.value.tracks.find((t) => t.name === forms.track)?.id ||
        '';

    try {
        if (isAdding.value) {
            const before = cdrAdminModel.value.events.length;
            cdrAdminModel.value = await createSchedEvent(
                cdrAdminModel.value,
                props.season,
                time,
                tID.toString()
            );
            const after = cdrAdminModel.value.events.length;
            if (after > before) {
                showToast('Event created.', false);
            } else {
                showToast('Failed to create event.', true);
            }
        } else {
            const eventId = currentEvent?.eventId || '';
            const prevModel = JSON.stringify(cdrAdminModel.value.events);
            cdrAdminModel.value = await updateSchedEvent(
                cdrAdminModel.value,
                eventId,
                time,
                tID.toString()
            );
            const newModel = JSON.stringify(cdrAdminModel.value.events);
            if (newModel !== prevModel) {
                showToast('Event updated.', false);
            } else {
                showToast('Failed to update event.', true);
            }
        }
    } catch (e) {
        showToast('An unexpected error occurred.', true);
    } finally {
        isSaving.value = false;
    }
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
                            <th></th>
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
                                    class="btn btn-secondary btn-sm"
                                    data-bs-toggle="modal"
                                    data-bs-target="#cdrEditModal"
                                >
                                    Edit
                                </button>
                            </td>
                            <td>{{ formatDate(event.time) }}</td>
                            <td>{{ event.trackDisplayName }}</td>
                            <td>
                                <button
                                    @click="confirmDelete(event)"
                                    type="button"
                                    class="btn btn-outline-danger btn-sm"
                                    data-bs-toggle="modal"
                                    data-bs-target="#cdrDeleteConfirmModal"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <button
                                    type="button"
                                    class="btn btn-primary btn-sm"
                                    data-bs-toggle="modal"
                                    data-bs-target="#cdrEditModal"
                                    @click="onAdd()"
                                >
                                    Add Event
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

    <!-- Edit / Add Modal -->
    <div
        class="modal fade"
        id="cdrEditModal"
        tabindex="-1"
        aria-labelledby="cdrEditModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="cdrEditModalLabel">
                        {{ isAdding ? 'Add Event' : 'Edit Event' }}
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent>
                        <div class="mb-3">
                            <label for="eventTime" class="col-form-label"
                                >Date &amp; Time</label
                            >
                            <input
                                type="datetime-local"
                                class="form-control"
                                id="eventTime"
                                v-model="forms.time"
                            />
                        </div>

                        <div class="mb-3">
                            <label for="trackSearch" class="col-form-label"
                                >Track</label
                            >
                            <input
                                type="text"
                                class="form-control mb-2"
                                id="trackSearch"
                                placeholder="Search tracks..."
                                v-model="forms.trackSearch"
                            />
                            <div
                                v-if="forms.track"
                                class="mb-2"
                                style="
                                    font-size: 0.85rem;
                                    color: var(--gh-success-fg);
                                "
                            >
                                Selected: {{ forms.track }}
                            </div>
                            <div
                                class="list-group"
                                style="max-height: 200px; overflow-y: auto"
                            >
                                <button
                                    v-for="t in filteredTracks"
                                    :key="t.id"
                                    type="button"
                                    class="list-group-item list-group-item-action"
                                    :class="{
                                        active: forms.track === t.name,
                                    }"
                                    @click="onSelectTrack(t.name)"
                                    style="
                                        background-color: var(
                                            --gh-canvas-subtle
                                        );
                                        color: var(--gh-fg-default);
                                        border-color: var(--gh-border-muted);
                                        font-size: 0.85rem;
                                        padding: 6px 10px;
                                    "
                                >
                                    {{ t.name }}
                                </button>
                            </div>
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
                        class="btn btn-primary"
                        :disabled="!canSave || isSaving"
                        @click="onSave()"
                    >
                        <span
                            v-if="isSaving"
                            class="spinner-border spinner-border-sm me-1"
                        ></span>
                        {{ isAdding ? 'Add Event' : 'Save Changes' }}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
        class="modal fade"
        id="cdrDeleteConfirmModal"
        tabindex="-1"
        aria-labelledby="cdrDeleteConfirmLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="cdrDeleteConfirmLabel">
                        Confirm Delete
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body" v-if="pendingDeleteEvent">
                    Delete the event on
                    <strong>{{ formatDate(pendingDeleteEvent.time) }}</strong>
                    at
                    <strong>{{ pendingDeleteEvent.trackDisplayName }}</strong
                    >?
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
                        class="btn btn-danger"
                        @click="onConfirmDelete()"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <div
            ref="toastRef"
            class="toast"
            role="alert"
            :class="toastIsError ? 'border-danger' : 'border-success'"
            style="
                background-color: var(--gh-canvas-subtle);
                color: var(--gh-fg-default);
            "
        >
            <div class="toast-body">
                {{ toastMessage }}
            </div>
        </div>
    </div>
</template>
