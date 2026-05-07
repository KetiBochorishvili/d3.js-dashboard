/*
  main.js - Consolidated JavaScript for the D3 dashboard
  Combines: d3chart.js (Chart base), chart1.js (BarChart), chart2.js (ScatterPlot),
  chart3.js (ParallelCoordinates) and the dashboard initialization logic that was
  previously inline in index.html.

  This file is intended to be loaded after d3.v7.min.js in the HTML.
*/

/* ------------------------- Chart base (from scripts/d3chart.js) ------------------------- */
class Chart {
    constructor() {
        const attrs = {
            id: "ID" + Math.floor(Math.random() * 1000000),
            svgWidth: 400,
            svgHeight: 200,
            marginTop: 5,
            marginBottom: 5,
            marginRight: 5,
            marginLeft: 5,
            container: "body",
            defaultTextFill: "#2C3E50",
            defaultFont: "Helvetica",
            data: null,
            chartWidth: null,
            chartHeight: null
        };

        this.getState = () => attrs;
        this.setState = (d) => Object.assign(attrs, d);

        Object.keys(attrs).forEach((key) => {
            this[key] = function (_) {
                if (!arguments.length) {
                    return attrs[key];
                }
                attrs[key] = _;
                return this;
            };
        });

        this.initializeEnterExitUpdatePattern();
    }

    render() {
        this.setDynamicContainer();
        this.calculateProperties();
        this.drawSvgAndWrappers();
        this.drawRects();
        return this;
    }

    calculateProperties() {
        const { marginLeft, marginTop, marginRight, marginBottom, svgWidth, svgHeight } = this.getState();
        var calc = { id: null, chartTopMargin: null, chartLeftMargin: null, chartWidth: null, chartHeight: null };
        calc.id = "ID" + Math.floor(Math.random() * 1000000);
        calc.chartLeftMargin = marginLeft;
        calc.chartTopMargin = marginTop;
        const chartWidth = svgWidth - marginRight - calc.chartLeftMargin;
        const chartHeight = svgHeight - marginBottom - calc.chartTopMargin;
        this.setState({ calc, chartWidth, chartHeight });
    }

    drawRects() {
        const { chart, data, chartWidth, chartHeight } = this.getState();
        chart._add({ tag: "rect", selector: "rect-sample", data: [data] })
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("fill", (d) => d.color);
    }

    drawSvgAndWrappers() {
        const { d3Container, svgWidth, svgHeight, defaultFont, calc, data, chartWidth, chartHeight } = this.getState();
        const svg = d3Container._add({ tag: "svg", className: "svg-chart-container" })
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('font-family', defaultFont);
        var chart = svg._add({ tag: "g", className: "chart" })
            .attr('transform', 'translate(' + calc.chartLeftMargin + ',' + calc.chartTopMargin + ')');
        chart._add({ tag: "rect", selector: "rect-sample", data: [data] })
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('fill', (d) => d.color);
        this.setState({ chart, svg });
    }

    initializeEnterExitUpdatePattern() {
        d3.selection.prototype._add = function (params) {
            var container = this;
            var className = params.className;
            var elementTag = params.tag;
            var data = params.data || [className];
            var exitTransition = params.exitTransition || null;
            var enterTransition = params.enterTransition || null;
            var selection = container.selectAll('.' + className).data(data, (d, i) => {
                if (typeof d === 'object') {
                    if (d.id) return d.id;
                }
                return i;
            });
            if (exitTransition) {
                exitTransition(selection);
            } else {
                selection.exit().remove();
            }
            const enterSelection = selection.enter().append(elementTag);
            if (enterTransition) {
                enterTransition(enterSelection);
            }
            selection = enterSelection.merge(selection);
            selection.attr('class', className);
            return selection;
        };
    }

    setDynamicContainer() {
        const attrs = this.getState();
        var d3Container = d3.select(attrs.container);
        var containerRect = d3Container.node().getBoundingClientRect();
        if (containerRect.width > 0) attrs.svgWidth = containerRect.width;
        d3.select(window).on('resize.' + attrs.id, () => {
            var containerRect = d3Container.node().getBoundingClientRect();
            if (containerRect.width > 0) attrs.svgWidth = containerRect.width;
            this.render();
        });
        this.setState({ d3Container });
    }
}

