// Chart 2: Scatterplot displaying relationship between absences and final grade, grouped by travel time
// ScatterPlot class encapsulates all rendering logic and state management
class ScatterPlot {
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
    // data: Array of objects with {absences, G3, traveltimeGroup} properties
    render(containerId, containerWidth, containerHeight, data) {
        // Store reference to data
        this.data = data;

        // Validate data exists before rendering
        if (!this.data || this.data.length === 0) {
            console.error('No data available for ScatterPlot');  // Log error if data is missing
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

        // Create X scale - Maps number of absences to horizontal positions
        // scaleLinear creates continuous scale for quantitative data
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.absences) + 2])  // Start at 0, end 2 units above max absences
            .range([0, this.width]);                               // Output range: horizontal pixel positions

        // Create Y scale - Maps final grade (G3) to vertical positions
        // scaleLinear creates continuous scale for quantitative data
        const yScale = d3.scaleLinear()
            .domain([0, 20])                // Grade range is 0-20
            .range([this.height, 0]);       // Output range: vertical pixels (inverted: bottom to top)

        // Add X axis to bottom of chart
        g.append('g')                       // Create group for x-axis
            .attr('class', 'x-axis')        // Add CSS class for styling
            .attr('transform', `translate(0,${this.height})`)  // Move to bottom of chart
            .call(d3.axisBottom(xScale)     // Create bottom-oriented axis
                .ticks(10))                 // Suggest approximately 10 tick marks
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.025)) + 'px');  // Responsive font size

        // Add Y axis to left side of chart
        g.append('g')                       // Create group for y-axis
            .attr('class', 'y-axis')        // Add CSS class for styling
            .call(d3.axisLeft(yScale).ticks(5))  // Create left-oriented axis with 5 tick marks
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
            .text('Number of School Absences');     // Label text

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
            .text('Math Final Grade');              // Label text

        // Add horizontal grid lines for better readability
        g.append('g')                               // Create group for x-axis grid
            .attr('class', 'grid grid--x')          // Add CSS classes
            .attr('transform', `translate(0,${this.height})`)  // Position at bottom
            .call(d3.axisBottom(xScale)             // Create bottom axis as base
                .ticks(10)                          // Match number of ticks with x-axis
                .tickSize(-this.height)             // Extend tick lines upward to create grid
                .tickFormat('')                     // Remove tick labels (we only want lines)
            )
            .style('stroke', '#e0e0e0')             // Light gray grid lines
            .style('stroke-opacity', 0.3);          // Make lines subtle

        // Add vertical grid lines for better readability
        g.append('g')                               // Create group for y-axis grid
            .attr('class', 'grid grid--y')          // Add CSS classes
            .call(d3.axisLeft(yScale)               // Create left axis as base
                .ticks(5)                           // Match number of ticks with y-axis
                .tickSize(-this.width)              // Extend tick lines rightward to create grid
                .tickFormat('')                     // Remove tick labels (we only want lines)
            )
            .style('stroke', '#e0e0e0')             // Light gray grid lines
            .style('stroke-opacity', 0.3);          // Make lines subtle

        // Create scatter plot points for each data point
        const points = g.selectAll('.point')       // Select all elements with class 'point' (none exist yet)
            .data(this.data)                        // Bind data array to selection
            .enter()                                // Get enter selection (data without matching DOM elements)
            .append('circle')                       // Append circle for each data point
            .attr('class', 'point')                 // Add CSS class
            .attr('cx', d => xScale(d.absences))    // Set x position using absences value
            .attr('cy', d => yScale(d.G3))          // Set y position using final grade
            .attr('r', Math.max(3, Math.min(6, containerWidth * 0.008)))  // Responsive radius size
            .attr('fill', d => d.traveltimeGroup === 'Close' ? '#2196F3' : '#FF9800')  // Blue for close, Orange for far
            .attr('stroke', '#ffffff')              // White border around points
            .attr('stroke-width', 1)                // Border width
            .style('opacity', 0.7);                 // Slight transparency to show overlapping points

        // Add hover interaction for points
        points.on('mouseover', function(event, d) {  // Mouse enter event
            d3.select(this)                          // Select current point
                .attr('r', Math.max(4, Math.min(8, containerWidth * 0.01)))  // Increase radius on hover
                .style('opacity', 1)                 // Full opacity on hover
                .attr('stroke-width', 2);            // Thicker border on hover
        })
        .on('mouseout', function(event, d) {        // Mouse leave event
            d3.select(this)                          // Select current point
                .attr('r', Math.max(3, Math.min(6, containerWidth * 0.008)))  // Return to default radius
                .style('opacity', 0.7)               // Return to default opacity
                .attr('stroke-width', 1);            // Return to default border width
        });

        // Add legend explaining point colors
        this.addLegend(containerWidth, containerHeight, dynamicMargins);
    }

    // Create and position legend showing travel time categories
    // containerWidth: Full width of SVG container
    // containerHeight: Full height of SVG container
    // margins: Object with top, right, bottom, left margin values
    addLegend(containerWidth, containerHeight, margins) {
        // Define legend items with labels and corresponding colors
        const legendData = [
            { label: 'Living Close (travel time < 30 minutes)', color: '#2196F3' },  // Blue for short travel time (1-2)
            { label: 'Living Far (travel time >30 minutes)', color: '#FF9800' }      // Orange for long travel time (3-4)
        ];

        // Create legend group and position it in top area with adequate space from right edge
        const legend = this.svg.append('g')
            .attr('class', 'legend')                // CSS class for styling
            .attr('transform', `translate(${containerWidth - Math.max(280, containerWidth * 0.35)}, 0)`);  // Position from right, leaving room for labels

        // Create legend items (colored circle + label) for each entry
        legendData.forEach((item, i) => {
            // Create group for each legend item
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);  // Stack items vertically with 25px spacing

            // Add colored circle showing the point color
            legendRow.append('circle')
                .attr('cx', 8)                      // Circle x position
                .attr('cy', 8)                      // Circle y position
                .attr('r', 6)                       // Circle radius
                .attr('fill', item.color)           // Fill with corresponding color
                .attr('stroke', '#ffffff')          // White border
                .attr('stroke-width', 1);           // Border width

            // Add text label next to circle
            legendRow.append('text')
                .attr('x', 20)                      // Position to right of circle
                .attr('y', 12)                      // Vertical alignment with circle
                .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px')  // Responsive font
                .style('fill', '#2C3E50')           // Dark color
                .text(item.label);                  // Display label text
        });
    }
}

// Export for use in main script (CommonJS module pattern)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScatterPlot;  // Export class for Node.js environments
}
