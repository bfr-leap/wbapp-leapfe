export interface LeagueSeasons {
    subscribed: boolean;
    seasons: LS_SeasonSummary[];
    success: boolean;
    retired: boolean;
    league_id: number;
}

export interface LeagueSeasonSessions {
    sessions: LSS_Session[];
    success: boolean;
    season_id: number;
    league_id: number;
}

export interface LapChartData {
    sucess: boolean;
    session_info: LCD_SessionInfo;
    best_lap_num: number;
    best_lap_time: number;
    best_nlaps_num: number;
    best_nlaps_time: number;
    best_qual_lap_num: number;
    best_qual_lap_time: number;
    best_qual_lap_at: null | number;
    chunk_info: LCD_Chunk[];
}

export interface LeagueDirectory {
    results_page: LD_LeagueInfo;
    success: boolean;
    lowerbound: number;
    upperbound: number;
    row_count: number;
}

export interface LD_LeagueInfo {
    league_id: number;
    owner_id: number;
    league_name: string;
    created: string;
    about: string;
    url: string;
    roster_count: number;
    recruiting: boolean;
    is_admin: boolean;
    is_member: boolean;
    pending_application: boolean;
    pending_invitation: boolean;
}

export interface LCD_Chunk {
    group_id: number;
    name: string;
    cust_id: number;
    display_name: string;
    lap_number: number;
    flags: number;
    incident: false;
    session_time: number;
    session_start_time: null | number;
    lap_time: number;
    team_fastest_lap: false;
    personal_best_lap: false;
    helmet: LCD_Helmet;
    license_level: number;
    car_number: string;
    lap_events: string[];
    lap_position: number;
    interval: null | number;
    interval_units: null | string;
    fastest_lap: boolean;
    ai: boolean;
}

export interface LCD_Helmet {
    pattern: number;
    color1: string;
    color2: string;
    color3: string;
    face_type: number;
    helmet_type: number;
}

export interface LCD_SessionInfo {
    subsession_id: number;
    session_id: number;
    simsession_number: number;
    simsession_type: number;
    simsession_name: string;
    num_laps_for_qual_average: number;
    num_laps_for_solo_average: number;
    event_type: number;
    event_type_name: string;
    private_session_id: number;
    season_name: string;
    season_short_name: string;
    series_name: string;
    series_short_name: string;
    session_name: string;
    restrict_results: boolean;
    start_time: string;
    track: LCD_Track;
}

export interface LCD_Track {
    track_id: number;
    track_name: string;
    config_name: string;
}

export interface LSS_Session {
    cars: LSS_Car[];
    consec_cautions_single_file: boolean;
    damage_model: number;
    do_not_count_caution_laps: boolean;
    do_not_paint_cars: boolean;
    driver_changes: boolean;
    entry_count: number;
    green_white_checkered_limit: number;
    has_results: true;
    launch_at: string;
    league_id: number;
    league_season_id: number;
    lone_qualify: boolean;
    max_ai_drivers: number;
    must_use_diff_tire_types_in_race: boolean;
    no_lapper_wave_arounds: boolean;
    num_opt_laps: number;
    pace_car_class_id: null;
    pace_car_id: null;
    password_protected: boolean;
    practice_length: number;
    private_session_id: number;
    qualify_laps: number;
    qualify_length: number;
    race_laps: number;
    race_length: number;
    session_id: number;
    short_parade_lap: boolean;
    start_on_qual_tire: boolean;
    start_zone: boolean;
    status: number;
    subsession_id: number;
    team_entry_count: number;
    telemetry_force_to_disk: number;
    telemetry_restriction: number;
    time_limit: number;
    track: LSS_Track;
    track_state: LSS_TrackState;
    weather: LSS_Weather;
    winner_id: number;
    winner_name: string;
}

export interface LSS_Weather {
    version: number;
    type: number;
    temp_units: number;
    temp_value: number;
    rel_humidity: number;
    fog: number;
    wind_dir: number;
    wind_units: number;
    wind_value: number;
    skies: number;
    weather_var_initial: number;
    weather_var_ongoing: number;
    allow_fog: boolean;
    track_water: number;
    precip_option: number;
}

export interface LSS_TrackState {
    leave_marbles: boolean;
    practice_rubber: number;
    qualify_rubber: number;
    warmup_rubber: number;
    race_rubber: number;
    practice_grip_compound: number;
    qualify_grip_compound: number;
    warmup_grip_compound: number;
    race_grip_compound: number;
}

export interface LSS_Track {
    track_id: number;
    track_name: string;
}

export interface LSS_Car {
    car_id: number;
    car_name: string;
    car_class_id: number;
    car_class_name: string;
}

export interface LS_SeasonSummary {
    league_id: number;
    season_id: number;
    points_system_id: number;
    season_name: string;
    active: boolean;
    hidden: boolean;
    num_drops: number;
    no_drops_on_or_after_race_num: number;
    points_cars: LS_PointCar[];
    driver_points_car_classes: LS_PointsCarClass[];
    team_points_car_classes: LS_PointsCarClass[];
    points_system_name: string;
    points_system_desc: string;
}

export interface LS_PointCar {
    car_id: number;
    car_name: number;
    team_car: false;
}

export interface LS_PointsCarClass {
    car_class_id: number;
    name: string;
    cars_in_class: LS_CarInClass[];
}

export interface LS_CarInClass {
    car_id: number;
    car_name: string;
}

export interface SeasonSimsessionIndex {
    season_id: number;
    season_title: string;
    sessions: SSI_Session[];
}

export interface SSI_Session {
    session_id: number;
    subsession_id: number;
    session_title: string;
    simsessions: SSI_Simsession[];
}

export interface SSI_Simsession {
    simsession_id: number;
    type: 'race' | 'sprint' | 'qualify' | 'practice';
}

export interface MembersData {
    success: boolean;
    cust_ids: number[];
    members: M_Member[];
}

export interface M_Member {
    cust_id: number;
    display_name: string;
    helmet: M_Helmet;
    last_login: string;
    member_since: string;
    club_id: number;
    club_name: number;
    ai: boolean;
    licenses: M_License[];
}

export interface M_License {
    category_id: number;
    category: string;
    license_level: number;
    safety_rating: number;
    cpi: number;
    irating: number;
    tt_rating: number;
    mpr_num_races: number;
    color: string;
    group_name: string;
    group_id: number;
    pro_promotable: boolean;
    mpr_num_tts: number;
}

export interface M_Helmet {
    pattern: 48;
    color1: '000000';
    color2: 'fff500';
    color3: '000000';
    face_type: 0;
    helmet_type: 0;
}

export interface CuratedLeagueTeamsInfo {
    league_id: number;
    seasons: CLTI_Season[];
}

export interface CLTI_Season {
    season_id: number;
    teams: CLTI_Team[];
}

export interface CLTI_Team {
    team_id: number;
    team_name: string;
    team_members: number[];
    team_logo: string;
}

export interface SimsessionResults {
    subsession_id: number;
    simsession_number: number;
    results: SSR_ResultsEntry[];
}

export interface SSR_ResultsEntry {
    cust_id: number;
    position: number;
    start_position: number;
    interval: number;
    avg_lap_time: number;
    fastest_lap_time: number;
    fast_lap: number;
    laps_completed: number;
    points: number;
    incidents: number;
}

export type DriverStatsMap = { [name: number]: DriverStats };

export interface DriverStats {
    cust_id: number;
    started: number;
    finished: number;
    wins: number;
    podiums: number;
    top_10: number;
    top_20: number;
    fast_laps: number;
    hard_charger: number;
    poles: number;
    power_points: number; 
    incidents: number;
}
