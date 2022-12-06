import type {
    // LeagueDirectory,
    // LeagueSeasons,
    // LeagueSeasonSessions,
    LapChartData,
    LCD_Chunk,
} from './iracing-endpoints';

interface LapDelta {
    lap: number;
    delta: number;
}

interface LapTime {
    lap: number;
    time: number;
}

interface GridItem {
    custid: number;
    is_ai: number;
    displayName: string;
    helmetPattern: number;
    licenseLevel: number;
}

function main() {
    if (document.readyState !== 'complete') {
        return;
    }

    let urlVars = getUrlVars();

    let subsession = urlVars['subsession'] || '58009723';
    let simsession = urlVars['simsession'] || '-3';

    fetch(`./data/scraped/lapChartData_${subsession}_${simsession}.json`)
        .then((response) => {
            return response.json();
        })
        .then((jsondata: LapChartData) => {
            console.log(jsondata);

            updateDriverNames(jsondata);

            data = getLapDeltas(getLapTimes(jsondata));
            window.setTimeout(chart, 0);
        });
}

function getUrlVars(): { [name: string]: string } {
    let vars = Object.create(null);

    let hashes = window.location.href
        .slice(window.location.href.indexOf('?') + 1)
        .split('&');
    for (let i = 0; i < hashes.length; i++) {
        let hash = hashes[i].split('=');
        if (hash[1]) {
            vars[hash[0]] = hash[1];
        }
    }
    return vars;
}

function updateDriverNames(lapChartInfo: LapChartData) {
    let nameCardsDiv = document.getElementById('name-cards');

    const toggleAll = document.createElement('a');
    toggleAll.innerHTML = 'Toggle All';
    toggleAll.className = 'driver-name';

    toggleAll.addEventListener('click', () => {
        let currentAlpha = activeColors[0][8];
        if (currentAlpha === 'f') {
            currentAlpha = '2';
        } else {
            currentAlpha = 'f';
        }

        for (let i = 0; i < activeColors.length; ++i) {
            activeColors[i] = `${activeColors[i].charAt(0)}${activeColors[
                i
            ].charAt(1)}${activeColors[i].charAt(2)}${activeColors[i].charAt(
                3
            )}${activeColors[i].charAt(4)}${activeColors[i].charAt(
                5
            )}${activeColors[i].charAt(6)}${currentAlpha}${currentAlpha}`;

            swatchElements[i].style.background = activeColors[i];

            needsRedraw = true;
            window.setTimeout(chart, 0);
        }
    });

    nameCardsDiv.appendChild(toggleAll);

    const p = document.createElement('p');

    nameCardsDiv.appendChild(p);

    let i = 0;

    let startgrid: GridItem[] = getStartGrid(lapChartInfo.chunk_info);

    for (let driver of startgrid) {
        activeColors.push(baseColors[i % baseColors.length]);
        activePatterns.push(basePatterns[i % basePatterns.length]);

        addDriverName(driver, i, nameCardsDiv);

        ++i;
    }
}

function addDriverName(driver: GridItem, i: number, nameCardsDiv: HTMLElement) {
    const dNameContainer = document.createElement('a');

    dNameContainer.className = 'driver-name';

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = activeColors[i];
    swatchElements.push(swatch);
    dNameContainer.appendChild(swatch);

    const text = document.createElement('span');
    text.innerHTML = decodeURI(driver.displayName).replace(/\+/g, ' ');
    text.className = 'text';
    dNameContainer.appendChild(text);

    dNameContainer.addEventListener('click', () => {
        let currentAlpha = activeColors[i][8];
        if (currentAlpha === 'f') {
            currentAlpha = '2';
        } else {
            currentAlpha = 'f';
        }
        activeColors[i] = `${activeColors[i].charAt(0)}${activeColors[i].charAt(
            1
        )}${activeColors[i].charAt(2)}${activeColors[i].charAt(
            3
        )}${activeColors[i].charAt(4)}${activeColors[i].charAt(
            5
        )}${activeColors[i].charAt(6)}${currentAlpha}${currentAlpha}`;

        swatch.style.background = activeColors[i];

        needsRedraw = true;
        window.setTimeout(chart, 0);
    });

    nameCardsDiv.appendChild(dNameContainer);
}

