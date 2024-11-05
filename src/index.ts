import joplin from "api";
import { registerSettings } from "./settings";
import { MenuItemLocation, ToolbarButtonLocation } from "api/types";
import { getNotes, getAllLinksForNote, getNoteTags } from "./data/data";
var deepEqual = require("fast-deep-equal");

interface Edge {
  source: string;
  target: string;
  sourceDistanceToCurrentNode?: number;
  targetDistanceToCurrentNode?: number;
  focused: boolean;
}

interface Node {
  id: string;
  title: string;
  focused: boolean;
  distanceToCurrentNode?: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  currentNoteID: string;
  nodeFontSize: number;
  nodeDistanceRatio: number;
  showLinkDirection: boolean;
  graphIsSelectionBased: boolean; // maxDegree > 0
}

let data: GraphData;
let pollCb: any;
let modelChanges = [];

joplin.plugins.register({
  onStart: async function () {
    await registerSettings();
    const panels = joplin.views.panels;
    const view = await (panels as any).create("note-graph-view");
    await panels.setHtml(view, "Note Graph is Loading");
    var prevData = {};
    var prevNoteLinks: Set<string>;
    var syncOngoing = false;

    async function drawPanel() {
      await panels.setHtml(
        view,
        `
                  <div class="graph-content">
                      <div class="header-area">
                        <button id="redrawButton">Redraw Graph</button>
                        <p class="header">Note Graph</p>
                      </div>
                      <div class="container">
                        <div id="user-input-container"></div>
                        <div id="note_graph"/>
                      </div>
        </div>
      `
      );
    }

    // Create a toolbar button
    await joplin.commands.register({
      name: "showHideGraphUI",
      label: "Show/Hide Graph View",
      iconName: "fas fa-sitemap",
      execute: async () => {
        const isVisible = await (panels as any).visible(view);
        (panels as any).show(view, !isVisible);
      },
    });
    await joplin.views.toolbarButtons.create(
      "graphUIButton",
      "showHideGraphUI",
      ToolbarButtonLocation.NoteToolbar
    );

    await drawPanel();
    await joplin.views.menuItems.create(
      "showOrHideGraphMenuItem",
      "showHideGraphUI",
      MenuItemLocation.View,
      { accelerator: "F8" }
    );
    // Build Panel
    await panels.addScript(view, "./webview.css");
    await panels.addScript(view, "./ui/index.js");

    panels.onMessage(view, (message: any) => {
      switch (message.name) {
        case "poll":
          let p = new Promise((resolve) => {
            pollCb = resolve;
          });
          notifyUI();
          return p;
        case "update":
          return { name: "update", data: data };
        case "navigateTo":
          joplin.commands.execute("openNote", message.id);
          break;
        case "get_note_tags":
          return getNoteTags(message.id);
        case "set_setting":
          return joplin.settings.setValue(message.key, message.value);
        case "get_setting":
          return joplin.settings.value(message.key);
      }
    });

    async function updateUI(eventName: string) {
      if (syncOngoing) {
        return;
      }

      const maxDegree = await joplin.settings.value(
        "SETTING_MAX_SEPARATION_DEGREE"
      );
      var dataChanged = false;
      // Speed up the inital load by skipping the eventName switch.
      if (typeof data === "undefined") {
        data = await fetchData();
        dataChanged = true;
      } else {
        if (eventName === "noteChange") {
          // Don't update the graph is the links in this note haven't changed.
          const selectedNote = await joplin.workspace.selectedNote();
          var noteLinks = getAllLinksForNote(selectedNote.body);
          if (!deepEqual(noteLinks, prevNoteLinks)) {
            prevNoteLinks = noteLinks;
            dataChanged = true;
          }
        } else if (eventName === "noteSelectionChange" && maxDegree == 0) {
          // noteSelectionChange should just re-center the graph, no need to fetch all new data and compare.
          const newlySelectedNote = await joplin.workspace.selectedNote();
          data.currentNoteID = newlySelectedNote.id;
          data.edges.forEach((edge) => {
            const shouldHaveFocus =
              edge.source === newlySelectedNote.id ||
              edge.target === newlySelectedNote.id;
            edge.focused = shouldHaveFocus;
          });
          data.nodes.forEach((node) => {
            node.focused = node.id === newlySelectedNote.id;
          });
          dataChanged = true;
        } else {
          data = await fetchData();
          dataChanged = !deepEqual(data, prevData);
        }
      }

      if (dataChanged) {
        prevData = data;
        recordModelChanges({ name: eventName, data: data });
        notifyUI();
      }
    }

    await joplin.workspace.onNoteChange(async () => {
      updateUI("noteChange");
    });
    await joplin.workspace.onNoteSelectionChange(async () => {
      updateUI("noteSelectionChange");
    });
    await joplin.workspace.onSyncStart(async () => {
      syncOngoing = true;
    });
    await joplin.workspace.onSyncComplete(async () => {
      syncOngoing = false;
      updateUI("syncComplete");
    });
    await joplin.settings.onChange(async () => {
      updateUI("settingsChange");
    });
  },
});

