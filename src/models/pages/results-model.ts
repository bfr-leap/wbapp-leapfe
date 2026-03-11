import type {
    SeasonSimsessionIndex,
    SSI_Session,
    SSI_Simsession,
} from 'lplib/endpoint-types/iracing-endpoints';
import {
    getLeagueSimsessionIndex,
    getLeagueSeasonSessions,
    getSimsessionResults,
    getTelemetrySubsessionIds,
    getGeneratedSimsessionSummary,
} from '@@/src/utils/fetch-util';
import MarkdownIt from 'markdown-it';

export interface ResultsModel {
    hasTelemetry: boolean;
    leagueId: string;
    seasonId: string;
    subsessionId: string;
    simsessionId: string;
    simsessionType: 'race' | 'sprint' | 'qualify' | 'practice';
    trackId: string;
    results: {
        [name: string]: string;
    }[];
    summary: string[];
}

export function getDefaultResultsModel(): ResultsModel {
    return {
        hasTelemetry: false,
        leagueId: '',
        seasonId: '',
        subsessionId: '',
        simsessionId: '',
        simsessionType: 'practice',
        trackId: '',
        results: [],
        summary: [],
    };
}

export async function getResultsModel(
    leagueId: string,
    seasonId: string,
    subsessionId: string,
    simsessionId: string
): Promise<ResultsModel> {
    let ret: ResultsModel = getDefaultResultsModel();

    if (isNaN(Number.parseInt(seasonId))) {
        seasonId = '';
    }

    if (isNaN(Number.parseInt(subsessionId))) {
        subsessionId = '';
    }

    if (isNaN(Number.parseInt(simsessionId))) {
        simsessionId = '';
    }

    let seasonSimsessionIndex: SeasonSimsessionIndex[] | null =
        await getLeagueSimsessionIndex(leagueId);

    let selectedSeason = seasonSimsessionIndex?.find(
        (s) => s.season_id.toString() === seasonId
    );

    if (!selectedSeason) {
        // find the first seasson with sessions
        // ...and do the same for other props
        let seasonIndex: number = 0;
        for (let i = 0; i < (seasonSimsessionIndex?.length || 0); ++i) {
            if (seasonSimsessionIndex?.[i].sessions.length > 0) {
                seasonIndex = i;
                break;
            }
        }

        selectedSeason = seasonSimsessionIndex?.[seasonIndex] || '';

        seasonId = selectedSeason?.season_id?.toString() || '';
        subsessionId = '';
    }

    let selectedSubsession = selectedSeason?.sessions?.find(
        (s: SSI_Session) => s?.subsession_id?.toString() === subsessionId
    );

    let i = (selectedSeason?.sessions?.length || 0) - 1;

    while (
        (!selectedSubsession || selectedSubsession.simsessions.length == 0) &&
        i >= 0
    ) {
        selectedSubsession = selectedSeason?.sessions[i--];
        subsessionId = selectedSubsession?.subsession_id?.toString() || '';
        simsessionId = '';
    }

    let selectedSimsession = selectedSubsession?.simsessions.find(
        (s: SSI_Simsession) => s.simsession_id.toString() === simsessionId
    );

    if (!selectedSimsession) {
        selectedSimsession = selectedSubsession?.simsessions[0];
        simsessionId = selectedSimsession?.simsession_id?.toString() || '';
    }

    if (!selectedSimsession) {
        return ret;
    }

    ret.simsessionType = selectedSimsession.type;

    let leagueSeasonSessions = await getLeagueSeasonSessions(
        leagueId,
        seasonId
    );

    let simsessionSummary = await getGeneratedSimsessionSummary(
        selectedSubsession?.subsession_id || 0,
        selectedSimsession.simsession_id
    );

    if (simsessionSummary) {
        const md = new MarkdownIt();
        ret.summary = [md.render(simsessionSummary.text)];
    }

    let trackId: string = '-1';

    for (let s of leagueSeasonSessions?.sessions || []) {
        if (s.subsession_id.toString() === subsessionId) {
            trackId = s.track.track_id.toString();
            break;
        }
    }

    ret.leagueId = leagueId;
    ret.seasonId = seasonId;
    ret.simsessionId = simsessionId;
    ret.subsessionId = subsessionId;
    ret.trackId = trackId;

    let simsessionResults = await getSimsessionResults(
        subsessionId,
        simsessionId
    );

    ret.results = (simsessionResults?.results || []).map((row) => {
        let r: { [name: string]: string | number } = {
            pos: row.position,
            cust_id: row.cust_id,
            fastest_lap: row.fastest_lap_time,
            pace_percent:
                row.pace_percent || row.pace_percent === 0
                    ? row.pace_percent + '%'
                    : '',
            fast_lap: row.fast_lap,
            laps: row.laps_completed,
            inc: row.incidents,
        };

        if (
            selectedSimsession?.type === 'race' ||
            selectedSimsession?.type === 'sprint'
        ) {
            r['start'] = row.start_position;
            r['pts'] = row.points;
        }

        return r;
    });

    let telemetrySubsessionIds = await getTelemetrySubsessionIds(ret.leagueId);

    ret.hasTelemetry =
        -1 !==
        (telemetrySubsessionIds?.indexOf(parseInt(ret.subsessionId, 10)) || -1);

    return ret;
}