function getStartGrid(chunks: LCD_Chunk[]): GridItem[] {
    let startgrid: GridItem[] = [];
    let gridMap: { [name: number]: GridItem } = {};
    let sortMap: {
        [name: number]: { last_lap: number; last_position: number };
    } = {};

    for (let chunk of chunks) {
        gridMap[chunk.cust_id] = {
            custid: chunk.cust_id,
            is_ai: 0,
            displayName: chunk.display_name,
            helmetPattern: chunk.helmet.pattern,
            licenseLevel: chunk.license_level,
        };

        sortMap[chunk.cust_id] = {
            last_lap: chunk.lap_number,
            last_position: chunk.lap_position,
        };
    }

    for (let cId in gridMap) {
        startgrid.push(gridMap[cId]);
    }

    startgrid.sort((a: GridItem, b: GridItem) => {
        let sortIdxA = sortMap[a.custid];
        let sortIdxB = sortMap[b.custid];
        if (sortIdxA.last_lap === sortIdxB.last_lap) {
            return sortIdxA.last_position - sortIdxB.last_position;
        }
        return sortIdxB.last_lap - sortIdxA.last_lap;
    });

    return startgrid;
}

function getLapTimes(lapChartInfo: LapChartData): LapTime[][] {
    let sessionNameStrDiv = document.getElementById('sessionNameStr');
    sessionNameStrDiv.innerHTML = `${lapChartInfo.session_info.track.track_name.replace(
        /\+/g,
        ' '
    )} - ${lapChartInfo.session_info.session_name.replace(/\+/g, ' ')} ${
        lapChartInfo.session_info.start_time
    }`;

    let uid2gridMap: { [name: number]: number } = {};

    let startgrid: GridItem[] = getStartGrid(lapChartInfo.chunk_info);

    let ret: LapTime[][] = [];

    let i = 0;
    for (let gridItem of startgrid) {
        uid2gridMap[gridItem.custid] = i++;
        ret.push([]);
    }

    let prevLapMap: { [name: number]: number } = {};
    let firstTime = lapChartInfo.chunk_info[0].session_time;

    for (let lapdataIt of lapChartInfo.chunk_info) {
        if (lapdataIt.lap_number !== 0) {
            break;
        }

        let cTime = lapdataIt.session_time - firstTime;

        prevLapMap[lapdataIt.cust_id] = lapdataIt.session_time;
        ret[uid2gridMap[lapdataIt.cust_id]].push({ lap: 0, time: cTime });
    }

    for (let lapdataIt of lapChartInfo.chunk_info) {
        if (lapdataIt.lap_number === 0) {
            continue;
        }

        let cTime = lapdataIt.session_time - prevLapMap[lapdataIt.cust_id];

        prevLapMap[lapdataIt.cust_id] = lapdataIt.session_time;

        ret[uid2gridMap[lapdataIt.cust_id]].push({
            lap: lapdataIt.lap_number,
            time: cTime,
        });
    }

    for (let laps of ret) {
        for (let lap of laps) {
            lap.time = lap.time / 10000;
        }
    }

    return ret;
}

function getLapDeltas(lapTimes: LapTime[][]): LapDelta[][] {
    let baselineTime = Math.round(
        lapTimes
            .map((driverLaps: LapTime[]) =>
                driverLaps
                    .map((lapTime) => lapTime.time)
                    .reduce(function (min, value, _, { length }) {
                        if (value <= 1 || isNaN(value)) {
                            return min;
                        }
                        return Math.min(min, value);
                    }, Infinity)
            )
            .reduce(function (min, value, _, { length }) {
                if (value <= 1 || isNaN(value)) {
                    return min;
                }
                return Math.min(min, value);
            }, Infinity) * 1.07
    );

    let baselineStrDiv = document.getElementById('baselineStr');
    baselineStrDiv.innerHTML = baselineTime.toString() + 's';

    let ret: LapDelta[][] = lapTimes.map((dLapTimes) =>
        dLapTimes.map((dLapTime) => {
            return { lap: dLapTime.lap, delta: dLapTime.time - baselineTime };
        })
    );

    for (let dDeltas of ret) {
        dDeltas.shift();

        for (let i = 1; i < dDeltas.length; ++i) {
            dDeltas[i].delta += dDeltas[i - 1].delta;
        }
    }

    return ret;
}

