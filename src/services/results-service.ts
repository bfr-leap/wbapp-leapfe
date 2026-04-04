/**
 * Results & charts service — race results, driver stats, telemetry, and chart data.
 */

import { fetchCachedDocument } from '@@/src/utils/api-client';
import type {
    TrackStats,
    M_Member,
    SimsessionResults,
    DriverStatsMap,
    DriverResults,
    LapChartData,
    ST_DriverTelemetry,
    GeneratedSimsessionSummary,
    DotdProfile,
    ChartTable,
} from '@@/lplib/endpoint-types/iracing-endpoints';

// ---------------------------------------------------------------------------
// Driver / member data
// ---------------------------------------------------------------------------

export async function getSingleMemberData(
    custId: string
): Promise<M_Member | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'singleMemberData';
    return await fetchCachedDocument<M_Member>({ namespace, type, custId });
}

export async function getLeagueDriverStats(
    league: string
): Promise<{ [name: number]: DriverStatsMap } | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'leagueDriverStats';
    return await fetchCachedDocument<{ [name: number]: DriverStatsMap }>({
        namespace,
        type,
        league,
    });
}

export async function getDriverResults(
    league: string,
    custId: string,
    sessionType: 'race' | 'sprint' | 'quali'
): Promise<DriverResults | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'driverSessionResults';
    return await fetchCachedDocument<DriverResults>({
        namespace,
        type,
        league,
        custId,
        sessionType,
    });
}

// ---------------------------------------------------------------------------
// Session results
// ---------------------------------------------------------------------------

export async function getSimsessionResults(
    subsession: string,
    simsession: string
): Promise<SimsessionResults | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'simSessionResults';
    return await fetchCachedDocument<SimsessionResults>({
        namespace,
        type,
        subsession,
        simsession,
    });
}

export async function getTrackStats(
    league: string,
    car: string,
    track: string
): Promise<TrackStats | null> {
    const namespace = 'ldata-rsltsts';
    const type = 'trackResults';
    return await fetchCachedDocument<TrackStats>({
        namespace,
        type,
        league,
        car,
        track,
    });
}

export async function getLapChartData(
    subsession: string,
    simsession: string
): Promise<LapChartData | null> {
    const namespace = 'ldata-irweb';
    const type = 'lapChartData';
    return await fetchCachedDocument<LapChartData>({
        namespace,
        type,
        subsession,
        simsession,
    });
}

export async function getDotdProfile(
    league: string,
    custId: string
): Promise<DotdProfile | null> {
    const namespace = 'ldata-gentxt';
    const type = 'dotdProfile';
    const params = { namespace, type, league, custId };
    console.log('[dotdProfile] requesting', params);
    const result = await fetchCachedDocument<DotdProfile>(params);
    console.log('[dotdProfile] response', result);
    if (!result?.blurb?.trim()) {
        return null;
    }
    return result;
}

export async function getGeneratedSimsessionSummary(
    subsession: number,
    simsession: number
): Promise<GeneratedSimsessionSummary | null> {
    const namespace = 'ldata-gentxt';
    const type = 'simsessionSummary';
    return await fetchCachedDocument<GeneratedSimsessionSummary>({
        namespace,
        type,
        subsession,
        simsession,
    });
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export async function getTelemetrySubsessionIds(
    league: string
): Promise<number[] | null> {
    const namespace = 'ldata-irrpy';
    const type = 'telemetrySubsessions';
    return await fetchCachedDocument<number[]>({
        namespace,
        type,
        league,
    });
}

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

export async function getCumulativeDeltaBestLapChartData(
    league: string,
    subsession: string,
    simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'cumulativeDeltaBestLapChartData';
    return await fetchCachedDocument<ChartTable>({
        namespace,
        type,
        league,
        subsession,
        simsession,
    });
}

export async function getPacePercentVsIdealLapChartData(
    league: string,
    subsession: string,
    simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'pacePercentVsIdealLapChartData';
    return await fetchCachedDocument<ChartTable>({
        namespace,
        type,
        league,
        subsession,
        simsession,
    });
}

export async function getPacePercentChartData(
    league: string,
    subsession: string,
    simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'pacePercentChartData';
    return await fetchCachedDocument<ChartTable>({
        namespace,
        type,
        league,
        subsession,
        simsession,
    });
}

export async function getStartFinishChartData(
    league: string,
    subsession: string,
    simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'startFinishChartData';
    return await fetchCachedDocument<ChartTable>({
        namespace,
        type,
        league,
        subsession,
        simsession,
    });
}

export async function getCumulativeDeltaChartData(
    league: string,
    subsession: string,
    simsession: string
): Promise<ChartTable | null> {
    const namespace = 'ldata-charts';
    const type = 'cumulativeDeltaChartData';
    return await fetchCachedDocument<ChartTable>({
        namespace,
        type,
        league,
        subsession,
        simsession,
    });
}
