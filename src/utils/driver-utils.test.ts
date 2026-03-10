import { describe, it, expect } from 'vitest';
import {
    getFirstLastNames,
    getFormulaLicense,
    getMemberViewFromM_Member,
} from './driver-utils';
import type {
    M_License,
    M_Member,
    CLTI_Team,
} from 'lplib/endpoint-types/iracing-endpoints';

describe('getFirstLastNames', () => {
    it('splits a simple two-word name', () => {
        const result = getFirstLastNames('John Smith');
        expect(result).toEqual({ firstName: 'John', lastName: 'Smith' });
    });

    it('handles names with multiple parts', () => {
        const result = getFirstLastNames('Jean Pierre Montoya');
        expect(result).toEqual({
            firstName: 'Jean Pierre',
            lastName: 'Montoya',
        });
    });

    it('handles a single-word name', () => {
        const result = getFirstLastNames('Senna');
        expect(result).toEqual({ firstName: '', lastName: 'Senna' });
    });
});

describe('getFormulaLicense', () => {
    function makeLicense(
        category: string,
        irating: number
    ): M_License {
        return {
            category,
            irating,
            group_name: 'Class A',
            safety_rating: 3.5,
        } as M_License;
    }

    it('returns the formula_car license when present', () => {
        const licenses = [
            makeLicense('sports_car', 2000),
            makeLicense('formula_car', 3500),
            makeLicense('oval', 1500),
        ];
        const result = getFormulaLicense(licenses);
        expect(result.category).toBe('formula_car');
        expect(result.irating).toBe(3500);
    });

    it('falls back to first license when no formula_car found', () => {
        const licenses = [
            makeLicense('sports_car', 2000),
            makeLicense('oval', 1500),
        ];
        const result = getFormulaLicense(licenses);
        expect(result.category).toBe('sports_car');
    });
});

describe('getMemberViewFromM_Member', () => {
    const teamInfoMap: { [name: number]: CLTI_Team } = {
        42: { team_id: 42, team_name: 'Red Bull Racing' } as CLTI_Team,
    };

    it('returns empty defaults when member is null', () => {
        const result = getMemberViewFromM_Member(null, {}, {});
        expect(result.firstName).toBe('');
        expect(result.lastName).toBe('');
        expect(result.clubId).toBe(-1);
    });

    it('transforms a member with team info', () => {
        const member = {
            cust_id: 123,
            display_name: 'Max Verstappen',
            club_id: 5,
            licenses: [
                {
                    category: 'formula_car',
                    irating: 5200,
                    group_name: 'Class A',
                    safety_rating: 4.2,
                },
            ],
        } as M_Member;

        const userTeamIdMap = { 123: 42 };

        const result = getMemberViewFromM_Member(
            member,
            userTeamIdMap,
            teamInfoMap
        );

        expect(result.firstName).toBe('Max');
        expect(result.lastName).toBe('Verstappen');
        expect(result.iRating).toBe('5.2k');
        expect(result.teamName).toBe('Red Bull Racing');
        expect(result.teamId).toBe(42);
        expect(result.licenseLevel).toBe('A');
        expect(result.safetyRating).toBe('4.2');
    });

    it('handles member without team assignment', () => {
        const member = {
            cust_id: 456,
            display_name: 'Lewis Hamilton',
            club_id: 3,
            licenses: [
                {
                    category: 'formula_car',
                    irating: 4800,
                    group_name: 'Class B',
                    safety_rating: 3.8,
                },
            ],
        } as M_Member;

        const result = getMemberViewFromM_Member(member, {}, teamInfoMap);

        expect(result.teamName).toBe('');
        expect(result.iRating).toBe('4.8k');
    });

    it('handles zero irating', () => {
        const member = {
            cust_id: 789,
            display_name: 'New Driver',
            club_id: 1,
            licenses: [
                {
                    category: 'formula_car',
                    irating: 0,
                    group_name: 'Class R',
                    safety_rating: 2.5,
                },
            ],
        } as M_Member;

        const result = getMemberViewFromM_Member(member, {}, {});
        expect(result.iRating).toBe('0.0k');
    });
});
