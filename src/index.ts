interface LapDelta {
    lap: number;
    delta: number;
}

interface LapTime {
    lap: number;
    time: number;
}

interface SessionDetails {
    eventDate: string;
    privateSessionName: string;
    trackName: string;
}

interface GridItem {
    custid: number;
    is_ai: number;
    displayName: string;
    helmetPattern: number;
    licenseColor: string;
}

interface LapItem {
    lapnum: number;
    custid: number;
    carnum: string;
    sesTime: number;
    flags: number;
}

interface LapChartInfo {
    details: SessionDetails;
    startgrid: GridItem[];
    lapdata: LapItem[];
}

function main() {
    if (document.readyState !== 'complete') {
        return;
    }

    fetch('./data/lapchart_sessionId_192046751_subSessionId_52396226.json')
        .then((response) => {
            return response.json();
        })
        .then((jsondata: LapChartInfo) => {
            console.log(jsondata);

            updateDriverNames(jsondata);

            data = getLapDeltas(getLapTimes(jsondata));
            window.setTimeout(chart, 0);
        });
}

function updateDriverNames(lapChartInfo: LapChartInfo) {
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

    for (let driver of lapChartInfo.startgrid) {
        activeColors.push(baseColors[i % baseColors.length]);

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

function getLapTimes(lapChartInfo: LapChartInfo): LapTime[][] {
    let sessionNameStrDiv = document.getElementById('sessionNameStr');
    sessionNameStrDiv.innerHTML = `${lapChartInfo.details.trackName.replace(
        /\+/g,
        ' '
    )} - ${lapChartInfo.details.privateSessionName.replace(/\+/g, ' ')} ${
        lapChartInfo.details.eventDate
    }`;

    let uid2gridMap: { [name: number]: number } = {};

    let ret: LapTime[][] = [];

    let i = 0;
    for (let gridItem of lapChartInfo.startgrid) {
        uid2gridMap[gridItem.custid] = i++;
        ret.push([]);
    }

    let prevLapMap: { [name: number]: number } = {};
    let firstTime = lapChartInfo.lapdata[0].sesTime;

    for (let lapdataIt of lapChartInfo.lapdata) {
        if (lapdataIt.lapnum !== 0) {
            break;
        }

        let cTime = lapdataIt.sesTime - firstTime;

        prevLapMap[lapdataIt.custid] = lapdataIt.sesTime;

        ret[uid2gridMap[lapdataIt.custid]].push({ lap: 0, time: cTime });
    }

    for (let lapdataIt of lapChartInfo.lapdata) {
        if (lapdataIt.lapnum === 0) {
            continue;
        }

        let cTime = lapdataIt.sesTime - prevLapMap[lapdataIt.custid];

        prevLapMap[lapdataIt.custid] = lapdataIt.sesTime;

        ret[uid2gridMap[lapdataIt.custid]].push({
            lap: lapdataIt.lapnum,
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
    let avgTime = Math.round(
        lapTimes
            .map((driverLaps: LapTime[]) =>
                driverLaps
                    .map((lapTime) => lapTime.time)
                    .reduce(function (avg, value, _, { length }) {
                        return avg + value / length;
                    }, 0)
            )
            .reduce(function (avg, value, _, { length }) {
                return avg + value / length;
            }, 0) * 1.07
    );

    let baselineStrDiv = document.getElementById('baselineStr');
    baselineStrDiv.innerHTML = avgTime.toString() + 's';

    let ret: LapDelta[][] = lapTimes.map((dLapTimes) =>
        dLapTimes.map((dLapTime) => {
            return { lap: dLapTime.lap, delta: dLapTime.time - avgTime };
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

let activeColors: string[] = [];

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
            d3.max(data, (da: LapDelta[]) =>
                d3.max(da, (d: LapDelta) => +d.delta)
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
