// main.js - Consolidated JavaScript for the D3 dashboard
// Combines the Chart base, BarChart, ScatterPlot, ParallelCoordinates and
// the dashboard initialization logic that used to be split across files.
// It expects D3 v7 to be loaded before this script runs (we load D3 from CDN).

// ------------------------- Chart base (from scripts/d3chart.js) -------------------------
// The Chart class provides a lightweight base with a small enter/exit helper
// and utility methods. It's kept for compatibility with prior code, but the
// dashboard uses the specific chart classes below.
class Chart {
    // constructor: create internal state object `attrs` and expose simple accessors
    constructor() {
        // attrs: default configuration and state for a Chart instance
        const attrs = {
            id: 'ID' + Math.floor(Math.random() * 1000000), // unique id used for namespacing events
            svgWidth: 400,      // fallback svg width
            svgHeight: 200,     // fallback svg height
            marginTop: 5,       // top margin
            marginBottom: 5,    // bottom margin
            marginRight: 5,     // right margin
            marginLeft: 5,      // left margin
            container: 'body',  // CSS selector for container
            defaultTextFill: '#2C3E50',
            defaultFont: 'Helvetica',
            data: null,
            chartWidth: null,
            chartHeight: null
        };

        // getter for the internal state
        this.getState = () => attrs;
        // setter that merges provided object into attrs
        this.setState = (d) => Object.assign(attrs, d);

        // generate simple getters/setters for each attribute (chainable)
        Object.keys(attrs).forEach((key) => {
            this[key] = function (_) {
                if (!arguments.length) return attrs[key];
                attrs[key] = _;
                return this;
            };
        });

        // initialize the custom enter/exit helper on d3 selections
        this.initializeEnterExitUpdatePattern();
    }

    // render is a generic pipeline used by the base class (not used directly by our charts)
    render() {
        this.setDynamicContainer();  // set up container and size
        this.calculateProperties();  // compute derived sizes
        this.drawSvgAndWrappers();   // draw an SVG and wrapper <g>
        this.drawRects();            // draw a sample rect (example)
        return this;                 // return for chaining
    }

    // calculateProperties computes inner chart dimensions based on margins
    calculateProperties() {
        const { marginLeft, marginTop, marginRight, marginBottom, svgWidth, svgHeight } = this.getState();
        var calc = { id: null, chartTopMargin: null, chartLeftMargin: null, chartWidth: null, chartHeight: null };
        calc.id = 'ID' + Math.floor(Math.random() * 1000000); // per-render id
        calc.chartLeftMargin = marginLeft; // local alias
        calc.chartTopMargin = marginTop;   // local alias
        const chartWidth = svgWidth - marginRight - calc.chartLeftMargin; // inner width
        const chartHeight = svgHeight - marginBottom - calc.chartTopMargin; // inner height
        this.setState({ calc, chartWidth, chartHeight }); // persist calculated props
    }

    // drawRects: example helper to draw a rectangle (keeps backward compatibility)
    drawRects() {
        const { chart, data, chartWidth, chartHeight } = this.getState();
        chart
            ._add({ tag: 'rect', selector: 'rect-sample', data: [data] })
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('fill', (d) => d.color);
    }

    // drawSvgAndWrappers: creates the SVG element and a wrapper group for chart content
    drawSvgAndWrappers() {
        const { d3Container, svgWidth, svgHeight, defaultFont, calc, data, chartWidth, chartHeight } = this.getState();
        const svg = d3Container
            ._add({ tag: 'svg', className: 'svg-chart-container' })
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('font-family', defaultFont);
        var chart = svg
            ._add({ tag: 'g', className: 'chart' })
            .attr('transform', 'translate(' + calc.chartLeftMargin + ',' + calc.chartTopMargin + ')');
        chart
            ._add({ tag: 'rect', selector: 'rect-sample', data: [data] })
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('fill', (d) => d.color);
        this.setState({ chart, svg });
    }

