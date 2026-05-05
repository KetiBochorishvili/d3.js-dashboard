// Chart 1: Average Math Grade by Study Time
class BarChart {
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
            console.error('No data available for Chart 1');
            return;
        }

        // Calculate dynamic margins based on container size
        const dynamicMargins = {
            top: Math.max(40, containerHeight * 0.1),
            right: Math.max(40, containerWidth * 0.08),
            bottom: Math.max(60, containerHeight * 0.15), // Increase bottom margin for x-axis
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
        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.studytime))
            .range([0, this.width])
            .padding(0.3);

        // Custom tick format for study time labels
        const studyTimeLabels = {
            1: '<2',
            2: '2-5',
            3: '5-10',
            4: '>10'
        };

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.avgG3) * 1.1]) // Add 10% padding
            .range([this.height, 0])
            .nice();

        // Create color scale
        const colorScale = d3.scaleSequential()
            .domain([1, 4])
            .interpolator(d3.interpolateBlues) // More study time = darker blue
            .clamp(true);

        // Add X axis
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => studyTimeLabels[d] || d))
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');

        // Add Y axis
        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale))
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
            .text('Weekly Study Time (hours/week)');

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
            .text('Average Math Final Grade');

        // Add bars
        const bars = g.selectAll('.bar')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.studytime))
            .attr('y', d => yScale(d.avgG3))
            .attr('width', xScale.bandwidth())
            .attr('height', d => this.height - yScale(d.avgG3))
            .attr('fill', d => colorScale(d.studytime)) // More study time = darker blue
            .attr('stroke', '#2C3E50')
            .attr('stroke-width', 1)
            .style('opacity', 0.8);

        // Add value labels on top of bars
        g.selectAll('.bar-label')
            .data(this.data)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('text-anchor', 'middle')
            .attr('x', d => xScale(d.studytime) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.avgG3) - 5)
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.02)) + 'px')
            .style('font-weight', 'bold')
            .style('fill', '#2C3E50')
            .text(d => d.avgG3.toFixed(2));

        // Add tooltip on hover
        bars.on('mouseover', function(event, d) {
            d3.select(this)
                .style('opacity', 1)
                .attr('stroke-width', 2);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .style('opacity', 0.8)
                .attr('stroke-width', 1);
        });

        // Add legend
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    addLegend(containerWidth, containerHeight, margins) {
        const legendData = [
            { label: '<2 hours/week (1)', color: d3.interpolateBlues(0.4) },
            { label: '2-5 hours/week (2)', color: d3.interpolateBlues(0.6) },
            { label: '5-10 hours/week (3)', color: d3.interpolateBlues(0.8) },
            { label: '>10 hours/week (4)', color: d3.interpolateBlues(1) }
        ];

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${containerWidth - Math.max(150, containerWidth * 0.2)}, 0)`);

        legendData.forEach((item, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            legendRow.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', item.color)
                .attr('stroke', '#2C3E50')
                .attr('stroke-width', 0.5);

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
    module.exports = BarChart;
}
