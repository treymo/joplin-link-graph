
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

async function refreshData(force) {
  try {
    const updatedData = await webviewApi.postMessage(
      {
        name: 'checkForUpdate',
        force: typeof force === 'undefined' ? false : force,
      });
    if (typeof updatedData !== 'undefined') {
      update(updatedData);
    }
  } catch(err) {
    console.warn("error getting data update: ", err);
  }
}

whenAvailable("d3", async function() {
  const response = await webviewApi.postMessage({name: 'd3JSLoaded'});
  buildGraph(response);

  setInterval(async function() {
    await refreshData()
  }, 1000); // One second
});

var simulation, svg;
var width, height;
function buildGraph(data) {
  var margin = {top: 10, right: 10, bottom: 10, left: 10};
  width = window.innerWidth
  height = window.innerHeight

  svg = d3.select("#note_graph")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  simulation = d3.forceSimulation()
      .force("link", d3.forceLink().distance(200)
        .id(function(d) { return d.id; }))
      .force("charge", d3.forceManyBody()
        .strength(function() { return -500;}))
      .force("nocollide", d3.forceCollide(200))
      .force("center", d3.forceCenter(width / 2, height / 2));

  //add zoom capabilities
  var zoom_handler = d3.zoom()
      .on("zoom", zoom_actions);
  zoom_handler(d3.select("svg"));

  function zoom_actions(event) {
      svg.attr("transform", event.transform)
  }
  update(data);
}

function update(data) {
  // Remove nodes and links from the last graph
  svg.selectAll(".nodes").remove();
  svg.selectAll(".links").remove();

  // Draw links.
  var link = svg.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(data.edges)
    .enter().append("line")
    .classed("adjacent-line", (d) => d.focused)

  // Draw nodes.
  var node = svg.append("g")
      .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .enter().append("g")

  node.append("circle")
      .classed("current-note", (d) => d.id === data.currentNoteID)
      .classed("adjacent-note", (d) => d.focused)
      .on('click', function(_, i) {
          webviewApi.postMessage({
            name: 'navigateTo',
            id: i.id,
          });
        })

  node.append("text")
      .attr("class", "node-label")
      .text(function(d) {
        return d.title;
      })
      .attr('x', (d) => d.id === data.currentNoteID ? 20 : 14)
      .attr('y', 5);

  //  update simulation nodes, links, and alpha
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
          if (d.id == data.currentNoteID) {
            // Center the current note in the svg.
            d.x = width / 2;
            d.y = height / 2;
          }
          return "translate(" + d.x + "," + d.y + ")";
        })
  }
}
