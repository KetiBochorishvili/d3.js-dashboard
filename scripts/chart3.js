// Chart 3: Parallel Coordinates Chart - Multiple Variables by Gender
class ParallelCoordinates {
    constructor() {
        this.data = null;
        this.svg = null;
        this.margin = { top: 60, right: 40, bottom: 40, left: 40 };
        this.width = 0;
        this.height = 0;
    }

    render(containerId, containerWidth, containerHeight, data) {
        // Set the data
        this.data = data;

        if (!this.data || this.data.length === 0) {
            console.error('No data available for Parallel Coordinates');
            return;
        }

        // Calculate dynamic margins based on container size
        const dynamicMargins = {
            top: Math.max(60, containerHeight * 0.12),
            right: Math.max(40, containerWidth * 0.05),
            bottom: Math.max(100, containerHeight * 0.2), // Increased bottom margin for explanations
            left: Math.max(40, containerWidth * 0.05)
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

        // Define dimensions for parallel coordinates
        const dimensions = ['health', 'studytime', 'absences', 'failures', 'famrel', 'G3'];
        
        // Create scales for each dimension
        const yScales = {};
        dimensions.forEach(dim => {
            yScales[dim] = d3.scaleLinear()
                .domain(d3.extent(this.data, d => d[dim]))
                .range([this.height, 0])
                .nice();
        });

        // X scale for positioning axes
        const xScale = d3.scalePoint()
            .domain(dimensions)
            .range([0, this.width])
            .padding(0.1);

        // Color scale based on Dalc values (1-5)
        const colorScale = d3.scaleOrdinal()
            .domain([1, 2, 3, 4, 5])
            .range(['#A63B28', '#3156AD', '#1D7332', '#EBED0E', '#D10DB3']); // Red, Blue, Green, Yellow, Pink

        // Line generator
        const line = d3.line();
        const path = d => line(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])]));

        // Calculate averages for each Dalc group
        const dalcGroups = [1, 2, 3, 4, 5];
        const averageData = dalcGroups.map(dalcValue => {
            const groupData = this.data.filter(d => d.Dalc === dalcValue);
            if (groupData.length === 0) return null;
            
            const avgPoint = { Dalc: dalcValue };
            dimensions.forEach(dim => {
                avgPoint[dim] = d3.mean(groupData, d => d[dim]);
            });
            return avgPoint;
        }).filter(d => d !== null);

        // Add average lines for each Dalc group
        g.append('g')
            .attr('class', 'average-lines')
            .selectAll('path')
            .data(averageData)
            .enter()
            .append('path')
            .attr('d', path)
            .style('fill', 'none')
            .style('stroke', d => colorScale(d.Dalc))
            .style('stroke-width', 4)
            .style('opacity', 0.9);

        // Add axes
        const axes = g.selectAll('.dimension')
            .data(dimensions)
            .enter()
            .append('g')
            .attr('class', 'dimension')
            .attr('transform', d => `translate(${xScale(d)},0)`);

        // Add axis lines
        axes.append('g')
            .each(function(d) {
                d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5));
            })
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px');

        // Add axis labels (at the bottom)
        axes.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('y', this.height + 35)
            .style('font-size', Math.max(11, Math.min(14, containerWidth * 0.018)) + 'px')
            .style('font-weight', '600')
            .style('fill', '#2C3E50')
            .text(d => {
                const labels = {
                    'health': 'Health Status',
                    'studytime': 'Study Time',
                    'absences': 'Absences',
                    'failures': 'Failures',
                    'famrel': 'Family Relations',
                    'G3': 'Final Grade'
                };
                return labels[d];
            });

        // Add explanations below axis labels
        axes.append('text')
            .attr('class', 'axis-explanation')
            .attr('text-anchor', 'middle')
            .attr('y', this.height + 55)
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px')
            .style('fill', '#666')
            .text(d => {
                const explanations = {
                    'health': '1=very bad, 5=very good',
                    'studytime': '1=<2h, 2=2-5h, 3=5-10h, 4=>10h',
                    'absences': '0-93 absences',
                    'failures': 'past failures (max 4)',
                    'famrel': '1=very bad, 5=excellent',
                    'G3': 'grade 0-20'
                };
                return explanations[d];
            });

        // Add legend
        this.addLegend(containerWidth, containerHeight, dynamicMargins, colorScale);
    }

    addLegend(containerWidth, containerHeight, margins, colorScale) {
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${margins.left}, 10)`);

        // Add title/description
        legend.append('text')
            .attr('x', 0)
            .attr('y', 12)
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.016)) + 'px')
            .style('fill', '#2C3E50')
            .style('font-weight', '600')
            .text('Average Values by Daily Alcohol Consumption Level');

        // Add color legend for Dalc values
        const dalcLegendData = [
            { value: 1, label: 'Dalc: 1' },
            { value: 2, label: 'Dalc: 2' },
            { value: 3, label: 'Dalc: 3' },
            { value: 4, label: 'Dalc: 4' },
            { value: 5, label: 'Dalc: 5' }
        ];

        const colorLegend = legend.append('g')
            .attr('transform', 'translate(350, 0)');

        dalcLegendData.forEach((item, i) => {
            const legendRow = colorLegend.append('g')
                .attr('transform', `translate(${i * 70}, 0)`);

            legendRow.append('line')
                .attr('x1', 0)
                .attr('x2', 25)
                .attr('y1', 8)
                .attr('y2', 8)
                .attr('stroke', colorScale(item.value))
                .attr('stroke-width', 4);

            legendRow.append('text')
                .attr('x', 30)
                .attr('y', 12)
                .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px')
                .style('fill', '#2C3E50')
                .text(item.value);
        });

        // Add note
        legend.append('text')
            .attr('x', 0)
            .attr('y', 30)
            .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px')
            .style('fill', '#666')
            .style('font-style', 'italic')
            .text(`Based on ${this.data.length} students. Each line shows average values for a Dalc level.`);
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParallelCoordinates;
}
