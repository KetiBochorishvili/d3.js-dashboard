// Chart 3: Parallel coordinates chart displaying multiple variables grouped by daily alcohol consumption level
// ParallelCoordinates class encapsulates all rendering logic and state management
class ParallelCoordinates {
    // Constructor - Initialize chart with null/empty values
    constructor() {
        this.data = null;               // Will hold the processed data array
        this.svg = null;                // Will hold the D3 SVG selection
        this.margin = { top: 60, right: 40, bottom: 40, left: 40 };  // Default margins (fallback values)
        this.width = 0;                 // Chart width (calculated dynamically)
        this.height = 0;                // Chart height (calculated dynamically)
    }

    // Main render method - Creates/updates the visualization
    // containerId: CSS selector for container element
    // containerWidth: Total width available for chart
    // containerHeight: Total height available for chart
    // data: Array of objects with {health, studytime, absences, failures, famrel, G3, Dalc} properties
    render(containerId, containerWidth, containerHeight, data) {
        // Store reference to data
        this.data = data;

        // Validate data exists before rendering
        if (!this.data || this.data.length === 0) {
            console.error('No data available for Parallel Coordinates');  // Log error if data is missing
            return;  // Exit early if no data
        }

        // Calculate dynamic margins based on container size for responsive design
        // Use percentage of container size with minimum values to ensure usability
        const dynamicMargins = {
            top: Math.max(60, containerHeight * 0.12),     // 12% of height, minimum 60px (space for legend)
            right: Math.max(40, containerWidth * 0.05),     // 5% of width, minimum 40px
            bottom: Math.max(100, containerHeight * 0.2),   // 20% of height, minimum 100px (extra space for axis labels + explanations)
            left: Math.max(40, containerWidth * 0.05)       // 5% of width, minimum 40px
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

        // Define dimensions (variables) to display on parallel axes
        // Each dimension will have its own vertical axis
        const dimensions = ['health', 'studytime', 'absences', 'failures', 'famrel', 'G3'];
        
        // Create Y scales for each dimension
        // Each dimension has its own scale mapping data values to vertical positions
        const yScales = {};
        dimensions.forEach(dim => {
            yScales[dim] = d3.scaleLinear()                  // Create linear scale for continuous data
                .domain(d3.extent(this.data, d => d[dim]))   // Set domain to min and max values in data
                .range([this.height, 0])                     // Output range: vertical pixels (inverted: bottom to top)
                .nice();                                     // Extend domain to round numbers
        });

        // Create X scale for positioning the vertical axes
        // scalePoint distributes axes evenly across the horizontal space
        const xScale = d3.scalePoint()
            .domain(dimensions)          // Input domain: array of dimension names
            .range([0, this.width])      // Output range: horizontal pixel positions
            .padding(0.1);               // Add 10% padding on both ends

        // Create color scale based on Dalc (daily alcohol consumption) values
        // Maps Dalc levels (1-5) to distinct colors
        const colorScale = d3.scaleOrdinal()
            .domain([1, 2, 3, 4, 5])     // Input domain: alcohol consumption levels
            .range(['#A63B28', '#3156AD', '#1D7332', '#EBED0E', '#D10DB3']); // Colors: Red, Blue, Green, Yellow, Pink

        // Create line generator function
        // This function creates SVG path data for connecting points across dimensions
        const line = d3.line();
        // Path function takes a data point and maps it to coordinates for all dimensions
        const path = d => line(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])]));

        // Define Dalc group values to analyze
        const dalcGroups = [1, 2, 3, 4, 5];
        
        // Calculate average values for each Dalc group across all dimensions
        // This aggregates data to show trends rather than individual student lines
        const averageData = dalcGroups.map(dalcValue => {
            // Filter data to get only students with current Dalc value
            const groupData = this.data.filter(d => d.Dalc === dalcValue);
            if (groupData.length === 0) return null;  // Skip if no students in this group
            
            // Create object to hold average values
            const avgPoint = { Dalc: dalcValue };  // Store Dalc value for color coding
            // Calculate mean for each dimension
            dimensions.forEach(dim => {
                avgPoint[dim] = d3.mean(groupData, d => d[dim]);  // Average value for this dimension
            });
            return avgPoint;  // Return aggregated point
        }).filter(d => d !== null);  // Remove null entries (groups with no data)

        // Draw lines representing average values for each Dalc group
        g.append('g')                           // Create group for all average lines
            .attr('class', 'average-lines')     // Add CSS class
            .selectAll('path')                  // Select all path elements (none exist yet)
            .data(averageData)                  // Bind average data
            .enter()                            // Get enter selection
            .append('path')                     // Append path for each Dalc group
            .attr('d', path)                    // Set path data using path generator function
            .style('fill', 'none')              // No fill (line only)
            .style('stroke', d => colorScale(d.Dalc))  // Color based on Dalc value
            .style('stroke-width', 4)           // Thick lines for visibility
            .style('opacity', 0.9);             // Slight transparency

        // Create vertical axes for each dimension
        const axes = g.selectAll('.dimension') // Select all dimension groups (none exist yet)
            .data(dimensions)                   // Bind dimension names
            .enter()                            // Get enter selection
            .append('g')                        // Append group for each dimension
            .attr('class', 'dimension')         // Add CSS class
            .attr('transform', d => `translate(${xScale(d)},0)`);  // Position at horizontal location from xScale

        // Add axis lines and tick marks for each dimension
        axes.append('g')                        // Add group for axis elements
            .each(function(d) {                 // For each dimension
                d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5));  // Create left-oriented axis with 5 ticks
            })
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.015)) + 'px');  // Responsive font size

        // Add axis labels at bottom
        axes.append('text')
            .attr('class', 'axis-label')        // CSS class for styling
            .attr('text-anchor', 'middle')      // Center text horizontally
            .attr('y', this.height + 35)        // Position below chart (35px from bottom)
            .style('font-size', Math.max(11, Math.min(14, containerWidth * 0.018)) + 'px')  // Responsive font size
            .style('font-weight', '600')        // Semi-bold text
            .style('fill', '#2C3E50')           // Dark blue-gray color
            .text(d => {                        // Set label text based on dimension
                // Map dimension codes to readable labels
                const labels = {
                    'health': 'Health Status',         // Current health status
                    'studytime': 'Study Time',         // Weekly study time category
                    'absences': 'Absences',            // Number of school absences
                    'failures': 'Failures',            // Number of past class failures
                    'famrel': 'Family Relations',      // Quality of family relationships
                    'G3': 'Final Grade'                // Final math grade
                };
                return labels[d];  // Return label for this dimension
            });

        // Add compact explanations below axis labels
        // These help users understand what the numeric values represent
        axes.append('text')
            .attr('class', 'axis-explanation')  // CSS class for styling
            .attr('text-anchor', 'middle')      // Center text horizontally
            .attr('y', this.height + 55)        // Position below labels (55px from bottom)
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px')  // Smaller responsive font
            .style('fill', '#666')              // Gray color for secondary text
            .text(d => {                        // Set explanation text based on dimension
                // Map dimension codes to compact value explanations
                const explanations = {
                    'health': '1=very bad, 5=very good',              // Health scale explanation
                    'studytime': '1=<2h, 2=2-5h, 3=5-10h, 4=>10h',   // Study time categories
                    'absences': '0-93 absences',                      // Absence range
                    'failures': 'past failures (max 4)',              // Failure count explanation
                    'famrel': '1=very bad, 5=excellent',              // Family relations scale
                    'G3': 'grade 0-20'                                // Grade range
                };
                return explanations[d];  // Return explanation for this dimension
            });

        // Add legend explaining color coding and visualization
        this.addLegend(containerWidth, containerHeight, dynamicMargins, colorScale);
    }

    // Create and position legend showing Dalc categories and description
    // containerWidth: Full width of SVG container
    // containerHeight: Full height of SVG container
    // margins: Object with top, right, bottom, left margin values
    // colorScale: D3 color scale for Dalc values
    addLegend(containerWidth, containerHeight, margins, colorScale) {
        // Create legend group in top-left area
        const legend = this.svg.append('g')
            .attr('class', 'legend')            // CSS class for styling
            .attr('transform', `translate(${margins.left}, 10)`);  // Position from left with small top margin

        // Add legend title explaining what the lines represent
        legend.append('text')
            .attr('x', 0)                       // Left-aligned
            .attr('y', 12)                      // Vertical position
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.016)) + 'px')  // Responsive font
            .style('fill', '#2C3E50')           // Dark color
            .style('font-weight', '600')        // Semi-bold text
            .text('Average Values by Daily Alcohol Consumption Level');  // Title text

        // Define legend items for each Dalc level
        const dalcLegendData = [
            { value: 1, label: 'Dalc: 1' },     // Very low alcohol consumption
            { value: 2, label: 'Dalc: 2' },     // Low alcohol consumption
            { value: 3, label: 'Dalc: 3' },     // Medium alcohol consumption
            { value: 4, label: 'Dalc: 4' },     // High alcohol consumption
            { value: 5, label: 'Dalc: 5' }      // Very high alcohol consumption
        ];

        // Create group for color legend items, positioned to the right of title
        const colorLegend = legend.append('g')
            .attr('transform', 'translate(350, 0)');  // Offset to right of title

        // Create legend item for each Dalc level
        dalcLegendData.forEach((item, i) => {
            // Create group for each legend item
            const legendRow = colorLegend.append('g')
                .attr('transform', `translate(${i * 70}, 0)`);  // Space items horizontally with 70px spacing

            // Add colored line showing the color for this Dalc level
            legendRow.append('line')
                .attr('x1', 0)                  // Line start x
                .attr('x2', 25)                 // Line end x (25px wide)
                .attr('y1', 8)                  // Line start y
                .attr('y2', 8)                  // Line end y (horizontal line)
                .attr('stroke', colorScale(item.value))  // Color based on Dalc value
                .attr('stroke-width', 4);       // Match line thickness from chart

            // Add text label next to colored line
            legendRow.append('text')
                .attr('x', 30)                  // Position to right of line
                .attr('y', 12)                  // Vertical alignment with line
                .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px')  // Responsive font
                .style('fill', '#2C3E50')       // Dark color
                .text(item.value);              // Display Dalc value
        });

        // Add descriptive note explaining the visualization approach
        legend.append('text')
            .attr('x', 0)                       // Left-aligned
            .attr('y', 30)                      // Below the main legend
            .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px')  // Responsive font
            .style('fill', '#666')              // Gray color for secondary text
            .style('font-style', 'italic')      // Italic style
            .text(`Based on ${this.data.length} students. Each line shows average values for a Dalc level.`);  // Explanatory note
    }
}

// Export for use in main script (CommonJS module pattern)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParallelCoordinates;  // Export class for Node.js environments
}
