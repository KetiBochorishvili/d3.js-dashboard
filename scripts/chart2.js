// Chart 2: Scatterplot of Alcohol Consumption vs Math Grade by Urban/Rural
class ScatterPlot {
    constructor() {
        this.data = null;
        this.svg = null;
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        this.width = 0;
        this.height = 0;
    }

    render(containerId, containerWidth, containerHeight, data) {
        // Set the data
        this.data = data;

        if (!this.data || this.data.length === 0) {
            console.error('No data available for ScatterPlot');
            return;
        }

        // Calculate dynamic margins based on container size
        const dynamicMargins = {
            top: Math.max(40, containerHeight * 0.1),
            right: Math.max(40, containerWidth * 0.08),
            bottom: Math.max(60, containerHeight * 0.15),
            left: Math.max(60, containerWidth * 0.12)
        };

        // Recalculate dimensions with dynamic margins
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;

        // Clear any existing SVG
        d3.select(containerId).selectAll('*').remove();

        // Create SVG
        this.svg = d3.select(containerId)
            .append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        const g = this.svg.append('g')
            .attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.absences) + 2]) // Absences with padding
            .range([0, this.width]);

        const yScale = d3.scaleLinear()
            .domain([0, 20]) // G3 ranges from 0-20
            .range([this.height, 0]);

        // Add X axis
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale)
                .ticks(10))
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');

        // Add Y axis
        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).ticks(5))
            .style('font-size', Math.max(10, Math.min(14, containerHeight * 0.025)) + 'px');

        // Add X axis label
        this.svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', dynamicMargins.left + this.width / 2)
            .attr('y', containerHeight - 10)
            .style('font-size', Math.max(12, containerWidth * 0.02) + 'px')
            .style('font-weight', '600')
            .style('fill', '#2C3E50')
            .text('Number of School Absences');

        // Add Y axis label
        this.svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(dynamicMargins.top + this.height / 2))
            .attr('y', 15)
            .style('font-size', Math.max(12, containerHeight * 0.025) + 'px')
            .style('font-weight', '600')
            .style('fill', '#2C3E50')
            .text('Math Final Grade');

        // Add grid lines for better readability
        g.append('g')
            .attr('class', 'grid grid--x')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale)
                .ticks(10)
                .tickSize(-this.height)
                .tickFormat('')
            )
            .style('stroke', '#e0e0e0')
            .style('stroke-opacity', 0.3);

        g.append('g')
            .attr('class', 'grid grid--y')
            .call(d3.axisLeft(yScale)
                .ticks(5)
                .tickSize(-this.width)
                .tickFormat('')
            )
            .style('stroke', '#e0e0e0')
            .style('stroke-opacity', 0.3);

        // Add points
        const points = g.selectAll('.point')
            .data(this.data)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(d.absences))
            .attr('cy', d => yScale(d.G3))
            .attr('r', Math.max(3, Math.min(6, containerWidth * 0.008)))
            .attr('fill', d => d.traveltimeGroup === 'Close' ? '#2196F3' : '#FF9800') // Blue for living close, Orange for living far
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1)
            .style('opacity', 0.7);

        // Add tooltip on hover
        points.on('mouseover', function(event, d) {
            d3.select(this)
                .attr('r', Math.max(4, Math.min(8, containerWidth * 0.01)))
                .style('opacity', 1)
                .attr('stroke-width', 2);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .attr('r', Math.max(3, Math.min(6, containerWidth * 0.008)))
                .style('opacity', 0.7)
                .attr('stroke-width', 1);
        });

        // Add legend
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    addLegend(containerWidth, containerHeight, margins) {
        const legendData = [
            { label: 'Living Close (travel time < 30 minutes)', color: '#2196F3' },
            { label: 'Living Far (travel time >30 minutes)', color: '#FF9800' }
        ];

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${containerWidth - Math.max(280, containerWidth * 0.35)}, 0)`);

        legendData.forEach((item, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            legendRow.append('circle')
                .attr('cx', 8)
                .attr('cy', 8)
                .attr('r', 6)
                .attr('fill', item.color)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 1);

            legendRow.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px')
                .style('fill', '#2C3E50')
                .text(item.label);
        });
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScatterPlot;
}
