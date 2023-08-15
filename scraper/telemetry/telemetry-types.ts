/**
 *
 * This TypeScript file defines a set of interfaces for handling telemetry data related to driver behavior
 * and race events in a simulation or game. It includes structures to represent driver telemetry data,
 * epoch-based telemetry information including lap data, position change events with associated details, and
 * replay notes with time-based annotations. Additionally, an "ExtendedTelemetry" interface is provided to
 * capture extended telemetry data such as driver identification, lap number, percentages, and time.
 *
 */

export interface DriverTelemetryDatum {
    driverId: number;
    perc: number;
    percD: number;
    driverName: string;
}

export interface EpochTelemetry {
    numLaps: number;
    checkeredFlag: number;
    epochList: {
        time: number;
        data: DriverTelemetryDatum[];
    }[];
}

export interface PositionChangeEvent {
    directDriverId: number;
    indirectDriverId?: number;
    time: number;
    perc: number;
    actionType: string;
    lapNumber: number;
    position: number;
    notes: string[];
    indirectNotes: string[];
}

export interface ReplayNote {
    time: number;
    lookAt: number;
    note: string[];
}

interface ExtendedTelemetry {
    driverId: number;
    lapNumber: number;
    perc: number;
    perdD: number;
    t: number;
}
