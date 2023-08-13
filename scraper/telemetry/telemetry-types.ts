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

interface ReplayNote {
    time: number;
    lookAt: number;
    note: string;
}

interface ExtendedTelemetry {
    driverId: number;
    lapNumber: number;
    perc: number;
    perdD: number;
    t: number;
}
