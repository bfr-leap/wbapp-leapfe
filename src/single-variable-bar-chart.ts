const d3: any = (<any>globalThis).d3;

export class SingleVariableBarChart {
    constructor(parentDiv: HTMLElement, data: { x: any; y: number }[]) {
        console.log(data);

        // set the dimensions and margins of the graph
        // var margin = { top: 10, right: 10, bottom: 30, left: 50 },
        //     width = parentDiv.offsetWidth - margin.left - margin.right,
        //     height = parentDiv.offsetHeight - margin.top - margin.bottom;

        var margin = { top: 10, right: 10, bottom: 30, left: 50 },
            width = 300 - margin.left - margin.right,
            height = 200 - margin.top - margin.bottom;

        d3.select('svg').remove();

        // append the svg object to the body of the page
        var svg = d3
            .select(parentDiv.id)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr(
                'transform',
                'translate(' + margin.left + ',' + margin.top + ')'
            );

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
                    .tickValues(data.map((d) => d.x))
                    .tickFormat(d3.format('d'))
            )
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 20)
            .style('stroke', 'white');

        // Add Y axis
        var y = d3
            .scaleLinear()
            .domain([0, data.reduce((p, c) => (c.y > p ? p : c.y), 0)])
            .range([height, 0]);
        svg.append('g')
            .call(d3.axisLeft(y))
            .selectAll(['line', 'path', 'text'])
            .style('font-size', 20)
            .style('stroke', 'white');

        for (let i = 0; i < 1; ++i) {
            // Add the line
            svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', 'white')
                .attr('stroke-dasharray', '')
                .attr('stroke-width', 1.5)
                .attr(
                    'd',
                    d3
                        .line()
                        .x(function (d: any) {
                            return x(d.x);
                        })
                        .y(function (d: any) {
                            return y(d.y);
                        })
                );
        }
    }
}