    // initializeEnterExitUpdatePattern installs a small helper `_add` on d3 selections
    initializeEnterExitUpdatePattern() {
        d3.selection.prototype._add = function (params) {
            var container = this;                         // d3 selection acting as container
            var className = params.className;             // CSS class for new elements
            var elementTag = params.tag;                  // tag to append (e.g., 'g', 'rect')
            var data = params.data || [className];       // data array for binding
            var exitTransition = params.exitTransition || null; // optional exit transition
            var enterTransition = params.enterTransition || null; // optional enter transition
            var selection = container.selectAll('.' + className).data(data, (d, i) => {
                if (typeof d === 'object') {
                    if (d.id) return d.id;                // use id if present
                }
                return i;
            });
            if (exitTransition) {
                exitTransition(selection);               // run custom exit transition
            } else {
                selection.exit().remove();               // otherwise remove
            }
            const enterSelection = selection.enter().append(elementTag); // append entering elements
            if (enterTransition) enterTransition(enterSelection);        // optional enter transition
            selection = enterSelection.merge(selection);                // merge enter + update
            selection.attr('class', className);                         // set class
            return selection;                                           // return selection for chaining
        };
    }

    // setDynamicContainer finds the DOM container and attaches resize listener
    setDynamicContainer() {
        const attrs = this.getState();                       // read current attrs
        var d3Container = d3.select(attrs.container);        // select container element
        var containerRect = d3Container.node().getBoundingClientRect(); // measure it
        if (containerRect.width > 0) attrs.svgWidth = containerRect.width; // update width if available
        d3.select(window).on('resize.' + attrs.id, () => {
            var containerRect = d3Container.node().getBoundingClientRect();
            if (containerRect.width > 0) attrs.svgWidth = containerRect.width; // update width on resize
            this.render(); // re-render chart on resize
        });
        this.setState({ d3Container }); // store the selection for later use
    }
}

// ------------------------- Chart 1: BarChart (from scripts/chart1.js) -------------------------
// The BarChart below has been expanded so each active statement is
// preceded by a short comment. Chained d3 calls were split so we can
// document each step on its own line (this improves readability).
class BarChart {
    // constructor: initialize instance properties
    constructor() {
        this.data = null;                // will hold processed data for bars
        this.svg = null;                 // svg selection
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        this.width = 0;                  // inner chart width
        this.height = 0;                 // inner chart height
    }

    // render: draws the bar chart into a given container
    // containerId: CSS selector for the chart element (e.g., '#chart-1')
    // containerWidth/containerHeight: measured size of the container element
    // data: array of objects with {studytime, avgG3}
    render(containerId, containerWidth, containerHeight, data) {
        this.data = data; // store data reference

        // basic validation: if there's no data, log and bail
        if (!this.data || this.data.length === 0) {
            console.error('No data available for Chart 1');
            return;
        }

        // Calculate responsive margins (use percentages but enforce minima)
        const dynamicMargins = {
            top: Math.max(40, containerHeight * 0.1),
            right: Math.max(40, containerWidth * 0.08),
            bottom: Math.max(60, containerHeight * 0.15),
            left: Math.max(60, containerWidth * 0.12)
        };

        // Compute inner drawing area
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;

        // Clear the container so redraws don't stack
        d3.select(containerId).selectAll('*').remove();

        // Create an SVG element matching the container size
        this.svg = d3.select(containerId).append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        // Create a top-level group translated according to margins
        const g = this.svg.append('g')
            .attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);

