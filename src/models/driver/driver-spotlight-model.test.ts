import { describe, it, expect } from 'vitest';
import { pickProtagonist } from './driver-spotlight-model';
import type { DriverModel } from './driver-standings-model';

function makeDriver(custId: string, position: number): DriverModel {
    return {
        position,
        points: 100 - position,
        clubId: 1,
        lastName: `Last${position}`,
        firstName: `First${position}`,
        iRating: '2000',
        licenseLevel: 'A',
        safetyRating: '3.50',
        teamName: 'T',
        teamId: 1,
        showStats: false,
        custId,
        stats: {
            started: 0,
            poles: 0,
            wins: 0,
            podiums: 0,
            top10: 0,
            top20: 0,
        },
    };
}

describe('pickProtagonist', () => {
    const drivers = [
        makeDriver('100', 1),
        makeDriver('200', 2),
        makeDriver('300', 3),
    ];

    it('returns null when there are no drivers', () => {
        expect(pickProtagonist([], '200')).toBeNull();
    });

    it('picks the signed-in user when their custId matches', () => {
        expect(pickProtagonist(drivers, '200')?.custId).toBe('200');
    });

    it('falls back to the standings leader when irCustId is empty', () => {
        expect(pickProtagonist(drivers, '')?.custId).toBe('100');
    });

    it('falls back to the standings leader when the user is not in the field', () => {
        expect(pickProtagonist(drivers, '999')?.custId).toBe('100');
    });
});
