
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
  console.info('webiew.js: got response:', response);
  buildGraph(response);
});

// TODO: handle node click
/*document.addEventListener('click', async (event) => {
	const element = event.target;
	if (element.className === 'note-node') {
		event.preventDefault();
		console.info('webview.js: sending message');
		const response = await webviewApi.postMessage('testingWebviewMessage');
		console.info('webiew.js: got response:', response);
	}
})*/

async function buildGraph(data) {
  var margin = {top: 10, right: 30, bottom: 30, left: 40},
    width = 400 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#note_graph")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

  // Initialize the edges
  var link = svg
    .selectAll("line")
    .data(data.edges)
    .enter()
    .append("line")
      .style("stroke", "#aaa")

  // Initialize the nodes
  var node = svg
    .selectAll("circle")
    .data(data.nodes)
    .enter()
    .append("circle")
      .attr("r", 20)
      .attr("class", "note-node")
      .style("fill", "#69b3a2")

  node.append("text")
  .style("text-anchor", "middle")
  .attr("y", 15)
  .text(function (d) {
    console.log("setting node text to: ", d)
    return d.title
  })

  // Let's list the force we wanna apply on the network
  var simulation = d3.forceSimulation(data.nodes)                 // Force algorithm is applied to data.nodes
      .force("link", d3.forceLink()                               // This force provides links between nodes
            .id(function(d) { return d.id; })                     // This provide  the id of a node
            .links(data.edges)                                    // and this the list of links
      )
      .force("charge", d3.forceManyBody().strength(-400))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
      .force("center", d3.forceCenter(width / 2, height / 2))     // This force attracts nodes to the center of the svg area
      .on("end", ticked);

  // This function is run at each iteration of the force algorithm, updating the nodes position.
  function ticked() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
         .attr("cx", function (d) { return d.x+6; })
         .attr("cy", function(d) { return d.y-6; });
  };
}