        // Build an X scale (categorical) using the studytime values
        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.studytime))
            .range([0, this.width])
            .padding(0.3);

        // Friendly labels for studytime categories
        const studyTimeLabels = { 1: '<2', 2: '2-5', 3: '5-10', 4: '>10' };

        // Build a Y linear scale from 0 to slightly above the max avg grade
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.avgG3) * 1.1])
            .range([this.height, 0])
            .nice();

        // Color scale maps studytime categories to a blue ramp
        const colorScale = d3.scaleSequential().domain([1, 4]).interpolator(d3.interpolateBlues).clamp(true);

        // Append a group for the X axis and position it at the bottom
        const xAxisG = g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.height})`);
        // Call the axis generator to render ticks and labels
        xAxisG.call(d3.axisBottom(xScale).tickFormat(d => studyTimeLabels[d] || d));
        // Style the axis text size for responsiveness
        xAxisG.style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');

        // Append a group for the Y axis at the left
        const yAxisG = g.append('g').attr('class', 'y-axis');
        // Call the Y axis generator
        yAxisG.call(d3.axisLeft(yScale));
        // Style the axis text size
        yAxisG.style('font-size', Math.max(10, Math.min(14, containerHeight * 0.025)) + 'px');

        // X axis label: centered text at the bottom of the SVG
        const xAxisLabel = this.svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', dynamicMargins.left + this.width / 2)
            .attr('y', containerHeight - 10)
            .style('font-size', Math.max(12, containerWidth * 0.02) + 'px')
            .style('font-weight', '600')
            .style('fill', '#2C3E50')
            .text('Weekly Study Time (hours/week)');

        // Y axis label: rotated text on the left side
        const yAxisLabel = this.svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(dynamicMargins.top + this.height / 2))
            .attr('y', 15)
            .style('font-size', Math.max(12, containerHeight * 0.025) + 'px')
            .style('font-weight', '600')
            .style('fill', '#2C3E50')
            .text('Average Math Final Grade');

        // Create rect elements for each bar (enter selection)
        const barsEnter = g.selectAll('.bar').data(this.data).enter().append('rect');
        // Set a class on the bars for styling
        barsEnter.attr('class', 'bar');
        // Position each bar on the X axis
        barsEnter.attr('x', d => xScale(d.studytime));
        // Position the top of the bar using the Y scale
        barsEnter.attr('y', d => yScale(d.avgG3));
        // Set the width depending on the band scale
        barsEnter.attr('width', xScale.bandwidth());
        // Set the height based on the Y scale value
        barsEnter.attr('height', d => this.height - yScale(d.avgG3));
        // Fill color for the bar using the color scale
        barsEnter.attr('fill', d => colorScale(d.studytime));
        // Add a subtle stroke to bars
        barsEnter.attr('stroke', '#2C3E50');
        barsEnter.attr('stroke-width', 1);
        barsEnter.style('opacity', 0.8);

        // Add numeric labels above each bar (enter selection)
        const labelsEnter = g.selectAll('.bar-label').data(this.data).enter().append('text');
        labelsEnter.attr('class', 'bar-label');
        labelsEnter.attr('text-anchor', 'middle');
        labelsEnter.attr('x', d => xScale(d.studytime) + xScale.bandwidth() / 2);
        labelsEnter.attr('y', d => yScale(d.avgG3) - 5);
        labelsEnter.style('font-size', Math.max(10, Math.min(14, containerWidth * 0.02)) + 'px');
        labelsEnter.style('font-weight', 'bold');
        labelsEnter.style('fill', '#2C3E50');
        labelsEnter.text(d => d.avgG3.toFixed(2));

        // Hover interaction: increase opacity and stroke on mouseover
        barsEnter.on('mouseover', function (event, d) {
            d3.select(this).style('opacity', 1).attr('stroke-width', 2);
        });
        // Revert visual style on mouseout
        barsEnter.on('mouseout', function (event, d) {
            d3.select(this).style('opacity', 0.8).attr('stroke-width', 1);
        });

        // Finally add the legend explaining colors
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    // addLegend: draws a small legend block in the SVG
    addLegend(containerWidth, containerHeight, margins) {
        // Legend items with label + color
        const legendData = [
            { label: '<2 hours/week (1)', color: d3.interpolateBlues(0.4) },
            { label: '2-5 hours/week (2)', color: d3.interpolateBlues(0.6) },
            { label: '5-10 hours/week (3)', color: d3.interpolateBlues(0.8) },
            { label: '>10 hours/week (4)', color: d3.interpolateBlues(1) }
        ];

        // Container group for legend positioned near the right edge
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${containerWidth - Math.max(150, containerWidth * 0.2)}, 0)`);

        // Create a row for each legend item
        legendData.forEach((item, i) => {
            const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
            legendRow.append('rect').attr('width', 15).attr('height', 15).attr('fill', item.color).attr('stroke', '#2C3E50').attr('stroke-width', 0.5);
            legendRow.append('text').attr('x', 20).attr('y', 12).style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px').style('fill', '#2C3E50').text(item.label);
        });
    }
}

