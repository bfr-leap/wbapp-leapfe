<script setup lang="ts">
/**
 * TEMPORARY: broker-fixture capture page.
 *
 * Visit `/capture-broker` while signed in. The page makes one
 * `/api/fetch-document` request per known (namespace, type, query)
 * tuple, anonymizes each response client-side (so no PII leaves the
 * browser), and emits the resulting array as a JSON blob with a
 * "copy to clipboard" button. Paste the copied blob into the chat /
 * PR and the import script writes it to `tests/fixtures/broker/`.
 *
 * Anonymization runs in the browser using the same module the test
 * harness uses on the server — cust_ids get mapped to deterministic
 * synthetic numbers, names get replaced with `Driver N`, emails get
 * replaced with `user-N@example.test`. Same-document references stay
 * consistent (one cust_id always maps to the same synthetic).
 *
 * Remove this page once we have a stable fixture set checked in; it's
 * a development affordance, not a production feature. The
 * `noindex` meta + auth-only middleware keep search engines and
 * anonymous bots out in the interim.
 */

import { ref, onMounted } from 'vue';
import { anonymizeBrokerDoc } from '@@/src/utils/broker-fixture-anonymize';

useSeoMeta({ robots: 'noindex,nofollow' });
defineOgImage({
    component: 'Card',
    props: {
        eyebrow: 'LEAP · DEV',
        title: 'Broker fixture capture',
        subtitle: 'Internal tool — not for public consumption',
        body: { type: 'empty', message: '' },
    },
});

interface CaptureTuple {
    label: string;
    query: Record<string, string>;
}

// Hand-enumerated list of (namespace, type, query) tuples the audit
// + smoke suite touch. Add more as `LEAP_BROKER_FIXTURES` runs surface
// "missing fixture for ..." errors — `audit/output/<run>/missing-fixtures.json`
// lists exact query params for each gap, ready to paste in here.
const TUPLES: CaptureTuple[] = [
    // -------------------------------------------------------------
    // Default-context resolution. Three variants because routes can
    // arrive with no hints, league-only, or league + season + subsession.
    // -------------------------------------------------------------
    {
        label: 'defLgSeasSubCtx — empty hints',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'defLgSeasSubCtx',
            league: '',
            season: '',
            subsession: '',
        },
    },
    {
        label: 'defLgSeasSubCtx — league hint only',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'defLgSeasSubCtx',
            league: '4534',
            season: '',
            subsession: '',
        },
    },
    {
        label: 'defLgSeasSubCtx — league + season (home page)',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'defLgSeasSubCtx',
            league: '4534',
            season: '131502',
            subsession: '',
        },
    },
    {
        label: 'defLgSeasSubCtx — full smoke URL',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'defLgSeasSubCtx',
            league: '4534',
            season: '131502',
            subsession: '84522154',
        },
    },
    // -------------------------------------------------------------
    // Global / config-shaped lookups.
    // -------------------------------------------------------------
    {
        label: 'activeLeagueSchedule',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'activeLeagueSchedule',
        },
    },
    {
        label: 'trackDisplayInfo',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'trackDisplayInfo',
        },
    },
    {
        label: 'blockedSeasons',
        query: {
            namespace: 'ldata-irweb',
            type: 'blockedSeasons',
        },
    },
    // -------------------------------------------------------------
    // League- and season-scoped metadata.
    // -------------------------------------------------------------
    {
        label: 'leagueSeasons',
        query: {
            namespace: 'ldata-irweb',
            type: 'leagueSeasons',
            league: '4534',
        },
    },
    {
        label: 'leagueSeasonSessions — race schedule with tracks',
        query: {
            namespace: 'ldata-irweb',
            type: 'leagueSeasonSessions',
            league: '4534',
            season: '131502',
        },
    },
    {
        label: 'leagueRoster',
        query: {
            namespace: 'ldata-irweb',
            type: 'leagueRoster',
            league: '4534',
        },
    },
    {
        label: 'trackInfoDirectory',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'trackInfoDirectory',
            league: '4534',
        },
    },
    {
        label: 'leagueTeamsInfo',
        query: {
            namespace: 'ldata-usrcfg',
            type: 'leagueTeamsInfo',
            league: '4534',
        },
    },
    {
        label: 'telemetrySubsessions',
        query: {
            namespace: 'ldata-irrpy',
            type: 'telemetrySubsessions',
            league: '4534',
        },
    },
    // -------------------------------------------------------------
    // Results view — race results + per-driver lookups + chart data.
    // -------------------------------------------------------------
    {
        label: 'simSessionResults',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'simSessionResults',
            subsession: '84522154',
            simsession: '0',
        },
    },
    {
        label: 'simsessionSummary',
        query: {
            namespace: 'ldata-gentxt',
            type: 'simsessionSummary',
            subsession: '84522154',
            simsession: '0',
        },
    },
    {
        label: 'lapChartData',
        query: {
            namespace: 'ldata-irweb',
            type: 'lapChartData',
            subsession: '84522154',
            simsession: '0',
        },
    },
    {
        label: 'cumulativeDeltaChartData',
        query: {
            namespace: 'ldata-charts',
            type: 'cumulativeDeltaChartData',
            league: '4534',
            subsession: '84522154',
            simsession: '0',
        },
    },
    {
        label: 'startFinishChartData',
        query: {
            namespace: 'ldata-charts',
            type: 'startFinishChartData',
            league: '4534',
            subsession: '84522154',
            simsession: '0',
        },
    },
    {
        label: 'membersData',
        query: {
            namespace: 'ldata-irweb',
            type: 'membersData',
            league: '4534',
            season: '131502',
        },
    },
    {
        label: 'leagueSimsessionIndex',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'leagueSimsessionIndex',
            league: '4534',
        },
    },
    // -------------------------------------------------------------
    // Standings view.
    // -------------------------------------------------------------
    {
        label: 'leagueDriverStats',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'leagueDriverStats',
            league: '4534',
        },
    },
    // -------------------------------------------------------------
    // Rulings view.
    // -------------------------------------------------------------
    {
        label: 'getRulings',
        query: {
            namespace: 'ldata-stwdcfg',
            type: 'getRulings',
            league: '4534',
            season: '131502',
        },
    },
    // -------------------------------------------------------------
    // Driver profile — identity, dotd blurb, race/sprint/quali stats.
    // -------------------------------------------------------------
    {
        label: 'singleMemberData',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'singleMemberData',
            custId: '174470',
        },
    },
    {
        label: 'dotdProfile',
        query: {
            namespace: 'ldata-gentxt',
            type: 'dotdProfile',
            league: '4534',
            custId: '174470',
        },
    },
    {
        label: 'driverSessionResults — race',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'driverSessionResults',
            league: '4534',
            custId: '174470',
            sessionType: 'race',
        },
    },
    {
        label: 'driverSessionResults — sprint',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'driverSessionResults',
            league: '4534',
            custId: '174470',
            sessionType: 'sprint',
        },
    },
    {
        label: 'driverSessionResults — quali',
        query: {
            namespace: 'ldata-rsltsts',
            type: 'driverSessionResults',
            league: '4534',
            custId: '174470',
            sessionType: 'quali',
        },
    },
];

