import type { TS_RecordTable, M_Member } from 'lplib/endpoint-types/iracing-endpoints';
import { getSingleMemberData, getMembersData } from '@/utils/fetch-util';

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
const _idToNameMap: { [name: string]: string } = {};

async function formatRows(
    rows: { [name: string]: string }[],
    keys: string[],
    leagueId: string,
    seasonId: string
): Promise<{ [name: string]: string }[]> {
    let ret: { [name: string]: string }[] = JSON.parse(JSON.stringify(rows));

    let collectedCustIds = [];
    let userPromises: Promise<M_Member>[] = [];

    try {
        // sometimes the league/season info us just not available
        let members = (await getMembersData(leagueId, seasonId)).members;
        for (let m of members) {
            _idToNameMap[m.cust_id] = m.display_name;
            _nameToIdMap[m.display_name] = m.cust_id;
        }
    } catch (e) { }

    // parallelize user info fetching
    for (let r of ret) {
        for (let k of keys) {
            switch (k) {
                case 'cust_id': {
                    let id = r[k];
                    if (!_idToNameMap[id]) {
                        collectedCustIds.push(id);
                        userPromises.push(getSingleMemberData(id));
                    }
                    break;
                }
                default:
            }
        }
    }

    let results = await Promise.all(userPromises);
    for (let user of results) {
        if (user) {
            _idToNameMap[user.cust_id] = user.display_name;
            _nameToIdMap[user.display_name] = user.cust_id;
        }
    }
    // parallelize user info fetching [end]

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
                        r[k] = `${min}:${sec < 10 ? '0' : ''}${sec.toPrecision(
                            sec < 10 ? (sec < 1 ? 3 : 4) : 5
                        )}`;
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
                    r[k] = _idToNameMap[id] || id;
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
    rows: { [name: string]: string }[],
    leagueId: string,
    seasonId: string
): Promise<GenericTableModel> {
    let ret: GenericTableModel = getDefaultGenericTableModel();
    ret.title = title;
    if (rows[0]) {
        let keys = Object.keys(rows[0]);
        ret.rows = await formatRows(rows, keys, leagueId, seasonId);
        ret.keys = keys;

        for (let k of keys) {
            ret.columnNames[k] = formatHeader(k);
        }
    }

    ret.nameToIdMap = _nameToIdMap;

    return ret;
}