// ------------------------- Chart 2: ScatterPlot (from scripts/chart2.js) -------------------------
class ScatterPlot {
    constructor() {
        this.data = null;         // processed points
        this.svg = null;          // svg selection
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        this.width = 0;           // inner width
        this.height = 0;          // inner height
    }

    // render: draws scatter points for absences vs G3
    render(containerId, containerWidth, containerHeight, data) {
        // keep a reference to incoming processed data
        this.data = data;
        // guard: must have data
        if (!this.data || this.data.length === 0) {
            console.error('No data available for ScatterPlot');
            return;
        }

        // compute responsive margins (minima + percentage)
        const dynamicMargins = {
            top: Math.max(40, containerHeight * 0.1),
            right: Math.max(40, containerWidth * 0.08),
            bottom: Math.max(60, containerHeight * 0.15),
            left: Math.max(60, containerWidth * 0.12)
        };

        // compute inner dimensions
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;

        // clear previous chart contents
        d3.select(containerId).selectAll('*').remove();

        // create svg sized to container
        this.svg = d3.select(containerId).append('svg').attr('width', containerWidth).attr('height', containerHeight);

        // group for margins
        const g = this.svg.append('g').attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);

        // xScale: linear from 0 to max absences + 2
        const xScale = d3.scaleLinear().domain([0, d3.max(this.data, d => d.absences) + 2]).range([0, this.width]);
        // yScale: fixed domain 0..20 mapping to pixel range
        const yScale = d3.scaleLinear().domain([0, 20]).range([this.height, 0]);

