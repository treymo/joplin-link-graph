
// https://stackoverflow.com/questions/8618464/how-to-wait-for-another-js-to-load-to-proceed-operation
function whenAvailable(name, callback) {
    var interval = 10; // ms
    window.setTimeout(function() {
        if (window[name]) {
            callback(window[name]);
        } else {
            whenAvailable(name, callback);
        }
    }, interval);
};

whenAvailable("d3", async function(t) {
  const response = await webviewApi.postMessage('d3JSLoaded');
  buildGraph(response);

  setInterval(async function() {
    try {
      const updatedData = await webviewApi.postMessage('haveUpdate?');
      if (typeof updatedData !== 'undefined') {
        await update(updatedData);
      }
    } catch(err) {
      console.warn("error getting data update: ", err);
    }
  }, 2000);
});

var simulation, svg;
function buildGraph(data) {
  var margin = {top: 10, right: 30, bottom: 30, left: 40},
    width = 400 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  svg = d3.select("#note_graph")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  simulation = d3.forceSimulation()
      .force("link", d3.forceLink()
        .id(function(d) { return d.id; }))
      .force("charge", d3.forceManyBody()
        .strength(function(d) { return -500;}))
      .force("center", d3.forceCenter(width / 2, height / 2));

  update(data);
}

function update(data) {
  // Remove nodes and links from the last graph
  svg.selectAll(".nodes").remove();
  svg.selectAll(".links").remove();

  // Draw nodes.
  var node = svg.append("g")
      .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .enter().append("g")

  var circles = node.append("circle")
      .attr("r", 5)
      .style("fill", "#69b3a2");

  node.append("text")
      .text(function(d) {
        return d.title;
      })
      .attr('x', 6)
      .attr('y', 3);

  node.append("title")
      .text(function(d) { return d.title; });

  // Draw links.
  var link = svg.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(data.edges)
    .enter().append("line")
      .style("stroke", "#aaa")

	//	update simulation nodes, links, and alpha
	simulation
		.nodes(data.nodes)
		.on("tick", ticked);

  	simulation.force("link")
  		.links(data.edges);

  	simulation.alpha(1).alphaTarget(0).restart();

  function ticked() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        })
  }
}
