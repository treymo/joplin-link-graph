import * as d3 from "d3";

function poll() {
  webviewApi.postMessage({ name: "poll" }).then((event) => {
    if (event.data) {
      buildGraph(event.data);
    }
    poll();
  });
}

poll();

function update() {
  webviewApi.postMessage({ name: "update" }).then((event) => {
    if (event.data) {
      buildGraph(event.data);
    }
  });
}

document.getElementById("redrawButton").addEventListener("click", update);

update();

var simulation, svg;
var width, height;

function buildGraph(data) {
  var margin = { top: 10, right: 10, bottom: 10, left: 10 };
  width = window.innerWidth;
  height = window.innerHeight;

  d3.select("#note_graph > svg").remove();
  svg = d3
    .select("#note_graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3
        .forceLink()
        .distance(200)
        .id(function (d) {
          return d.id;
        })
    )
    .force(
      "charge",
      d3.forceManyBody().strength(function () {
        return -500;
      })
    )
    .force("nocollide", d3.forceCollide(data.nodeDistanceRatio * 200))
    .force("center", d3.forceCenter(width / 2, height / 2));

  if (data.isIncludeBacklinks) {
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 15)
      .attr("markerHeight", 15)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .attr("class", "line-marker-end")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");
  }

  //add zoom capabilities
  var zoom_handler = d3.zoom().scaleExtent([0.1, 10]).on("zoom", zoom_actions);
  zoom_handler(d3.select("svg"));

  function zoom_actions(event) {
    svg.attr("transform", event.transform);
  }
  updateGraph(data);
}

function updateGraph(data) {
  // Remove nodes and links from the last graph
  svg.selectAll(".nodes").remove();
  svg.selectAll(".links").remove();

  // Draw links.
  var link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(data.edges)
    .enter()
    .append("line")
    .classed("adjacent-line", (d) => d.focused);

  if (data.isIncludeBacklinks) {
    link.attr("marker-end","url(#arrow)");
  }

  // Draw nodes.
  var node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .enter()
    .append("g");

  node
    .append("circle")
    .classed("current-note", (d) => d.id === data.currentNoteID)
    .classed("adjacent-note", (d) => d.focused)
    .on("click", function (_, i) {
      webviewApi.postMessage({
        name: "navigateTo",
        id: i.id,
      });
    });

  node
    .append("text")
    .attr("class", "node-label")
    .attr("font-size", data.nodeFontSize + "px")
    .text(function (d) {
      return d.title;
    })
    .attr("x", (d) => (d.id === data.currentNoteID ? 20 : 14))
    .attr("y", 5);

  //  update simulation nodes, links, and alpha
  simulation.nodes(data.nodes).on("tick", ticked);

  simulation.force("link").links(data.edges);

  simulation.alpha(1).alphaTarget(0).restart();

  function ticked() {
    link
      .attr("x1", function (d) {
        return d.source.x;
      })
      .attr("y1", function (d) {
        return d.source.y;
      })
      .attr("x2", function (d) {
        return d.target.x;
      })
      .attr("y2", function (d) {
        return d.target.y;
      });

    node.attr("transform", function (d) {
      if (d.id == data.currentNoteID) {
        // Center the current note in the svg.
        d.x = width / 2;
        d.y = height / 2;
      }
      return "translate(" + d.x + "," + d.y + ")";
    });
  }
}
