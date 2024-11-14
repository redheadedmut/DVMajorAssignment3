// Set the dimensions of the SVG container
// Create the SVG canvas
const svg = d3.select("body")
    .append("svg")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight)
    .call(d3.zoom()
        .scaleExtent([0.1, 10]) // Limits for zoom level: min 0.1x, max 10x
        .on("zoom", zoomed)) // Apply the zoomed function on zoom
    .append("g") // Append a group to hold the simulation elements

function zoomed(event) {
  svg.attr("transform", event.transform); // Apply transform to the SVG group
}

window.addEventListener("resize", () => {
  svg.attr("width", window.innerWidth)
      .attr("height", window.innerHeight);
});

const chargeStrengthSlider = document.getElementById('chargeStrength');
const chargeStrengthValue = document.getElementById('chargeStrengthValue');
const collisionRadiusSlider = document.getElementById('collisionRadius');
const collisionRadiusValue = document.getElementById('collisionRadiusValue');
const linkStrengthSlider = document.getElementById('linkStrength');
const linkStrengthValue = document.getElementById('linkStrengthValue');


// Load the JSON data
d3.json("data/author_network.json").then(data => {

    data.nodes.forEach(node => {
        node.degree = data.links.filter(link => link.source === node.id || link.target === node.id).length;
    });

    // Define the scale for node size (using square root scale)
    const radiusScale = d3.scaleSqrt()
        .domain([d3.min(data.nodes, d => d.degree), d3.max(data.nodes, d => d.degree)])  // Min and max degree
        .range([3, 12]);  // Min and max radius
    
    const countryCounts = d3.rollups(data.nodes, v => v.length, d => d.country)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topCountries = new Set(countryCounts.map(d => d[0]));

    // Define color scale for top 10 countries
    const colorScale = d3.scaleOrdinal()
        .domain([...topCountries])
        .range(d3.schemeTableau10);  // Use a color scheme for the top 10 countries

    // Function to determine node color based on country
    const getColorByCountry = (country) => {
        return topCountries.has(country) ? colorScale(country) : "#A9A9A9";
    };

    // Set up the initial force simulation
    let simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrengthSlider.value))
        .force("charge", d3.forceManyBody().strength(chargeStrengthSlider.value))
        .force("center", d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
        .force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + parseFloat(collisionRadiusSlider.value)))
        .on("tick", ticked);

    // Update the force simulation when any of the controls change
    chargeStrengthSlider.addEventListener('input', function() {
        const chargeStrength = parseFloat(chargeStrengthSlider.value);
        chargeStrengthValue.value = chargeStrength; // Update the number input
        simulation.force("charge", d3.forceManyBody().strength(chargeStrength)); // Update charge force
        simulation.alpha(1).restart(); // Restart the simulation
    });

    chargeStrengthValue.addEventListener('input', function() {
        const chargeStrength = parseFloat(chargeStrengthValue.value);
        chargeStrengthSlider.value = chargeStrength; // Update the slider
        simulation.force("charge", d3.forceManyBody().strength(chargeStrength)); // Update charge force
        simulation.alpha(1).restart(); // Restart the simulation
    });

    collisionRadiusSlider.addEventListener('input', function() {
        const collisionRadius = parseFloat(collisionRadiusSlider.value);
        collisionRadiusValue.value = collisionRadius; // Update the number input
        simulation.force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + collisionRadius)); // Update collision force
        simulation.alpha(1).restart(); // Restart the simulation
    });

    collisionRadiusValue.addEventListener('input', function() {
        const collisionRadius = parseFloat(collisionRadiusValue.value);
        collisionRadiusSlider.value = collisionRadius; // Update the slider
        simulation.force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + collisionRadius)); // Update collision force
        simulation.alpha(1).restart(); // Restart the simulation
    });

    linkStrengthSlider.addEventListener('input', function() {
        const linkStrength = parseFloat(linkStrengthSlider.value);
        linkStrengthValue.value = linkStrength; // Update the number input
        simulation.force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrength)); // Update link strength
        simulation.alpha(1).restart(); // Restart the simulation
    });

    linkStrengthValue.addEventListener('input', function() {
        const linkStrength = parseFloat(linkStrengthValue.value);
        linkStrengthSlider.value = linkStrength; // Update the slider
        simulation.force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrength)); // Update link strength
        simulation.alpha(1).restart(); // Restart the simulation
    });

    // Function to update the positions of nodes and links
    function ticked() {
        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    }
    const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("box-shadow", "0px 0px 8px rgba(0, 0, 0, 0.3)")
    .style("display", "none");

    // Draw the links (edges)
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("stroke-width", 1.5);

    const highlightToggle = d3.select("#toggleHighlight");

    const node = svg.selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", d => radiusScale(d.degree))  // Adjust node size
        .attr("fill", d => getColorByCountry(d.country))
        .call(drag(simulation))
        .on("mouseover", function(event, d) {
            const highlightBy = highlightToggle.property("value");
    
            // Highlight nodes based on the toggle value
            node.style("opacity", nodeData =>
                highlightBy === "country"
                    ? (nodeData.country === d.country ? 1 : 0.2)
                    : (nodeData.affiliation === d.affiliation ? 1 : 0.2)
            );
        })
        .on("mouseleave", function() {
            // Reset all nodes to full opacity
            node.style("opacity", 1);
        })
        .on("click", function(event, d) {
            // Show tooltip with author information
            showTooltip(event, d);
            event.stopPropagation();  // Prevent click event from reaching SVG background
        });
      
    function showTooltip(event, d) {
      const [x, y] = d3.pointer(event);  // Correct way to get mouse coordinates in D3 v7
      tooltip
          .html(`<strong>Author:</strong> ${d.name}<br><strong>Country:</strong> ${d.country}`)
          .style("left", (event.pageX + 10) + "px")  // Position relative to page for stability
          .style("top", (event.pageY - 28) + "px")
          .style("display", "block");
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    document.body.addEventListener("click", function(event) {
      const isClickInsideNode = event.target.tagName === 'circle';
      if (!isClickInsideNode) {
          hideTooltip();  // Hide tooltip if the click is outside any node
      }
    });

    
});

// Drag behavior
function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}
