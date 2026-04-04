import { describe, it, expect, vi } from 'vitest';
import {
    getPaceChartModel,
    getDefaultPaceChartModel,
} from './pace-chart-model';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@@/src/utils/fetch-util', () => ({
    getTelemetrySubsessionIds: vi.fn(),
    getPacePercentChartData: vi.fn(),
    getPacePercentVsIdealLapChartData: vi.fn(),
}));

import {
    getTelemetrySubsessionIds,
    getPacePercentChartData,
    getPacePercentVsIdealLapChartData,
} from '@@/src/utils/fetch-util';

const mockGetTelemetrySubsessionIds = vi.mocked(getTelemetrySubsessionIds);
const mockGetPacePercentChartData = vi.mocked(getPacePercentChartData);
const mockGetPacePercentVsIdealLapChartData = vi.mocked(
    getPacePercentVsIdealLapChartData
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getDefaultPaceChartModel', () => {
    it('returns a model with default placeholder data', () => {
        const model = getDefaultPaceChartModel();
        expect(model.title).toBe('Pace Percent');
        expect(model.barChartData).toHaveLength(2);
    });
});

describe('getPaceChartModel', () => {
    it('returns empty barChartData when subsession is undefined', async () => {
        const model = await getPaceChartModel(undefined as any, '0', '4534');
        expect(model.barChartData).toEqual([]);
    });

    it('returns empty barChartData when simsession is undefined', async () => {
        const model = await getPaceChartModel(
            '83688838',
            undefined as any,
            '4534'
        );
        expect(model.barChartData).toEqual([]);
    });

    it('returns empty barChartData when league is undefined', async () => {
        const model = await getPaceChartModel(
            '83688838',
            '0',
            undefined as any
        );
        expect(model.barChartData).toEqual([]);
    });

    it('uses pace percent data when telemetry is not available', async () => {
        mockGetTelemetrySubsessionIds.mockResolvedValue([99999]);
        mockGetPacePercentChartData.mockResolvedValue([
            { name: 'Driver A', pace: 100.5 },
            { name: 'Driver B', pace: 101.2 },
        ]);

        const model = await getPaceChartModel('83688838', '0', '4534');

        expect(mockGetPacePercentChartData).toHaveBeenCalledWith(
            '4534',
            '83688838',
            '0'
        );
        expect(model.barChartData).toEqual([
            { name: 'Driver A', value: 100.5 },
            { name: 'Driver B', value: 101.2 },
        ]);
    });

    it('uses pace vs ideal lap data when telemetry is available', async () => {
        mockGetTelemetrySubsessionIds.mockResolvedValue([83688838]);
        mockGetPacePercentVsIdealLapChartData.mockResolvedValue([
            { name: 'Driver A', pace: 100.5, ideal: 99.8 },
            { name: 'Driver B', pace: 101.2, ideal: 100.1 },
        ]);

        const model = await getPaceChartModel('83688838', '0', '4534');

        expect(mockGetPacePercentVsIdealLapChartData).toHaveBeenCalledWith(
            '4534',
            '83688838',
            '0'
        );
        expect(model.barChartData).toEqual([
            { name: 'Driver A', value: 100.5, value2: 99.8 },
            { name: 'Driver B', value: 101.2, value2: 100.1 },
        ]);
    });

    it('returns empty barChartData when API returns null', async () => {
        mockGetTelemetrySubsessionIds.mockResolvedValue([99999]);
        mockGetPacePercentChartData.mockResolvedValue(null as any);

        const model = await getPaceChartModel('83688838', '0', '4534');

        expect(model.barChartData).toEqual([]);
    });

    it('always has title "Pace Percent"', async () => {
        mockGetTelemetrySubsessionIds.mockResolvedValue([]);
        mockGetPacePercentChartData.mockResolvedValue([]);

        const model = await getPaceChartModel('83688838', '0', '4534');
        expect(model.title).toBe('Pace Percent');
    });
});
