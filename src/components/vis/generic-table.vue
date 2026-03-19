<script setup lang="ts">
import { type Ref, toRaw } from 'vue';
import type { GenericTableModel } from '@@/src/models/vis/generic-table-model';
import {
    getDefaultGenericTableModel,
    getGenericTableModel,
} from '@@/src/models/vis/generic-table-model';
import RouterLinkProxy from '@@/src/components/nav/router-link-proxy.vue';
import { MurmurHashV2 } from '@@/src/utils/hash-util';

const props = defineProps<{
    title: string;
    leagueId: string;
    seasonId: string;
    rows: { [name: string]: string }[];
}>();

async function fetchModel() {
    return await getGenericTableModel(
        props.title,
        toRaw(props.rows),
        props.leagueId,
        props.seasonId
    );
}

const table: Ref<GenericTableModel> =
    await asyncDataWithReactiveModel<GenericTableModel>(
        `GenericTableModel-${[
            props.title,
            MurmurHashV2(JSON.stringify(props.rows), 123),
            props.leagueId,
            props.seasonId,
        ].join('-')}`,
        fetchModel,
        getDefaultGenericTableModel,
        [
            () => props.title,
            () => props.rows,
            () => props.leagueId,
            () => props.seasonId,
        ]
    );
</script>

<template>
    <div v-if="table" class="gh-table-wrap">
        <div class="gh-table-title">{{ table.title }}</div>
        <div class="table-responsive">
            <table class="table table-dark table-hover">
                <thead style="position: sticky; top: 0">
                    <tr>
                        <th v-for="header in table.keys">
                            {{ table.columnNames[header] }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in table.rows">
                        <template v-for="key in table.keys">
                            <td v-if="key === 'cust_id'">
                                <RouterLinkProxy
                                    class="link-light"
                                    v-bind:to="`/?m=driver&league=${
                                        props.leagueId
                                    }&driver=${table.nameToIdMap[row[key]]}`"
                                    >{{ row[key] }}</RouterLinkProxy
                                >
                            </td>
                            <td v-else>{{ row[key] }}</td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.gh-table-wrap {
    margin: 4px;
    flex: 1;
    min-width: 200px;
}

.gh-table-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gh-fg-default);
    padding: 8px 12px 4px;
}

.table {
    width: 100%;
    margin-bottom: 0;
}

.table th:first-child,
.table td:first-child {
    position: sticky;
    left: 0;
    background-color: inherit;
}

@media (max-width: 576px) {
    .gh-table-title {
        font-size: 0.75rem;
        padding: 6px 8px 2px;
    }

    .table {
        font-size: 0.75rem;
    }

    .table th,
    .table td {
        padding: 0.25rem 0.4rem;
    }
}
</style>