interface CaptureEntry {
    label: string;
    query: Record<string, string>;
    status: 'pending' | 'ok' | 'error';
    error?: string;
    doc?: unknown;
}

const entries = ref<CaptureEntry[]>(
    TUPLES.map((t) => ({ ...t, status: 'pending' }))
);
const totalCount = TUPLES.length;
const doneCount = computed(
    () => entries.value.filter((e) => e.status !== 'pending').length
);
const allDone = computed(() => doneCount.value === totalCount);
const blob = computed(() => {
    if (!allDone.value) return '';
    const payload = entries.value
        .filter((e) => e.status === 'ok')
        .map((e) => ({
            query: e.query,
            doc: anonymizeBrokerDoc(e.doc),
        }));
    return JSON.stringify(
        { recordedAt: new Date().toISOString(), entries: payload },
        null,
        2
    );
});

const copied = ref(false);

async function copyBlob() {
    if (!blob.value) return;
    try {
        await navigator.clipboard.writeText(blob.value);
        copied.value = true;
        setTimeout(() => (copied.value = false), 2000);
    } catch (e) {
        console.error('clipboard write failed', e);
    }
}

onMounted(async () => {
    // Run captures sequentially so a logged-in user's auth header
    // gets re-used cleanly across requests and we don't hammer the
    // broker in parallel.
    for (let i = 0; i < entries.value.length; i++) {
        const entry = entries.value[i];
        try {
            const res = await $fetch<{ doc: unknown }>('/api/fetch-document', {
                query: entry.query,
            });
            entry.doc = res?.doc ?? null;
            entry.status = 'ok';
        } catch (e) {
            entry.status = 'error';
            entry.error = e instanceof Error ? e.message : String(e);
        }
    }
});
</script>

<template>
    <div class="capture">
        <h1>Broker fixture capture</h1>
        <p class="warn">
            <strong>Internal dev tool.</strong> Captures the broker responses
            the SSR smoke tests need, anonymizes them in your browser, and lets
            you copy the resulting JSON. Sign in with the same account whose
            data the fixtures should reflect.
        </p>

        <h2>Status ({{ doneCount }} / {{ totalCount }})</h2>
        <ul>
            <li v-for="(e, i) in entries" :key="i">
                <span class="label">{{ e.label }}</span>
                <span class="status" :data-status="e.status">{{
                    e.status
                }}</span>
                <span v-if="e.error" class="err">— {{ e.error }}</span>
            </li>
        </ul>

        <template v-if="allDone">
            <button class="copy" @click="copyBlob" :disabled="!blob">
                {{ copied ? 'Copied ✓' : 'Copy JSON to clipboard' }}
            </button>
            <details>
                <summary>Preview</summary>
                <textarea readonly :value="blob" rows="20" />
            </details>
        </template>
    </div>
</template>

<style scoped>
.capture {
    max-width: 880px;
    margin: 2rem auto;
    padding: 0 1.5rem;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #e6edf3;
}
h1 {
    font-size: 1.75rem;
    margin-bottom: 1rem;
}
h2 {
    font-size: 1.1rem;
    margin: 1.5rem 0 0.5rem;
    color: #9aa6b2;
}
.warn {
    background: #2d1f00;
    border: 1px solid #5a4400;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    color: #f3d9a4;
}
ul {
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid #21262d;
    border-radius: 6px;
    overflow: hidden;
}
li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #21262d;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
}
li:first-child {
    border-top: none;
}
.label {
    flex: 1;
}
.status[data-status='pending'] {
    color: #6e7681;
}
.status[data-status='ok'] {
    color: #56d364;
}
.status[data-status='error'] {
    color: #f85149;
}
.err {
    color: #f85149;
    font-size: 0.75rem;
}
.copy {
    margin-top: 1rem;
    padding: 0.75rem 1.25rem;
    border: 1px solid #2f81f7;
    background: #0c2d6b;
    color: #e6edf3;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
}
.copy:hover {
    background: #1f6feb;
}
.copy:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
details {
    margin-top: 1rem;
}
summary {
    cursor: pointer;
    color: #9aa6b2;
}
textarea {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
    background: #0d1117;
    color: #e6edf3;
    border: 1px solid #21262d;
    border-radius: 6px;
}
</style>
