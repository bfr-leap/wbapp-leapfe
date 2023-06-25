<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Ref } from 'vue';
import type { TS_RecordTable } from '../iracing-endpoints';
import { getSingleMemberData } from '@/fetch-util';

const props = defineProps<{
    title: string;
    leagueId: string;
    rows: { [name: string]: string }[];
}>();

let table: Ref<TS_RecordTable> = ref({
    title: '---',
    keys: [],
    rows: [],
});

const _nameToIdMap: { [name: string]: string } = {};

async function formatRows(
    rows: { [name: string]: string }[],
    keys: string[]
): Promise<{ [name: string]: string }[]> {
    let ret: { [name: string]: string }[] = JSON.parse(JSON.stringify(rows));

    for (let r of ret) {
        for (let k of keys) {
            switch (k) {
                case 'time':
                case 'fastest_lap': {
                    let v = Number.parseInt(r[k], 10);

                    if (isNaN(v)) {
                        r[k] = '';
                    } else {
                        let totalSec = v / 10000;
                        let min = Math.floor(Math.floor(totalSec) / 60);
                        let sec = totalSec - 60 * min;
                        r[k] = `${min}:${sec.toPrecision(5)}`;
                    }
                    break;
                }
                case 'date': {
                    let d = new Date(r[k]);
                    r[k] = `${d.toLocaleDateString()}`;
                    break;
                }
                case 'cust_id': {
                    let id = r[k];
                    let mData = await getSingleMemberData(id);
                    r[k] = mData?.display_name || id;

                    _nameToIdMap[r[k]] = id;
                    break;
                }
                default:
            }
        }
    }

    return ret;
}

function formatHeader(name: string): string {
    if ('cust_id' === name) {
        return 'driver';
    }

    name = name.replaceAll('_', ' ');

    return name;
}

async function fectchJsonData() {
    table.value.title = props.title;
    if (props.rows[0]) {
        let keys = Object.keys(props.rows[0]);
        table.value.rows = await formatRows(props.rows, keys);
        table.value.keys = keys;
    }
}
watchEffect(fectchJsonData);
</script>

<template>
    <div>
        <div class="table-responsive border border-secondary rounded m-1">
            <div class="d-flex justify-content-center">
                {{ table.title }}
            </div>
            <table class="table table-dark table-hover">
                <thead style="position: sticky; top: 0">
                    <tr>
                        <th v-for="header in table.keys">
                            {{ formatHeader(header) }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in table.rows">
                        <template v-for="key in table.keys">
                            <td v-if="key === 'cust_id'">
                                <RouterLink
                                    class="link-light"
                                    v-bind:to="`/?m=driver&league=${
                                        props.leagueId
                                    }&driver=${_nameToIdMap[row[key]]}`"
                                    >{{ row[key] }}</RouterLink
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

<style scoepd>
.table {
    /* background: #ee99a0; */
    border-radius: 0.2rem;
    width: 100%;
    padding-bottom: 1rem;
    /* color: #212529; */
    margin-bottom: 0;
}
.table th:first-child,
.table td:first-child {
    position: sticky;
    left: 0;
    /* background-color: #ad6c80;
    color: #373737; */
}
</style>
