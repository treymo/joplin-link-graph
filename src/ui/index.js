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

function addMarkerEndDef(defs, distance) {
  const style = `var(--distance-${distance}-primary-color, var(--distance-remaining-primary-color))`;
  _addMarkerEndDef(defs, distance, style);
}

function _addMarkerEndDef(defs, name, style) {
  defs
    .append("marker")
    .attr("id", `line-marker-end-${name}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("markerWidth", 15)
    .attr("markerHeight", 15)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .style("fill", style)
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");
}

function minimalDistanceOfLink(link) {
  return Math.min(
    link.sourceDistanceToCurrentNode,
    link.targetDistanceToCurrentNode
  );
}

document.getElementById("redrawButton").addEventListener("click", update);

update();

var simulation, svg;
var width, height;

function buildGraph(data) {
  var margin = { top: 10, right: 10, bottom: 10, left: 10 };
  width = window.innerWidth;
  height = window.innerHeight;

  if (data.graphIsSelectionBased)
    document
      .querySelector("#note_graph")
      .classList.add("mode-selection-based-graph");
  else
    document
      .querySelector("#note_graph")
      .classList.remove("mode-selection-based-graph");

  d3.select("#note_graph > svg").remove();
  svg = d3
    .select("#note_graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const forceLink = d3
    .forceLink()
    .distance(200)
    .id(function (d) {
      return d.id;
    })

  if (data.graphIsSelectionBased) {
    // we are in selection-based graph
    forceLink.strength((link) => {
      const minDistance = minimalDistanceOfLink(link);
      if (minDistance === 0) {
        return 1;
      } else if (minDistance === 1) {
        return 0.5;
      } else return 0.1;
    });
  }

  simulation = d3
    .forceSimulation()
    .force("link", forceLink)
    .force(
      "charge",
      d3.forceManyBody().strength(function () {
        return -500;
      })
    )
    .force("nocollide", d3.forceCollide(data.nodeDistanceRatio * 200))
    .force("center", d3.forceCenter(width / 2, height / 2));

  if (data.showLinkDirection) {
    const defs = svg.append("defs");
    // For now add arrows for ten layers (excl. center).
    // todo: make more dynamic
    const COUNT_LAYERS = 10;
    for (let i = 0; i < COUNT_LAYERS; i++) {
      addMarkerEndDef(defs, i);
    }
    // marker, if whole graph is shown
    addMarkerEndDef(defs, "default");
    // on hover marker
    _addMarkerEndDef(defs, "hovered-link", "var(--joplin-color-error2");
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
    .classed("adjacent-line", (d) => d.focused)
    .attr("id", function (d) {
      return domlinkId(d.source, d.target);
    })
    .on("mouseover", function (_ev, d) {
      handleLinkHover(this, d, true);
    })
    .on("mouseout", function (_ev, d) {
      handleLinkHover(this, d, false);
    });

  // provide distance classes for links
  if (data.graphIsSelectionBased) {
    link.attr("class", function (d) {
      const linkIsInward =
        d.sourceDistanceToCurrentNode > d.targetDistanceToCurrentNode;
      return [
        ...this.classList,
        `distance-${minimalDistanceOfLink(d)}`,
        ...(linkIsInward ? ["inward-link"] : []),
      ].join(" ");
    });
  }

  configureDistanceMarkerEnd(link);

  function domNodeId(nodeId, withSharp) {
    // dom id needs to start with [a-zA-Z], hence we prefix with "id-"
    return `${withSharp ? "#" : ""}id-${nodeId}`;
  }

  function domlinkId(sourceNodeId, targetNodeId, withSharp) {
    return `${withSharp ? "#" : ""}id-${sourceNodeId}-to-id-${targetNodeId}`;
  }

  function domNodeLabelId(nodeId, withSharp) {
    return `${withSharp ? "#" : ""}id-label-${nodeId}`;
  }

  function handleLinkHover(linkSelector, linkData, isEntered) {
    // link hover will also trigger source and target node as well as labels hover

    // lines
    linkSelector = d3.select(linkSelector);
    linkSelector.classed("hovered-link", isEntered);
    if (isEntered)
      linkSelector.attr("marker-end", "url(#line-marker-end-hovered-link)");
    else configureDistanceMarkerEnd(linkSelector);

    // nodes
    // at this point d.source/targets holds *reference* to node data
    d3.select(domNodeId(linkData.source.id, true)).classed(
      "hovered-node",
      isEntered
    );
    d3.select(domNodeId(linkData.target.id, true)).classed(
      "hovered-node",
      isEntered
    );

    // node labels
    d3.select(domNodeLabelId(linkData.source.id, true)).classed(
      "hovered-node-label",
      isEntered
    );
    d3.select(domNodeLabelId(linkData.target.id, true)).classed(
      "hovered-node-label",
      isEntered
    );
  }

  function handleNodeHover(nodeId, isEntered) {
    // node hover delegates to handleLinkHover
    // for all incoming and outcoming links
    d3.selectAll(
      `line[id^=id-${nodeId}-to-id-],line[id$=-to-id-${nodeId}]`
    ).each(function (d, _i) {
      handleLinkHover(this, d, isEntered);
    });
  }

  function configureDistanceMarkerEnd(link) {
    if (data.showLinkDirection) {
      link.attr("marker-end", (d) => {
        if (data.graphIsSelectionBased) {
          const minDistance = minimalDistanceOfLink(d);
          return `url(#line-marker-end-${minDistance})`;
        } else return `url(#line-marker-end-default)`;
      });
    }
  }

  // Draw nodes.
  var node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .enter()
    .append("g");

  const circle = node.append("circle");

  circle
    .attr("id", function (d) {
      return domNodeId(d.id, false);
    })
    .classed("current-note", (d) => d.id === data.currentNoteID)
    .classed("adjacent-note", (d) => d.focused)
    .on("click", function (_, i) {
      webviewApi.postMessage({
        name: "navigateTo",
        id: i.id,
      });
    })
    .on("mouseover", function (_evN, dN) {
      handleNodeHover(dN.id, true);
    })
    .on("mouseout", function (_evN, dN) {
      handleNodeHover(dN.id, false);
    });

  // provide distance classes for circles
  if (data.graphIsSelectionBased) {
    circle.attr("class", function (d) {
      return [...this.classList, `distance-${d.distanceToCurrentNode}`].join(
        " "
      );
    });
  }

  const nodeLabel = node.append("text");

  nodeLabel
    .attr("class", "node-label")
    .attr("id", function (d) {
      return domNodeLabelId(d.id, false);
    })
    .attr("font-size", data.nodeFontSize + "px")
    .text(function (d) {
      return d.title;
    })
    .attr("x", (d) => (d.id === data.currentNoteID ? 20 : 14))
    .attr("y", 5);

  // provide distance classes for node labels
  if (data.graphIsSelectionBased) {
    nodeLabel.attr("class", function (d) {
      return [...this.classList, `distance-${d.distanceToCurrentNode}`].join(
        " "
      );
    });
  }

  //  update simulation nodes, links, and alpha
  simulation.nodes(data.nodes).on("tick", ticked);

  simulation.force("link").links(data.edges);

  simulation.alpha(1).alphaTarget(0).restart();

  function ticked() {
    node.attr("transform", function (d) {
      if (d.id == data.currentNoteID) {
        // Center the current note in the svg.
        d.x = width / 2;
        d.y = height / 2;
      }
      return "translate(" + d.x + "," + d.y + ")";
    });

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
  }
}