        // append x-axis group and draw axis
        const xAxisG = g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.height})`);
        xAxisG.call(d3.axisBottom(xScale).ticks(10));
        xAxisG.style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');

        // append y-axis group and draw axis
        const yAxisG = g.append('g').attr('class', 'y-axis');
        yAxisG.call(d3.axisLeft(yScale).ticks(5));
        yAxisG.style('font-size', Math.max(10, Math.min(14, containerHeight * 0.025)) + 'px');

        // add X axis label centered under the SVG
        this.svg.append('text').attr('class', 'x-axis-label').attr('text-anchor', 'middle').attr('x', dynamicMargins.left + this.width / 2).attr('y', containerHeight - 10).style('font-size', Math.max(12, containerWidth * 0.02) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text('Number of School Absences');

        // add Y axis label rotated on the left
        this.svg.append('text').attr('class', 'y-axis-label').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('x', -(dynamicMargins.top + this.height / 2)).attr('y', 15).style('font-size', Math.max(12, containerHeight * 0.025) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text('Math Final Grade');

        // grid lines: x direction
        const gridX = g.append('g').attr('class', 'grid grid--x').attr('transform', `translate(0,${this.height})`);
        gridX.call(d3.axisBottom(xScale).ticks(10).tickSize(-this.height).tickFormat(''));
        gridX.style('stroke', '#e0e0e0').style('stroke-opacity', 0.3);

        // grid lines: y direction
        const gridY = g.append('g').attr('class', 'grid grid--y');
        gridY.call(d3.axisLeft(yScale).ticks(5).tickSize(-this.width).tickFormat(''));
        gridY.style('stroke', '#e0e0e0').style('stroke-opacity', 0.3);

        // draw points: bind data and create circles
        const pointsEnter = g.selectAll('.point').data(this.data).enter().append('circle');
        pointsEnter.attr('class', 'point');
        pointsEnter.attr('cx', d => xScale(d.absences));
        pointsEnter.attr('cy', d => yScale(d.G3));
        pointsEnter.attr('r', Math.max(3, Math.min(6, containerWidth * 0.008)));
        pointsEnter.attr('fill', d => d.traveltimeGroup === 'Close' ? '#2196F3' : '#FF9800');
        pointsEnter.attr('stroke', '#ffffff');
        pointsEnter.attr('stroke-width', 1);
        pointsEnter.style('opacity', 0.7);

        // hover interactions for points: enlarge and highlight
        pointsEnter.on('mouseover', function (event, d) {
            d3.select(this).attr('r', Math.max(4, Math.min(8, containerWidth * 0.01))).style('opacity', 1).attr('stroke-width', 2);
        });
        pointsEnter.on('mouseout', function (event, d) {
            d3.select(this).attr('r', Math.max(3, Math.min(6, containerWidth * 0.008))).style('opacity', 0.7).attr('stroke-width', 1);
        });

        // draw legend for travel time
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    // addLegend: draws travel time legend
    addLegend(containerWidth, containerHeight, margins) {
        const legendData = [
            { label: 'Living Close (travel time < 30 minutes)', color: '#2196F3' },
            { label: 'Living Far (travel time >30 minutes)', color: '#FF9800' }
        ];

        // create legend group positioned toward the right
        const legend = this.svg.append('g').attr('class', 'legend').attr('transform', `translate(${containerWidth - Math.max(280, containerWidth * 0.35)}, 0)`);

        // create rows for each legend item
        legendData.forEach((item, i) => {
            const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 25})`);
            legendRow.append('circle').attr('cx', 8).attr('cy', 8).attr('r', 6).attr('fill', item.color).attr('stroke', '#ffffff').attr('stroke-width', 1);
            legendRow.append('text').attr('x', 20).attr('y', 12).style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px').style('fill', '#2C3E50').text(item.label);
        });
    }
}

// ------------------------- Chart 3: ParallelCoordinates (from scripts/chart3.js) -------------------------
class ParallelCoordinates {
    constructor() {
        this.data = null;       // processed multi-dimensional data
        this.svg = null;        // svg selection
        this.margin = { top: 60, right: 40, bottom: 40, left: 40 };
        this.width = 0;
        this.height = 0;
    }

    // render: draws aggregated parallel coordinate lines (average per Dalc)
    render(containerId, containerWidth, containerHeight, data) {
        // store incoming processed data
        this.data = data;
        // guard: require data
        if (!this.data || this.data.length === 0) {
            console.error('No data available for Parallel Coordinates');
            return;
        }

        // compute margins and inner dimensions
        const dynamicMargins = {
            top: Math.max(60, containerHeight * 0.12),
            right: Math.max(40, containerWidth * 0.05),
            bottom: Math.max(100, containerHeight * 0.2),
            left: Math.max(40, containerWidth * 0.05)
        };
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;

        // clear any previous content and create SVG
        d3.select(containerId).selectAll('*').remove();
        this.svg = d3.select(containerId).append('svg').attr('width', containerWidth).attr('height', containerHeight);
        const g = this.svg.append('g').attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);

        // list of dimensions to visualize
        const dimensions = ['health', 'studytime', 'absences', 'failures', 'famrel', 'G3'];

        // create an independent y-scale for each dimension based on its extent
        const yScales = {};
        dimensions.forEach(dim => {
            yScales[dim] = d3.scaleLinear().domain(d3.extent(this.data, d => d[dim])).range([this.height, 0]).nice();
        });

        // x-positioning: equally space the dimension axes horizontally
        const xScale = d3.scalePoint().domain(dimensions).range([0, this.width]).padding(0.1);

        // color scale for Dalc groups
        const colorScale = d3.scaleOrdinal().domain([1,2,3,4,5]).range(['#A63B28','#3156AD','#1D7332','#EBED0E','#D10DB3']);

