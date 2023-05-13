import { getLeagueSimsessionIndex, getSimsessionResults } from './fetch-util';

export interface SessionStats {
    subsession_id: string;
    race_number_of_laps: number;
    race_incident_count: number;
    race_participants: number;
}

export async function getSessionStats(
    leagueId: string,
    seasonId: string,
    subsessionId: string,
    statyType: string = 'Overall'
): Promise<SessionStats> {
    let simsessionId = 0;

    let uidSet: { [name: string]: true } = {};

    let raceNumberOfLaps = 0;
    let raceIncidentCount = 0;

    let simsessionIds: number[] = [];

    let sessionTypes: string[] = [];
    if (['Overall', 'Race'].indexOf(statyType) >= 0) {
        sessionTypes.push('race');
    }
    if (['Overall', 'Sprint'].indexOf(statyType) >= 0) {
        sessionTypes.push('sprint');
    }

    for (let sessionType of sessionTypes) {
        simsessionIds = simsessionIds.concat(
            await getSimsessions(leagueId, seasonId, subsessionId, sessionType)
        );
    }

    for (let simsessionId of simsessionIds) {
        let results = await getSimsessionResults(
            subsessionId,
            simsessionId.toString()
        );

        for (let result of results.results) {
            uidSet[result.cust_id] = true;
            raceNumberOfLaps += result.laps_completed;
            raceIncidentCount += result.incidents;
        }
    }

    let r = {
        subsession_id: subsessionId,
        race_number_of_laps: raceNumberOfLaps,
        race_incident_count: raceIncidentCount,
        race_participants: Object.keys(uidSet).length,
    };

    return r;
}

export async function getSimsessions(
    leagueId: string,
    seasonId: string,
    subsessionId: string,
    filterType: string = ''
): Promise<number[]> {
    let seasonSimsessionIndex = await getLeagueSimsessionIndex(leagueId);

    let selectedSeason = seasonSimsessionIndex.find(
        (s) => s.season_id.toString() === seasonId
    );

    let selectedSubsession = selectedSeason?.sessions.find(
        (s) => s.subsession_id.toString() === subsessionId
    );

    let r: number[] = [];

    if (selectedSubsession) {
        if (filterType) {
            r = selectedSubsession.simsessions
                .filter((v) => v.type === filterType)
                .map((v) => v.simsession_id);
        } else {
            r = selectedSubsession.simsessions.map((v) => v.simsession_id);
        }
    }

    return r;
}
