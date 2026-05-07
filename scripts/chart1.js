// Chart 1: Bar chart displaying average math grade grouped by weekly study time
// BarChart class encapsulates all rendering logic and state management
class BarChart {
    // Constructor - Initialize chart with null/empty values
    constructor() {
        this.data = null;               // Will hold the processed data array
        this.svg = null;                // Will hold the D3 SVG selection
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };  // Default margins (fallback values)
        this.width = 0;                 // Chart width (calculated dynamically)
        this.height = 0;                // Chart height (calculated dynamically)
    }

    // Main render method - Creates/updates the visualization
    // containerId: CSS selector for container element
    // containerWidth: Total width available for chart
    // containerHeight: Total height available for chart
    // data: Array of objects with {studytime, avgG3} properties
    render(containerId, containerWidth, containerHeight, data) {
        // Store reference to data
        this.data = data;

        // Validate data exists before rendering
        if (!this.data || this.data.length === 0) {
            console.error('No data available for Chart 1');  // Log error if data is missing
            return;  // Exit early if no data
        }

        // Calculate dynamic margins based on container size for responsive design
        // Use percentage of container size with minimum values to ensure usability
        const dynamicMargins = {
            top: Math.max(40, containerHeight * 0.1),      // 10% of height, minimum 40px
            right: Math.max(40, containerWidth * 0.08),     // 8% of width, minimum 40px
            bottom: Math.max(60, containerHeight * 0.15),   // 15% of height, minimum 60px (extra space for axis labels)
            left: Math.max(60, containerWidth * 0.12)       // 12% of width, minimum 60px (space for y-axis values)
        };

        // Recalculate chart dimensions by subtracting margins from container size
        this.width = containerWidth - dynamicMargins.left - dynamicMargins.right;    // Inner width for plotting
        this.height = containerHeight - dynamicMargins.top - dynamicMargins.bottom;  // Inner height for plotting

        // Clear any existing SVG elements to prevent duplicates on resize
        d3.select(containerId).selectAll('*').remove();

        // Create new SVG element with full container dimensions
        this.svg = d3.select(containerId)  // Select container by ID
            .append('svg')                  // Add SVG element
            .attr('width', containerWidth)  // Set total width
            .attr('height', containerHeight);  // Set total height

        // Create a group element (g) and translate it to account for margins
        // This creates a coordinate system where (0,0) is the top-left of the chart area
        const g = this.svg.append('g')
            .attr('transform', `translate(${dynamicMargins.left},${dynamicMargins.top})`);

        // Create X scale - Maps study time values (1-4) to horizontal positions
        // scaleBand creates discrete bands for categorical data
        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.studytime))  // Input domain: study time values from data
            .range([0, this.width])                    // Output range: horizontal pixel positions
            .padding(0.3);                             // 30% padding between bars

        // Custom labels for study time axis - Maps numeric codes to readable time ranges
        const studyTimeLabels = {
            1: '<2',      // Less than 2 hours per week
            2: '2-5',     // 2 to 5 hours per week
            3: '5-10',    // 5 to 10 hours per week
            4: '>10'      // More than 10 hours per week
        };

        // Create Y scale - Maps grade values to vertical positions
        // scaleLinear creates continuous scale for quantitative data
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.avgG3) * 1.1])  // Start at 0, end 10% above max grade
            .range([this.height, 0])                              // Output range: vertical pixels (inverted: bottom to top)
            .nice();                                              // Extend domain to round numbers

        // Create color scale - Maps study time to shades of blue
        // More study time results in darker blue
        const colorScale = d3.scaleSequential()
            .domain([1, 4])                         // Input domain: study time range
            .interpolator(d3.interpolateBlues)      // Color interpolator: light to dark blue
            .clamp(true);                           // Clamp values outside domain to boundary colors

        // Add X axis to bottom of chart
        g.append('g')                               // Create group for x-axis
            .attr('class', 'x-axis')                // Add CSS class for styling
            .attr('transform', `translate(0,${this.height})`)  // Move to bottom of chart
            .call(d3.axisBottom(xScale)             // Create bottom-oriented axis
                .tickFormat(d => studyTimeLabels[d] || d))  // Use custom labels, fallback to raw value
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');  // Responsive font size

        // Add Y axis to left side of chart
        g.append('g')                               // Create group for y-axis
            .attr('class', 'y-axis')                // Add CSS class for styling
            .call(d3.axisLeft(yScale))              // Create left-oriented axis with default ticks
            .style('font-size', Math.max(10, Math.min(14, containerHeight * 0.025)) + 'px');  // Responsive font size

        // Add X axis label at bottom center
        this.svg.append('text')
            .attr('class', 'x-axis-label')          // CSS class for styling
            .attr('text-anchor', 'middle')          // Center text horizontally
            .attr('x', dynamicMargins.left + this.width / 2)  // Position at horizontal center
            .attr('y', containerHeight - 10)        // Position near bottom of container
            .style('font-size', Math.max(12, containerWidth * 0.02) + 'px')  // Responsive font size
            .style('font-weight', '600')            // Semi-bold text
            .style('fill', '#2C3E50')               // Dark blue-gray color
            .text('Weekly Study Time (hours/week)');  // Label text

        // Add Y axis label on left side (rotated)
        this.svg.append('text')
            .attr('class', 'y-axis-label')          // CSS class for styling
            .attr('text-anchor', 'middle')          // Center text after rotation
            .attr('transform', 'rotate(-90)')       // Rotate -90 degrees for vertical orientation
            .attr('x', -(dynamicMargins.top + this.height / 2))  // Position at vertical center (negative due to rotation)
            .attr('y', 15)                          // Distance from left edge
            .style('font-size', Math.max(12, containerHeight * 0.025) + 'px')  // Responsive font size
            .style('font-weight', '600')            // Semi-bold text
            .style('fill', '#2C3E50')               // Dark blue-gray color
            .text('Average Math Final Grade');      // Label text

        // Create bars for each data point
        const bars = g.selectAll('.bar')           // Select all elements with class 'bar' (none exist yet)
            .data(this.data)                        // Bind data array to selection
            .enter()                                // Get enter selection (data without matching DOM elements)
            .append('rect')                         // Append rectangle for each data point
            .attr('class', 'bar')                   // Add CSS class
            .attr('x', d => xScale(d.studytime))    // Set x position using scale
            .attr('y', d => yScale(d.avgG3))        // Set y position (top of bar)
            .attr('width', xScale.bandwidth())      // Set width to band width from scale
            .attr('height', d => this.height - yScale(d.avgG3))  // Calculate height from bottom to y position
            .attr('fill', d => colorScale(d.studytime))  // Fill color based on study time
            .attr('stroke', '#2C3E50')              // Dark border color
            .attr('stroke-width', 1)                // Border width
            .style('opacity', 0.8);                 // Slight transparency

        // Add value labels on top of each bar
        g.selectAll('.bar-label')                  // Select all elements with class 'bar-label'
            .data(this.data)                        // Bind data array
            .enter()                                // Get enter selection
            .append('text')                         // Append text element for each data point
            .attr('class', 'bar-label')             // Add CSS class
            .attr('text-anchor', 'middle')          // Center text horizontally
            .attr('x', d => xScale(d.studytime) + xScale.bandwidth() / 2)  // Position at center of bar
            .attr('y', d => yScale(d.avgG3) - 5)    // Position above bar (5px margin)
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.02)) + 'px')  // Responsive font
            .style('font-weight', 'bold')           // Bold text
            .style('fill', '#2C3E50')               // Dark color
            .text(d => d.avgG3.toFixed(2));         // Display grade rounded to 2 decimal places

        // Add hover interaction for bars
        bars.on('mouseover', function(event, d) {  // Mouse enter event
            d3.select(this)                         // Select current bar
                .style('opacity', 1)                // Full opacity on hover
                .attr('stroke-width', 2);           // Thicker border on hover
        })
        .on('mouseout', function(event, d) {       // Mouse leave event
            d3.select(this)                         // Select current bar
                .style('opacity', 0.8)              // Return to default opacity
                .attr('stroke-width', 1);           // Return to default border width
        });

        // Add legend explaining color coding
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    // Create and position legend showing study time categories
    // containerWidth: Full width of SVG container
    // containerHeight: Full height of SVG container
    // margins: Object with top, right, bottom, left margin values
    addLegend(containerWidth, containerHeight, margins) {
        // Define legend items with labels and corresponding colors
        const legendData = [
            { label: '<2 hours/week (1)', color: d3.interpolateBlues(0.4) },      // Lightest blue
            { label: '2-5 hours/week (2)', color: d3.interpolateBlues(0.6) },     // Light-medium blue
            { label: '5-10 hours/week (3)', color: d3.interpolateBlues(0.8) },    // Medium-dark blue
            { label: '>10 hours/week (4)', color: d3.interpolateBlues(1) }        // Darkest blue
        ];

        // Create legend group and position it in top-right area
        const legend = this.svg.append('g')
            .attr('class', 'legend')                // CSS class for styling
            .attr('transform', `translate(${containerWidth - Math.max(150, containerWidth * 0.2)}, 0)`);  // Position from right edge

        // Create legend items (colored rectangle + label) for each entry
        legendData.forEach((item, i) => {
            // Create group for each legend item
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);  // Stack items vertically with 20px spacing

            // Add colored rectangle showing the color
            legendRow.append('rect')
                .attr('width', 15)                  // Rectangle width
                .attr('height', 15)                 // Rectangle height
                .attr('fill', item.color)           // Fill with corresponding color
                .attr('stroke', '#2C3E50')          // Dark border
                .attr('stroke-width', 0.5);         // Thin border

            // Add text label next to rectangle
            legendRow.append('text')
                .attr('x', 20)                      // Position to right of rectangle
                .attr('y', 12)                      // Vertical alignment with rectangle
                .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px')  // Responsive font
                .style('fill', '#2C3E50')           // Dark color
                .text(item.label);                  // Display label text
        });
    }
}

// Export for use in main script (CommonJS module pattern)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarChart;  // Export class for Node.js environments
}