        // line generator and path helper
        const line = d3.line();
        const path = d => line(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])]));

        // compute average values per Dalc level across dimensions
        const dalcGroups = [1,2,3,4,5];
        const averageData = dalcGroups.map(dalcValue => {
            const groupData = this.data.filter(d => d.Dalc === dalcValue);
            if (groupData.length === 0) return null; // skip if empty
            const avgPoint = { Dalc: dalcValue };
            dimensions.forEach(dim => { avgPoint[dim] = d3.mean(groupData, d => d[dim]); });
            return avgPoint;
        }).filter(d => d !== null);

        // draw average lines for each Dalc group
        const avgGroup = g.append('g').attr('class', 'average-lines');
        avgGroup.selectAll('path').data(averageData).enter().append('path').attr('d', path).style('fill', 'none').style('stroke', d => colorScale(d.Dalc)).style('stroke-width', 4).style('opacity', 0.9);

        // create axis groups for each dimension and position them
        const axes = g.selectAll('.dimension').data(dimensions).enter().append('g').attr('class', 'dimension').attr('transform', d => `translate(${xScale(d)},0)`);

        // for each axis group, create a left-oriented axis showing ticks
        axes.append('g').each(function (d) {
            d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5));
        });
        axes.style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px');

        // append axis labels under each axis
        axes.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').attr('y', this.height + 35).style('font-size', Math.max(11, Math.min(14, containerWidth * 0.018)) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text(d => { const labels = { 'health':'Health Status','studytime':'Study Time','absences':'Absences','failures':'Failures','famrel':'Family Relations','G3':'Final Grade' }; return labels[d]; });

        // append compact explanations under the axis labels
        axes.append('text').attr('class', 'axis-explanation').attr('text-anchor', 'middle').attr('y', this.height + 55).style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px').style('fill', '#666').text(d => { const explanations = { 'health':'1=very bad, 5=very good','studytime':'1=<2h, 2=2-5h, 3=5-10h, 4=>10h','absences':'0-93 absences','failures':'past failures (max 4)','famrel':'1=very bad, 5=excellent','G3':'grade 0-20' }; return explanations[d]; });

        // add legend and explanatory note
        this.addLegend(containerWidth, containerHeight, dynamicMargins, colorScale);
    }

    // addLegend: color legend for Dalc groups + explanatory note
    addLegend(containerWidth, containerHeight, margins, colorScale) {
        // legend container at top-left area within svg
        const legend = this.svg.append('g').attr('class', 'legend').attr('transform', `translate(${margins.left}, 10)`);
        // title for the legend
        legend.append('text').attr('x', 0).attr('y', 12).style('font-size', Math.max(10, Math.min(13, containerWidth * 0.016)) + 'px').style('fill', '#2C3E50').style('font-weight', '600').text('Average Values by Daily Alcohol Consumption Level');
        // small dataset for legend rendering
        const dalcLegendData = [ { value:1, label:'Dalc: 1' },{ value:2, label:'Dalc: 2' },{ value:3, label:'Dalc: 3' },{ value:4, label:'Dalc: 4' },{ value:5, label:'Dalc: 5' } ];
        // group for color swatches
        const colorLegend = legend.append('g').attr('transform', 'translate(350, 0)');
        // draw a short colored line and a label for each Dalc value
        dalcLegendData.forEach((item, i) => {
            const legendRow = colorLegend.append('g').attr('transform', `translate(${i * 70}, 0)`);
            legendRow.append('line').attr('x1', 0).attr('x2', 25).attr('y1', 8).attr('y2', 8).attr('stroke', colorScale(item.value)).attr('stroke-width', 4);
            legendRow.append('text').attr('x', 30).attr('y', 12).style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px').style('fill', '#2C3E50').text(item.value);
        });
        // small explanatory note including the number of students used
        legend.append('text').attr('x', 0).attr('y', 30).style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px').style('fill', '#666').style('font-style', 'italic').text(`Based on ${this.data.length} students. Each line shows average values for a Dalc level.`);
    }
}