async function fetchData() {
  // Load settings
  const maxDegree = await joplin.settings.value(
    "SETTING_MAX_SEPARATION_DEGREE"
  );
  const maxNotes = await joplin.settings.value("SETTING_MAX_NODES");
  const filteredNotebookNames = await joplin.settings.value(
    "SETTING_NOTEBOOK_NAMES_TO_FILTER"
  );
  const namesToFilter: Array<string> = filteredNotebookNames.split(",");
  const shouldFilterChildren = await joplin.settings.value(
    "SETTING_FILTER_CHILD_NOTEBOOKS"
  );
  const isIncludeFilter =
    (await joplin.settings.value("SETTING_FILTER_IS_INCLUDE_FILTER")) ===
      "include";
  const includeBacklinks = await joplin.settings.value(
    "SETTING_INCLUDE_BACKLINKS"
  );
  const showLinkDirection = await joplin.settings.value(
    "SETTING_SHOW_LINK_DIRECTION"
  );

  const selectedNote = await joplin.workspace.selectedNote();
  const notes = await getNotes(
    selectedNote.id,
    maxNotes,
    maxDegree,
    namesToFilter,
    shouldFilterChildren,
    isIncludeFilter,
    includeBacklinks
  );

  const data: GraphData = {
    nodes: [],
    edges: [],
    currentNoteID: selectedNote.id,
    nodeFontSize: await joplin.settings.value("SETTING_NODE_FONT_SIZE"),
    nodeDistanceRatio:
      (await joplin.settings.value("SETTING_NODE_DISTANCE")) / 100.0,
    showLinkDirection,
    graphIsSelectionBased: maxDegree > 0
  };

  notes.forEach(function (note, id) {
    for (let link of note.links) {
      // Slice note link if link directs to an anchor
      var index = link.indexOf("#");
      if (index != -1) {
        link = link.substr(0, index);
      }

      // The destination note could have been deleted.
      const linkDestExists = notes.has(link);
      if (!linkDestExists) {
        continue;
      }

      data.edges.push({
        source: id,
        target: link,
        sourceDistanceToCurrentNode: notes.get(id).distanceToCurrentNote,
        targetDistanceToCurrentNode: notes.get(link).distanceToCurrentNote,
        focused: id === selectedNote.id || link === selectedNote.id,
      });

      // Mark nodes that are adjacent to the currently selected note.
      if (id === selectedNote.id) {
        notes.get(link).linkedToCurrentNote = true;
      } else if (link == selectedNote.id) {
        notes.get(id).linkedToCurrentNote = true;
      } else {
        const l = notes.get(link);
        l.linkedToCurrentNote = l.linkedToCurrentNote || false;
      }
    }
    data.nodes.push({
      id: id,
      title: note.title,
      focused: note.linkedToCurrentNote,
      distanceToCurrentNode: note.distanceToCurrentNote
    });
  });

  return data;
}

// rendez-vous between worker and job queue
async function notifyUI() {
  if (pollCb && modelChanges.length > 0) {
    let modelChange = modelChanges.shift();
    pollCb(modelChange);
    pollCb = undefined;
  }
}

async function recordModelChanges(event) {
  modelChanges.push(event);
}
