import * as vis from "vis-network";

function poll() {
  webviewApi.postMessage({name: 'poll'}).then((event) => {
    if(event.data) {
      buildGraph(event.data);
    }
    poll();
  })
}

poll();

function update() {
  webviewApi.postMessage({name: 'update'}).then((event) => {
    if (event.data) {
      buildGraph(event.data);
    }
  });
}

document.getElementById("redrawButton").addEventListener("click", update);

update();

function buildGraph(data) {
  var width = window.innerWidth;
  var height = window.innerHeight;
  // TODO: remove
  console.warn("building graph");
  var container = document.getElementById("graph-container");
  container.style.height = height + "px";
  container.style.width = width + "px";

  var networkData = {
    nodes: new vis.DataSet(data.nodes),
    edges: new vis.DataSet(data.edges),
  };
  // TODO: remove
  console.log(networkData);
  var options = {
    //physics: false,
    nodes: {
      shape: "dot",
      size: 30,
      font: {
        size: 32,
        color: "#ffffff",
      },
      borderWidth: 2,
    },
    edges: {
      width: 2,
    },
    layout: {
      improvedLayout: false,
    }
  };
  var network = new vis.Network(container, networkData, options);
}