const d3: any = (<any>globalThis).d3;

let data: LapDelta[][] = [];

let swatchElements: HTMLElement[] = [];

let baseColors: string[] = [
    '#ffadadff',
    '#ffd6a5ff',
    '#fdffb6ff',
    '#caffbfff',
    '#9bf6ffff',
    '#a0c4ffff',
    '#bdb2ffff',
    '#ffc6ffff',
    '#e27674ff',
    '#e3af6dff',
    '#dde07cff',
    '#94df84ff',
    '#65d5e2ff',
    '#6a95e1ff',
    '#8a79dfff',
    '#df8bdcff',
    '#cf3619ff',
    '#cf9616ff',
    '#b3cf1eff',
    '#2ccf22ff',
    '#14a0ccff',
    '#163fccff',
    '#531dccff',
    '#d027b3ff',
];

let basePatterns: string[] = [
    '',
    '16,2',
    '16,2,2,2',
    '16,8',
    '16,2,2,2,2,2',
    '4,4',
    '16,2,2,2,2,2,2,2',
    '8,2',
    '16,2,2,2,2,2,2,2,2,2,2,2',
    '32,2',
    '16,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2',
];

let activeColors: string[] = [];
let activePatterns: string[] = [];

let needsRedraw = true;

export function chart() {
    window.setTimeout(chart, 1000);

    let sizeDiv = document.getElementById('sizerDiv');
    let targetDiv = document.getElementById('my_dataviz');

    if (needsRedraw) {
        needsRedraw = false;
    } else {
        return;
    }

    window.addEventListener(
        'resize',
        (event) => {
            needsRedraw = true;
        },
        true
    );

    if (!targetDiv) return;

    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 10, bottom: 30, left: 50 },
        width = sizeDiv.offsetWidth - margin.left - margin.right,
        height = targetDiv.offsetHeight - margin.top - margin.bottom;

    d3.select('svg').remove();

    // append the svg object to the body of the page
    var svg = d3
        .select('#my_dataviz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var x = d3
        .scaleLinear()
        .domain(
            d3.extent(data[0], function (d: any) {
                return d.lap;
            })
        )
        .range([0, width]);
    svg.append('g')
        .attr('transform', 'translate(0,' + height + ')')
        .call(
            d3
                .axisBottom(x)
                .tickValues(data[0].map((d) => d.lap))
                .tickFormat(d3.format('d'))
        )
        .selectAll(['line', 'path', 'text'])
        .style('font-size', 20)
        .style('stroke', 'white');

    // Add Y axis
    var y = d3
        .scaleLinear()
        .domain([
            -1 *
                d3.min(data, (da: LapDelta[]) =>
                    d3.min(da, (d: LapDelta) => +d.delta)
                ),
            d3.min(data, (da: LapDelta[]) =>
                d3.min(da, (d: LapDelta) => +d.delta)
            ),
        ])
        .range([height, 0]);
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll(['line', 'path', 'text'])
        .style('font-size', 20)
        .style('stroke', 'white');

    for (let i = 0; i < data.length; ++i) {
        // Add the line
        svg.append('path')
            .datum(data[i])
            .attr('fill', 'none')
            .attr('stroke', activeColors[i])
            .attr('stroke-dasharray', activePatterns[i])
            .attr('stroke-width', 1.5)
            .attr(
                'd',
                d3
                    .line()
                    .x(function (d: any) {
                        return x(d.lap);
                    })
                    .y(function (d: any) {
                        return y(d.delta);
                    })
            );
    }
}

document.onreadystatechange = main;
