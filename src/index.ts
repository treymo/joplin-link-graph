import joplin from "api";
import * as joplinData from "./data";
import { registerSettings } from "./settings";
import { MenuItemLocation, ToolbarButtonLocation } from "api/types";
var deepEqual = require("deep-equal");

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
    "include"
      ? true
      : false;

  const selectedNote = await joplin.workspace.selectedNote();
  const notes = await joplinData.getNotes(
    selectedNote.id,
    maxNotes,
    maxDegree,
    namesToFilter,
    shouldFilterChildren,
    isIncludeFilter
  );

  const data = {
    nodes: [],
    edges: [],
    currentNoteID: selectedNote.id,
    nodeFontSize: await joplin.settings.value("SETTING_NODE_FONT_SIZE"),
    nodeDistanceRatio:
      (await joplin.settings.value("SETTING_NODE_DISTANCE")) / 100.0,
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

let data: any;
let pollCb: any;
let modelChanges = [];

joplin.plugins.register({
  onStart: async function () {
    await registerSettings();
    const panels = joplin.views.panels;
    const view = await (panels as any).create("note-graph-view");
    await panels.setHtml(view, "Note Graph is Loading");
    var prevData = {};
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

    panels.onMessage(view, async (message: any) => {
      if (message.name === "poll") {
        let p = new Promise((resolve) => {
          pollCb = resolve;
        });
        notifyUI();
        return p;
      } else if (message.name === "update") {
        return { name: "update", data: data };
      } else if (message.name === "navigateTo") {
        joplin.commands.execute("openNote", message.id);
      }
    });

    async function updateUI(eventName: string) {
      if (syncOngoing) {
        return;
      }
      data = await fetchData();
      var dataChanged = !deepEqual(data, prevData);
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
