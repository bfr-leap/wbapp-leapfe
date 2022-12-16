import {
    LapChartData,
    LeagueSeasons,
    LeagueSeasonSessions,
    LSS_Session,
    LS_SeasonSummary,
    SeasonSimsessionIndex,
    SimsessionResults,
    SSI_Session,
    SSI_Simsession,
    DriverStatsMap,
    DriverStats,
    M_Member,
    SSR_ResultsEntry,
    DriverResults,
} from '../src/iracing-endpoints';
import {
    getLapChartData,
    getLeagueSeasons,
    getLeagueSeasonSessions,
    getMembersData,
} from './iracing-scraped-data-loader.js';

import {
    calculateQualifyResults,
    calculateRaceResults,
} from './results-utils.js';

import { writeFileSync } from 'fs';

function wf(obj: any, name: string) {
    writeFileSync(`./dist/data/derived/${name}`, JSON.stringify(obj));
}

type LapChartDataVisitor = (
    leagueSeasons: LeagueSeasons,
    seasonInfo: LS_SeasonSummary,
    leaguSeasonSessions: LeagueSeasonSessions,
    sessionInfo: LSS_Session,
    lapChartData: LapChartData
) => void;
function acceptLapChartDataVisitor(
    leagueId: number,
    visitor: LapChartDataVisitor
) {
    let leagueSeasons = getLeagueSeasons(leagueId);

    for (let seasonInfo of leagueSeasons.seasons) {
        seasonInfo.season_id;

        try {
            let leaguSeasonSessions = getLeagueSeasonSessions(
                leagueId,
                seasonInfo.season_id
            );

            for (let sessionInfo of leaguSeasonSessions.sessions) {
                sessionInfo.subsession_id;
                let simSessionRetry = 8;

                for (let i = 0; i < simSessionRetry; ++i) {
                    try {
                        let lapChartData = getLapChartData(
                            sessionInfo.subsession_id,
                            -1 * i
                        );

                        visitor(
                            leagueSeasons,
                            seasonInfo,
                            leaguSeasonSessions,
                            sessionInfo,
                            lapChartData
                        );
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.log(
                `error fetching info for season [${seasonInfo.season_name}: ${seasonInfo.season_id}] continuing to next season`
            );
        }
    }
}

function getStats(map: DriverStatsMap, custId: number): DriverStats {
    let ret = map[custId];
    if (!ret) {
        ret = map[custId] = {
            cust_id: custId,
            started: 0,
            finished: 0,
            wins: 0,
            podiums: 0,
            top_10: 0,
            top_20: 0,
            fast_laps: 0,
            hard_charger: 0,
            poles: 0,
            power_points: 0,
            incidents: 0,
        };
    }

    return ret;
}

function getSeasonStatsMap(
    map: { [name: number]: DriverStatsMap },
    seasonId: number
): DriverStatsMap {
    let ret = map[seasonId];
    if (!ret) {
        ret = map[seasonId] = {};
    }
    return ret;
}

function deriveDriverStats(leagueId: number) {
    let carrerStatsMap: DriverStatsMap = {};
    let seasonStatsMapStore: { [name: number]: DriverStatsMap } = {};

    seasonStatsMapStore[0] = carrerStatsMap;

    acceptLapChartDataVisitor(
        leagueId,
        (
            leagueSeasons: LeagueSeasons,
            seasonInfo: LS_SeasonSummary,
            leaguSeasonSessions: LeagueSeasonSessions,
            sessionInfo: LSS_Session,
            lapChartData: LapChartData
        ) => {
            let r: SimsessionResults;
            let seasonStatsMap = getSeasonStatsMap(
                seasonStatsMapStore,
                seasonInfo.season_id
            );
            if (lapChartData.session_info.simsession_type === 6) {
                r = calculateRaceResults(lapChartData);

                for (let res of r.results) {
                    let cStats = getStats(carrerStatsMap, res.cust_id);
                    let sStats = getStats(seasonStatsMap, res.cust_id);

                    cStats.power_points += res.points;
                    sStats.power_points += res.points;

                    cStats.incidents += res.incidents;
                    sStats.incidents += res.incidents;

                    cStats.started += 1;
                    sStats.started += 1;

                    if (res.position === 1) {
                        cStats.wins += 1;
                        sStats.wins += 1;
                    }

                    if (res.position <= 3) {
                        cStats.podiums += 1;
                        sStats.podiums += 1;
                    }

                    if (res.position <= 10) {
                        cStats.top_10 += 1;
                        sStats.top_10 += 1;
                    }

                    if (res.position <= 20) {
                        cStats.top_20 += 1;
                        sStats.top_20 += 1;
                    }
                }
            } else if (lapChartData.session_info.simsession_type === 5) {
                r = calculateQualifyResults(lapChartData);
                let cStats = getStats(carrerStatsMap, r.results[0].cust_id);
                let sStats = getStats(seasonStatsMap, r.results[0].cust_id);
                cStats.poles += 1;
                sStats.poles += 1;

                for (let res of r.results) {
                    let cStats = getStats(carrerStatsMap, res.cust_id);
                    let sStats = getStats(seasonStatsMap, res.cust_id);

                    cStats.incidents += res.incidents;
                    sStats.incidents += res.incidents;
                }
            }
        }
    );

    wf(seasonStatsMapStore, `leagueDriverStats_${leagueId}.json`);
}

type ResultsByDriverStore = {
    [name: number]: DriverResults;
}; // driver -> season -> session -> result

function getDriverSeasonResults(
    custId: number,
    seasonId: number,
    resultsStore: ResultsByDriverStore
) {
    let driverStore = resultsStore[custId];
    if (!driverStore) {
        driverStore = resultsStore[custId] = {};
    }

    let seasonStore = driverStore[seasonId];
    if (!seasonStore) {
        seasonStore = driverStore[seasonId] = {};
    }

    return seasonStore;
}

function deriveLeagueSimSessionResults(leagueId: number) {
    let resultsStoreRace: ResultsByDriverStore = {}; // driver -> season -> session -> result
    let resultsStoreSprint: ResultsByDriverStore = {}; // driver -> season -> session -> result
    let resultsStoreQuali: ResultsByDriverStore = {}; // driver -> season -> session -> result

    acceptLapChartDataVisitor(
        leagueId,
        (
            leagueSeasons: LeagueSeasons,
            seasonInfo: LS_SeasonSummary,
            leaguSeasonSessions: LeagueSeasonSessions,
            sessionInfo: LSS_Session,
            lapChartData: LapChartData
        ) => {
            let r: SimsessionResults;
            let activeStore: ResultsByDriverStore | null;
            if (lapChartData.session_info.simsession_type === 6) {
                r = calculateRaceResults(lapChartData);

                if (r.results[0].laps_completed > 10) {
                    activeStore = resultsStoreRace;
                } else {
                    activeStore = resultsStoreSprint;
                }
            } else {
                r = calculateQualifyResults(lapChartData);
                if (lapChartData.session_info.simsession_type === 5) {
                    activeStore = resultsStoreQuali;
                }
            }

            for (let res of r.results) {
                if (activeStore) {
                    getDriverSeasonResults(
                        res.cust_id,
                        seasonInfo.season_id,
                        activeStore
                    )[sessionInfo.subsession_id] = res;
                }
            }

            wf(
                r,
                `simSessionResults_${lapChartData.session_info.subsession_id}_${lapChartData.session_info.simsession_number}.json`
            );
        }
    );

    let driverIds: string[] = Object.keys(resultsStoreRace);
    for (let custId of driverIds) {
        wf(
            resultsStoreRace[Number.parseInt(custId)],
            `driverSessionResults_race_${custId}.json`
        );
    }

    driverIds = Object.keys(resultsStoreSprint);
    for (let custId of driverIds) {
        wf(
            resultsStoreSprint[Number.parseInt(custId)],
            `driverSessionResults_sprint_${custId}.json`
        );
    }

    driverIds = Object.keys(resultsStoreQuali);
    for (let custId of driverIds) {
        wf(
            resultsStoreQuali[Number.parseInt(custId)],
            `driverSessionResults_quali_${custId}.json`
        );
    }
}

function deriveLeagueSimSessionIndex(leagueId: number) {
    let ls = getLeagueSeasons(leagueId);

    let indices: SeasonSimsessionIndex[] = [];

    for (let s of ls.seasons) {
        s.season_id;

        let index: SeasonSimsessionIndex = {
            season_id: s.season_id,
            season_title: s.season_name,
            sessions: [],
        };

        indices.push(index);

        try {
            let lss = getLeagueSeasonSessions(leagueId, s.season_id);

            for (let se of lss.sessions) {
                se.subsession_id;
                let simSessionRetry = 8;

                let session: SSI_Session = {
                    session_id: se.session_id,
                    subsession_id: se.subsession_id,
                    session_title: `${se.track.track_name} - ${se.cars[0].car_name}`,
                    simsessions: [],
                };
                index.sessions.push(session);

                for (let i = 0; i < simSessionRetry; ++i) {
                    try {
                        let cd = getLapChartData(se.subsession_id, -1 * i);
                        let simtype = cd.session_info.simsession_type;
                        let simsession: SSI_Simsession = {
                            simsession_id: -1 * i,
                            type:
                                simtype === 6
                                    ? 'race'
                                    : simtype === 5
                                    ? 'qualify'
                                    : 'practice',
                        };

                        if (simsession.type === 'race') {
                            let lapCount = cd.chunk_info
                                .map((c) => c.lap_number)
                                .reduce((p, c) => Math.max(p, c), 0);

                            if (lapCount < 10) {
                                simsession.type = 'sprint';
                            }
                        }

                        session.simsessions.push(simsession);
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.log(
                `error fetching info for season [${s.season_name}: ${s.season_id}]`
            );
        }
    }

    wf(indices, `leagueSimsessionIndex_${leagueId}.json`);
}

function deriveSingleMemberInfo(leagueId: number) {
    let leagueSeasons = getLeagueSeasons(leagueId);

    let mMap: { [name: number]: M_Member } = {};

    for (let season of leagueSeasons.seasons) {
        try {
            let membersData = getMembersData(leagueId, season.season_id);
            for (let member of membersData.members) {
                mMap[member.cust_id] = member;
            }
        } catch (e) {
            console.log(
                `can't find member data for: ${season.season_name} ...continuing`
            );
        }
    }

    let allCustIds = Object.keys(mMap);
    for (let custId of allCustIds) {
        wf(mMap[custId], `singleMemberData_${custId}.json`);
    }
}

deriveLeagueSimSessionIndex(6555);
deriveLeagueSimSessionResults(6555);
deriveDriverStats(6555);
deriveSingleMemberInfo(6555);
