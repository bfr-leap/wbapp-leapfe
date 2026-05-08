<script setup lang="ts">
import { ref, reactive, watchEffect } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import { getLeagueRoster, defLgSeasSubCtx } from '@@/src/utils/fetch-util';
import { setIrLinkDriver } from '@@/src/services/user-service';
import { getBootstrapModal } from '@@/src/utils/bootstrap-utils';

const emit = defineEmits<{ (e: 'linked'): void }>();
const route = useRoute();

interface RosterEntry {
    cust_id: number;
    display_name: string;
}

const roster: Ref<RosterEntry[]> = ref([]);
const forms = reactive({ name: '' });
const submitting = ref(false);

async function fetchRoster() {
    const ctx = await defLgSeasSubCtx(
        (route.query.league as string) || '',
        (route.query.season as string) || '',
        (route.query.subsession as string) || ''
    );
    const leagueId = ctx?.league_id;
    const league = leagueId ? String(leagueId) : '';
    if (!league) {
        roster.value = [];
        return;
    }
    const r = await getLeagueRoster(league);
    roster.value = (r?.roster || []).map((d) => ({
        cust_id: d.cust_id,
        display_name: d.display_name,
    }));
}

function findCustId(name: string): number | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const m = roster.value.find(
        (d) => d.display_name.toLowerCase() === trimmed.toLowerCase()
    );
    return m ? m.cust_id : null;
}

async function onSubmit() {
    const custId = findCustId(forms.name);
    if (!custId || submitting.value) return;
    submitting.value = true;
    try {
        await setIrLinkDriver(String(custId));
        const el = document.getElementById('irDriverFinderModal');
        getBootstrapModal(el)?.hide();
        forms.name = '';
        emit('linked');
    } finally {
        submitting.value = false;
    }
}

watchEffect(fetchRoster);
</script>

<template>
    <div
        class="modal fade"
        id="irDriverFinderModal"
        tabindex="-1"
        aria-labelledby="irDriverFinderModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog">
            <div class="bg-toplevel modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="irDriverFinderModalLabel">
                        Time to leap in — find yourself in the lineup
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body">
                    <p class="form-text mb-3">
                        Search the roster, pick your driver, and we'll wire you
                        up. No verification — just leap in.
                    </p>
                    <form @submit.prevent="onSubmit">
                        <div class="mb-3">
                            <label
                                for="irDriverFinderInput"
                                class="col-form-label"
                                >Your driver name</label
                            >
                            <input
                                class="form-control"
                                list="irDriverFinderOptions"
                                id="irDriverFinderInput"
                                placeholder="Type your name…"
                                autocomplete="off"
                                v-model="forms.name"
                            />
                            <datalist id="irDriverFinderOptions">
                                <option
                                    v-for="d in roster"
                                    :key="d.cust_id"
                                    :value="d.display_name"
                                ></option>
                            </datalist>
                        </div>
                        <p
                            v-if="roster.length === 0"
                            class="form-text text-warning"
                        >
                            No league roster loaded yet. Pick a league first,
                            then hop back here.
                        </p>
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
                        :class="
                            findCustId(forms.name) && !submitting
                                ? 'btn btn-primary'
                                : 'btn btn-primary disabled'
                        "
                        @click="onSubmit"
                    >
                        That's me
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
