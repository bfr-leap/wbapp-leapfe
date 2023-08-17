import type { TS_RecordTable } from '../iracing-endpoints';
import { getSingleMemberData } from '@/fetch-util';

export type GenericTableModel = {
    columnNames: { [name: string]: string };
    nameToIdMap: { [name: string]: string };
} & TS_RecordTable;

export function getDefaultGenericTableModel(): GenericTableModel {
    return JSON.parse(
        JSON.stringify({
            title: '---',
            keys: [],
            rows: [],
            columnNames: {},
            nameToIdMap: {},
        })
    );
}

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

    name = <string>(<any>name).replaceAll('_', ' ');

    return name;
}

export async function getGenericTableModel(
    title: string,
    rows: { [name: string]: string }[]
): Promise<GenericTableModel> {
    let ret: GenericTableModel = getDefaultGenericTableModel();
    ret.title = title;
    if (rows[0]) {
        let keys = Object.keys(rows[0]);
        ret.rows = await formatRows(rows, keys);
        ret.keys = keys;

        for (let k of keys) {
            ret.columnNames[k] = formatHeader(k);
        }
    }

    ret.nameToIdMap = _nameToIdMap;

    return ret;
}