// ------------------------- Dashboard initialization (previously inline in index.html) -------------------------
// charts: container for chart instances so we reuse them across renders
let charts = {};
// rawData: cached CSV rows (loaded once)
let rawData = null;

// loadData: loads CSV via d3.csv and caches the result
async function loadData() {
    if (!rawData) {
        try {
            rawData = await d3.csv('student-mat.csv');
            console.log('Data loaded successfully:', rawData.length, 'rows');
        } catch (error) {
            console.error('Error loading CSV data:', error);
        }
    }
    return rawData;
}

// processChart1Data: aggregate mean G3 by studytime using d3.rollup
function processChart1Data(data) {
    const groupedData = d3.rollup(data, v => d3.mean(v, d => +d.G3), d => +d.studytime);
    return Array.from(groupedData, ([studytime, avgG3]) => ({ studytime: studytime, avgG3: avgG3 })).sort((a, b) => a.studytime - b.studytime);
}

// processChart2Data: extract numeric fields for scatter plot and categorize traveltime
function processChart2Data(data) {
    return data.map(d => ({ absences: +d.absences, G3: +d.G3, traveltime: +d.traveltime, traveltimeGroup: (+d.traveltime === 1 || +d.traveltime === 2) ? 'Close' : 'Far' })).filter(d => !isNaN(d.absences) && !isNaN(d.G3) && !isNaN(d.traveltime));
}

// processChart3Data: extract multi-dimensional numeric fields + Dalc
function processChart3Data(data) {
    return data.map(d => ({ health: +d.health, studytime: +d.studytime, absences: +d.absences, failures: +d.failures, famrel: +d.famrel, G3: +d.G3, Dalc: +d.Dalc, sex: d.sex, address: d.address })).filter(d => !isNaN(d.health) && !isNaN(d.studytime) && !isNaN(d.absences) && !isNaN(d.failures) && !isNaN(d.famrel) && !isNaN(d.G3) && !isNaN(d.Dalc));
}

// initializeDashboard: main orchestrator that prepares data and renders the charts
async function initializeDashboard() {
    // DOM references for the three chart containers
    const container1 = document.getElementById('chart-1');
    const container2 = document.getElementById('chart-2');
    const container3 = document.getElementById('chart-3');

    // Clear any previous drawings
    d3.select('#chart-1').selectAll('*').remove();
    d3.select('#chart-2').selectAll('*').remove();
    d3.select('#chart-3').selectAll('*').remove();

    // Load and validate data
    const data = await loadData();
    if (!data) { console.error('Failed to load data'); return; }

    // Prepare data for each chart
    const chart1Data = processChart1Data(data);
    const chart2Data = processChart2Data(data);
    const chart3Data = processChart3Data(data);

    // Instantiate and render charts (reuse instances across calls)
    if (!charts.chart1) charts.chart1 = new BarChart();
    charts.chart1.render('#chart-1', container1.clientWidth, container1.clientHeight, chart1Data);

    if (!charts.chart2) charts.chart2 = new ScatterPlot();
    charts.chart2.render('#chart-2', container2.clientWidth, container2.clientHeight, chart2Data);

    if (!charts.chart3) charts.chart3 = new ParallelCoordinates();
    charts.chart3.render('#chart-3', container3.clientWidth, container3.clientHeight, chart3Data);

    // Debug info
    console.log('Dashboard initialized');
    console.log('Container 1 dimensions:', container1.clientWidth, 'x', container1.clientHeight);
    console.log('Container 2 dimensions:', container2.clientWidth, 'x', container2.clientHeight);
    console.log('Container 3 dimensions:', container3.clientWidth, 'x', container3.clientHeight);
}

// Debounce helper: returns a debounced version of fn
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced resize handler that re-initializes the dashboard after resize settles
const handleResize = debounce(() => { console.log('Window resized, updating dashboard...'); initializeDashboard(); }, 250);

// Attach global event listeners
window.addEventListener('resize', handleResize);
document.addEventListener('DOMContentLoaded', () => { initializeDashboard(); });
