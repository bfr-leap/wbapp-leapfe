import type { DropdownModel } from './dropdown-model';
import { getTrackInfoDirectory } from '@/utils/fetch-util';

export interface TrackResultsMenuModel {
    currentLeague: string;
    carOptions: DropdownModel;
    trackOptions: DropdownModel;
}

export function getDefaultTrackResultsMenuModel(): TrackResultsMenuModel {
    return {
        currentLeague: '',
        carOptions: {
            selected: '---',
            options: [],
        },
        trackOptions: {
            selected: '---',
            options: [],
        },
    };
}

export async function getTrackResultsMenuModel(
    league: string,
    car: string,
    track: string
): Promise<TrackResultsMenuModel> {
    let ret: TrackResultsMenuModel = {
        currentLeague: '',
        carOptions: {
            selected: '---',
            options: [],
        },
        trackOptions: {
            selected: '---',
            options: [],
        },
    };

    let trackInfoDirectory = await getTrackInfoDirectory(league);

    ret.carOptions.selected = trackInfoDirectory.car_display[car];
    ret.trackOptions.selected = trackInfoDirectory.track_display[track];
    ret.currentLeague = trackInfoDirectory.league_name;

    ret.trackOptions.options = [];
    for (let trackIdOption of trackInfoDirectory.car_2_track_map[car]) {
        ret.trackOptions.options.push({
            display: trackInfoDirectory.track_display[trackIdOption],
            href: `?m=track&league=${league}&car=${car}&track=${trackIdOption}`,
        });
    }

    ret.carOptions.options = [];
    for (let carIdOption of Object.keys(trackInfoDirectory.car_2_track_map)) {
        let trackOption =
            trackInfoDirectory.car_2_track_map[carIdOption].indexOf(
                track.toString()
            ) !== -1
                ? track
                : trackInfoDirectory.car_2_track_map[carIdOption][0]; // keep the same track if we can or select the first available track

        ret.carOptions.options.push({
            display: trackInfoDirectory.car_display[carIdOption],
            href: `?m=track&league=${league}&car=${carIdOption}&track=${trackOption}`,
        });
    }

    return ret;
}
