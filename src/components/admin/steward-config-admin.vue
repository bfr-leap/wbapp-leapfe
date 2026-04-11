<script setup lang="ts">
import { ref, computed, watchEffect, nextTick } from 'vue';
import type { Ref } from 'vue';
import { createBootstrapToast } from '@@/src/utils/bootstrap-utils';
import {
    getDefaultStewardConfigAdminModel,
    getStewardConfigAdminModel,
    saveStewardConfig,
} from '@@/src/models/steward/steward-config-admin-model';
import type { StewardConfigAdminModel } from '@@/src/models/steward/steward-config-admin-model';
import { clearCache } from '@@/src/utils/api-client';

const props = defineProps<{
    league: string;
}>();

const model: Ref<StewardConfigAdminModel> = ref(
    getDefaultStewardConfigAdminModel()
);
const channelInput = ref('');
const originalChannel = ref('');
const isSaving = ref(false);

const toastRef = ref<HTMLElement | null>(null);
const toastMessage = ref('');
const toastIsError = ref(false);

// Discord channel ids are numeric strings (snowflake ids).
const channelIdRegex = /^\d+$/;

const validInput = computed(() =>
    channelIdRegex.test(channelInput.value.trim())
);
const hasChanges = computed(
    () => channelInput.value.trim() !== originalChannel.value
);
const canSave = computed(() => validInput.value && hasChanges.value);

async function fetchModel() {
    if (!props.league) return;
    model.value = await getStewardConfigAdminModel(props.league);
    channelInput.value = model.value.raceControlChannelId;
    originalChannel.value = model.value.raceControlChannelId;
}

watchEffect(fetchModel);

function showToast(message: string, isError: boolean) {
    toastMessage.value = message;
    toastIsError.value = isError;
    nextTick(() => {
        const toast = createBootstrapToast(toastRef.value);
        toast?.show();
    });
}

async function onSave() {
    if (!canSave.value || isSaving.value) return;
    isSaving.value = true;
    try {
        const trimmed = channelInput.value.trim();
        const result = await saveStewardConfig(props.league, trimmed);
        if (result.ok) {
            originalChannel.value = trimmed;
            channelInput.value = trimmed;
            // Drop the cached steward-config so the next page that
            // reads it picks up the new value.
            clearCache();
            showToast(result.message, false);
        } else {
            showToast(result.message, true);
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unexpected error.';
        showToast(msg, true);
    } finally {
        isSaving.value = false;
    }
}
</script>

<template>
    <div class="card bg-dark text-light m-2">
        <div class="card-body p-3">
            <h5 class="mb-3">Steward Configuration</h5>
            <p class="text-muted small">
                The Discord channel where stewards post penalty announcements
                for this league.
            </p>

            <div class="mb-3">
                <label for="raceControlChannelId" class="form-label">
                    Race-control Discord channel id
                </label>
                <input
                    id="raceControlChannelId"
                    type="text"
                    class="form-control"
                    placeholder="e.g. 1234567890123456789"
                    v-model="channelInput"
                    inputmode="numeric"
                    autocomplete="off"
                />
                <div
                    v-if="channelInput && !validInput"
                    class="form-text text-danger"
                >
                    Discord channel ids must be numeric.
                </div>
                <div v-else-if="!model.loaded" class="form-text text-muted">
                    Loading current value...
                </div>
            </div>

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
                Save
            </button>
        </div>
    </div>

    <!-- Toast -->
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
