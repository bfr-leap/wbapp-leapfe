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
    <div v-if="table">
        <div class="table-responsive border border-secondary rounded m-1">
            <div class="d-flex justify-content-center">
                {{ table.title }}
            </div>
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
.table {
    border-radius: var(--gh-radius-md);
    width: 100%;
    padding-bottom: 1rem;
    margin-bottom: 0;
}

.table th:first-child,
.table td:first-child {
    position: sticky;
    left: 0;
    background-color: inherit;
}
</style>