/* ------------------------- Chart 1: BarChart (from scripts/chart1.js) ------------------------- */
class BarChart {
    constructor() {
        this.data = null;
        this.svg = null;
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        this.width = 0;
        this.height = 0;
    }

    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;
        if (!this.data || this.data.length === 0) { console.error('No data available for Chart 1'); return; }
        const dynamicMargins = {
            top: Math.max(40, containerHeight * 0.1),
            right: Math.max(40, containerWidth * 0.08),
            bottom: Math.max(60, containerHeight * 0.15),
            left: Math.max(60, containerWidth * 0.12)
        };
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;
        d3.select(containerId).selectAll('*').remove();
        this.svg = d3.select(containerId).append('svg').attr('width', containerWidth).attr('height', containerHeight);
        const g = this.svg.append('g').attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);
        const xScale = d3.scaleBand().domain(this.data.map(d => d.studytime)).range([0, this.width]).padding(0.3);
        const studyTimeLabels = {1: '<2', 2: '2-5', 3: '5-10', 4: '>10'};
        const yScale = d3.scaleLinear().domain([0, d3.max(this.data, d => d.avgG3) * 1.1]).range([this.height, 0]).nice();
        const colorScale = d3.scaleSequential().domain([1, 4]).interpolator(d3.interpolateBlues).clamp(true);
        g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.height})`).call(d3.axisBottom(xScale).tickFormat(d => studyTimeLabels[d] || d)).style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');
        g.append('g').attr('class', 'y-axis').call(d3.axisLeft(yScale)).style('font-size', Math.max(10, Math.min(14, containerHeight * 0.025)) + 'px');
        this.svg.append('text').attr('class', 'x-axis-label').attr('text-anchor', 'middle').attr('x', dynamicMargins.left + this.width / 2).attr('y', containerHeight - 10).style('font-size', Math.max(12, containerWidth * 0.02) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text('Weekly Study Time (hours/week)');
        this.svg.append('text').attr('class', 'y-axis-label').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('x', -(dynamicMargins.top + this.height / 2)).attr('y', 15).style('font-size', Math.max(12, containerHeight * 0.025) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text('Average Math Final Grade');
        const bars = g.selectAll('.bar').data(this.data).enter().append('rect').attr('class', 'bar').attr('x', d => xScale(d.studytime)).attr('y', d => yScale(d.avgG3)).attr('width', xScale.bandwidth()).attr('height', d => this.height - yScale(d.avgG3)).attr('fill', d => colorScale(d.studytime)).attr('stroke', '#2C3E50').attr('stroke-width', 1).style('opacity', 0.8);
        g.selectAll('.bar-label').data(this.data).enter().append('text').attr('class', 'bar-label').attr('text-anchor', 'middle').attr('x', d => xScale(d.studytime) + xScale.bandwidth() / 2).attr('y', d => yScale(d.avgG3) - 5).style('font-size', Math.max(10, Math.min(14, containerWidth * 0.02)) + 'px').style('font-weight', 'bold').style('fill', '#2C3E50').text(d => d.avgG3.toFixed(2));
        bars.on('mouseover', function(event, d) { d3.select(this).style('opacity', 1).attr('stroke-width', 2); }).on('mouseout', function(event, d) { d3.select(this).style('opacity', 0.8).attr('stroke-width', 1); });
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    addLegend(containerWidth, containerHeight, margins) {
        const legendData = [ { label: '<2 hours/week (1)', color: d3.interpolateBlues(0.4) }, { label: '2-5 hours/week (2)', color: d3.interpolateBlues(0.6) }, { label: '5-10 hours/week (3)', color: d3.interpolateBlues(0.8) }, { label: '>10 hours/week (4)', color: d3.interpolateBlues(1) } ];
        const legend = this.svg.append('g').attr('class', 'legend').attr('transform', `translate(${containerWidth - Math.max(150, containerWidth * 0.2)}, 0)`);
        legendData.forEach((item, i) => {
            const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
            legendRow.append('rect').attr('width', 15).attr('height', 15).attr('fill', item.color).attr('stroke', '#2C3E50').attr('stroke-width', 0.5);
            legendRow.append('text').attr('x', 20).attr('y', 12).style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px').style('fill', '#2C3E50').text(item.label);
        });
    }
}

/* ------------------------- Chart 2: ScatterPlot (from scripts/chart2.js) ------------------------- */
class ScatterPlot {
    constructor() {
        this.data = null;
        this.svg = null;
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        this.width = 0;
        this.height = 0;
    }

    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;
        if (!this.data || this.data.length === 0) { console.error('No data available for ScatterPlot'); return; }
        const dynamicMargins = { top: Math.max(40, containerHeight * 0.1), right: Math.max(40, containerWidth * 0.08), bottom: Math.max(60, containerHeight * 0.15), left: Math.max(60, containerWidth * 0.12) };
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;
        d3.select(containerId).selectAll('*').remove();
        this.svg = d3.select(containerId).append('svg').attr('width', containerWidth).attr('height', containerHeight);
        const g = this.svg.append('g').attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);
        const xScale = d3.scaleLinear().domain([0, d3.max(this.data, d => d.absences) + 2]).range([0, this.width]);
        const yScale = d3.scaleLinear().domain([0, 20]).range([this.height, 0]);
        g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.height})`).call(d3.axisBottom(xScale).ticks(10)).style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');
        g.append('g').attr('class', 'y-axis').call(d3.axisLeft(yScale).ticks(5)).style('font-size', Math.max(10, Math.min(14, containerHeight * 0.025)) + 'px');
        this.svg.append('text').attr('class', 'x-axis-label').attr('text-anchor', 'middle').attr('x', dynamicMargins.left + this.width / 2).attr('y', containerHeight - 10).style('font-size', Math.max(12, containerWidth * 0.02) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text('Number of School Absences');
        this.svg.append('text').attr('class', 'y-axis-label').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('x', -(dynamicMargins.top + this.height / 2)).attr('y', 15).style('font-size', Math.max(12, containerHeight * 0.025) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text('Math Final Grade');
        g.append('g').attr('class', 'grid grid--x').attr('transform', `translate(0,${this.height})`).call(d3.axisBottom(xScale).ticks(10).tickSize(-this.height).tickFormat('')).style('stroke', '#e0e0e0').style('stroke-opacity', 0.3);
        g.append('g').attr('class', 'grid grid--y').call(d3.axisLeft(yScale).ticks(5).tickSize(-this.width).tickFormat('')).style('stroke', '#e0e0e0').style('stroke-opacity', 0.3);
        const points = g.selectAll('.point').data(this.data).enter().append('circle').attr('class', 'point').attr('cx', d => xScale(d.absences)).attr('cy', d => yScale(d.G3)).attr('r', Math.max(3, Math.min(6, containerWidth * 0.008))).attr('fill', d => d.traveltimeGroup === 'Close' ? '#2196F3' : '#FF9800').attr('stroke', '#ffffff').attr('stroke-width', 1).style('opacity', 0.7);
        points.on('mouseover', function(event, d) { d3.select(this).attr('r', Math.max(4, Math.min(8, containerWidth * 0.01))).style('opacity', 1).attr('stroke-width', 2); }).on('mouseout', function(event, d) { d3.select(this).attr('r', Math.max(3, Math.min(6, containerWidth * 0.008))).style('opacity', 0.7).attr('stroke-width', 1); });
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    addLegend(containerWidth, containerHeight, margins) {
        const legendData = [ { label: 'Living Close (travel time < 30 minutes)', color: '#2196F3' }, { label: 'Living Far (travel time >30 minutes)', color: '#FF9800' } ];
        const legend = this.svg.append('g').attr('class', 'legend').attr('transform', `translate(${containerWidth - Math.max(280, containerWidth * 0.35)}, 0)`);
        legendData.forEach((item, i) => { const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 25})`); legendRow.append('circle').attr('cx', 8).attr('cy', 8).attr('r', 6).attr('fill', item.color).attr('stroke', '#ffffff').attr('stroke-width', 1); legendRow.append('text').attr('x', 20).attr('y', 12).style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px').style('fill', '#2C3E50').text(item.label); });
    }
}

/* ------------------------- Chart 3: ParallelCoordinates (from scripts/chart3.js) ------------------------- */
class ParallelCoordinates {
    constructor() {
        this.data = null;
        this.svg = null;
        this.margin = { top: 60, right: 40, bottom: 40, left: 40 };
        this.width = 0;
        this.height = 0;
    }

    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;
        if (!this.data || this.data.length === 0) { console.error('No data available for Parallel Coordinates'); return; }
        const dynamicMargins = { top: Math.max(60, containerHeight * 0.12), right: Math.max(40, containerWidth * 0.05), bottom: Math.max(100, containerHeight * 0.2), left: Math.max(40, containerWidth * 0.05) };
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;
        d3.select(containerId).selectAll('*').remove();
        this.svg = d3.select(containerId).append('svg').attr('width', containerWidth).attr('height', containerHeight);
        const g = this.svg.append('g').attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);
        const dimensions = ['health', 'studytime', 'absences', 'failures', 'famrel', 'G3'];
        const yScales = {};
        dimensions.forEach(dim => { yScales[dim] = d3.scaleLinear().domain(d3.extent(this.data, d => d[dim])).range([this.height, 0]).nice(); });
        const xScale = d3.scalePoint().domain(dimensions).range([0, this.width]).padding(0.1);
        const colorScale = d3.scaleOrdinal().domain([1,2,3,4,5]).range(['#A63B28','#3156AD','#1D7332','#EBED0E','#D10DB3']);
        const line = d3.line();
        const path = d => line(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])]));
        const dalcGroups = [1,2,3,4,5];
        const averageData = dalcGroups.map(dalcValue => { const groupData = this.data.filter(d => d.Dalc === dalcValue); if (groupData.length === 0) return null; const avgPoint = { Dalc: dalcValue }; dimensions.forEach(dim => { avgPoint[dim] = d3.mean(groupData, d => d[dim]); }); return avgPoint; }).filter(d => d !== null);
        g.append('g').attr('class', 'average-lines').selectAll('path').data(averageData).enter().append('path').attr('d', path).style('fill', 'none').style('stroke', d => colorScale(d.Dalc)).style('stroke-width', 4).style('opacity', 0.9);
        const axes = g.selectAll('.dimension').data(dimensions).enter().append('g').attr('class', 'dimension').attr('transform', d => `translate(${xScale(d)},0)`);
        axes.append('g').each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5)); }).style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px');
        axes.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').attr('y', this.height + 35).style('font-size', Math.max(11, Math.min(14, containerWidth * 0.018)) + 'px').style('font-weight', '600').style('fill', '#2C3E50').text(d => { const labels = { 'health':'Health Status','studytime':'Study Time','absences':'Absences','failures':'Failures','famrel':'Family Relations','G3':'Final Grade' }; return labels[d]; });
        axes.append('text').attr('class', 'axis-explanation').attr('text-anchor', 'middle').attr('y', this.height + 55).style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px').style('fill', '#666').text(d => { const explanations = { 'health':'1=very bad, 5=very good','studytime':'1=<2h, 2=2-5h, 3=5-10h, 4=>10h','absences':'0-93 absences','failures':'past failures (max 4)','famrel':'1=very bad, 5=excellent','G3':'grade 0-20' }; return explanations[d]; });
        this.addLegend(containerWidth, containerHeight, dynamicMargins, colorScale);
    }

    addLegend(containerWidth, containerHeight, margins, colorScale) {
        const legend = this.svg.append('g').attr('class', 'legend').attr('transform', `translate(${margins.left}, 10)`);
        legend.append('text').attr('x', 0).attr('y', 12).style('font-size', Math.max(10, Math.min(13, containerWidth * 0.016)) + 'px').style('fill', '#2C3E50').style('font-weight', '600').text('Average Values by Daily Alcohol Consumption Level');
        const dalcLegendData = [ { value:1, label:'Dalc: 1' },{ value:2, label:'Dalc: 2' },{ value:3, label:'Dalc: 3' },{ value:4, label:'Dalc: 4' },{ value:5, label:'Dalc: 5' } ];
        const colorLegend = legend.append('g').attr('transform', 'translate(350, 0)');
        dalcLegendData.forEach((item, i) => { const legendRow = colorLegend.append('g').attr('transform', `translate(${i * 70}, 0)`); legendRow.append('line').attr('x1', 0).attr('x2', 25).attr('y1', 8).attr('y2', 8).attr('stroke', colorScale(item.value)).attr('stroke-width', 4); legendRow.append('text').attr('x', 30).attr('y', 12).style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px').style('fill', '#2C3E50').text(item.value); });
        legend.append('text').attr('x', 0).attr('y', 30).style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px').style('fill', '#666').style('font-style', 'italic').text(`Based on ${this.data.length} students. Each line shows average values for a Dalc level.`);
    }
}

/* ------------------------- Dashboard initialization (previously inline in index.html) ------------------------- */
// Object to store chart instances for all three visualizations
let charts = {};
// Variable to store loaded CSV data globally to avoid reloading
let rawData = null;

// Function to load CSV data once and cache it
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

// Process data for Chart 1
function processChart1Data(data) {
    const groupedData = d3.rollup(data, v => d3.mean(v, d => +d.G3), d => +d.studytime);
    return Array.from(groupedData, ([studytime, avgG3]) => ({ studytime: studytime, avgG3: avgG3 })).sort((a, b) => a.studytime - b.studytime);
}

// Process data for Chart 2
function processChart2Data(data) {
    return data.map(d => ({ absences: +d.absences, G3: +d.G3, traveltime: +d.traveltime, traveltimeGroup: (+d.traveltime === 1 || +d.traveltime === 2) ? 'Close' : 'Far' })).filter(d => !isNaN(d.absences) && !isNaN(d.G3) && !isNaN(d.traveltime));
}

// Process data for Chart 3
function processChart3Data(data) {
    return data.map(d => ({ health: +d.health, studytime: +d.studytime, absences: +d.absences, failures: +d.failures, famrel: +d.famrel, G3: +d.G3, Dalc: +d.Dalc, sex: d.sex, address: d.address })).filter(d => !isNaN(d.health) && !isNaN(d.studytime) && !isNaN(d.absences) && !isNaN(d.failures) && !isNaN(d.famrel) && !isNaN(d.G3) && !isNaN(d.Dalc));
}

// Initialize or update all three charts
async function initializeDashboard() {
    const container1 = document.getElementById('chart-1');
    const container2 = document.getElementById('chart-2');
    const container3 = document.getElementById('chart-3');
    d3.select('#chart-1').selectAll('*').remove();
    d3.select('#chart-2').selectAll('*').remove();
    d3.select('#chart-3').selectAll('*').remove();
    const data = await loadData();
    if (!data) { console.error('Failed to load data'); return; }
    const chart1Data = processChart1Data(data);
    const chart2Data = processChart2Data(data);
    const chart3Data = processChart3Data(data);
    if (!charts.chart1) charts.chart1 = new BarChart();
    charts.chart1.render('#chart-1', container1.clientWidth, container1.clientHeight, chart1Data);
    if (!charts.chart2) charts.chart2 = new ScatterPlot();
    charts.chart2.render('#chart-2', container2.clientWidth, container2.clientHeight, chart2Data);
    if (!charts.chart3) charts.chart3 = new ParallelCoordinates();
    charts.chart3.render('#chart-3', container3.clientWidth, container3.clientHeight, chart3Data);
    console.log('Dashboard initialized');
    console.log('Container 1 dimensions:', container1.clientWidth, 'x', container1.clientHeight);
    console.log('Container 2 dimensions:', container2.clientWidth, 'x', container2.clientHeight);
    console.log('Container 3 dimensions:', container3.clientWidth, 'x', container3.clientHeight);
}

// Debounce helper
function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; }

// Debounced resize handler
const handleResize = debounce(() => { console.log('Window resized, updating dashboard...'); initializeDashboard(); }, 250);

// Attach event listeners
window.addEventListener('resize', handleResize);
document.addEventListener('DOMContentLoaded', () => { initializeDashboard(); });
