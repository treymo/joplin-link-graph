import joplin from "api";
import { registerSettings } from "./settings";
import { MenuItemLocation, ToolbarButtonLocation } from "api/types";
import { getNotes, getAllLinksForNote, getNoteTags } from "./data/data";
import { linksChanged } from "./data/utils";
import { buildGraphData, GraphData } from "./data/graph";
var deepEqual = require("fast-deep-equal");

let data: GraphData;
let pollCb: any;
let modelChanges = [];

joplin.plugins.register({
  onStart: async function () {
    await registerSettings();
    const panels = joplin.views.panels;
    const view = await panels.create("note-graph-view");
    await panels.setHtml(view, "Note Graph is Loading");
    var prevData = {};
    var prevNoteLinks: Set<string>;
    var syncOngoing = false;
    var refreshOwed = false;

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
        const isVisible = await panels.visible(view);
        await panels.show(view, !isVisible);
        if (!isVisible && refreshOwed) {
          await updateUI("showGraphUI");
        }
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
      switch (message.name) {
        case "poll":
          let p = new Promise((resolve) => {
            pollCb = resolve;
          });
          notifyUI();
          return p;
        // A hidden panel keeps its webview mounted and sending this message, so the
        // fetch is gated on visibility here as well as in updateUI (https://github.com/laurent22/joplin/blob/v3.6.16/packages/app-desktop/gui/ResizableLayout/LayoutItemContainer.tsx#L22-L25).
        case "update":
          if (!(await panels.visible(view))) {
            refreshOwed = true;
            return { name: "update", data: data };
          }
          data = await fetchData();
          prevData = data;
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

      if (!(await panels.visible(view))) {
        refreshOwed = true;
        return;
      }
      refreshOwed = false;

      const maxDegree = await joplin.settings.value(
        "SETTING_MAX_SEPARATION_DEGREE"
      );
      const selectedNote = await joplin.workspace.selectedNote();
      const selectedNoteLinks = getAllLinksForNote(
        selectedNote ? selectedNote.body : ""
      );
      if (typeof data === "undefined" || eventName === "noteSelectionChange") {
        prevNoteLinks = selectedNoteLinks;
      }

      var dataChanged = false;
      // Speed up the inital load by skipping the eventName switch.
      if (typeof data === "undefined") {
        data = await fetchData();
        dataChanged = true;
      } else {
        if (eventName === "noteChange") {
          if (linksChanged(prevNoteLinks, selectedNoteLinks)) {
            prevNoteLinks = selectedNoteLinks;
            data = await fetchData();
            dataChanged = !deepEqual(data, prevData);
          }
        } else if (eventName === "noteSelectionChange" && maxDegree == 0) {
          // noteSelectionChange should just re-center the graph, no need to fetch all new data and compare.
          const newlySelectedNoteId = selectedNote ? selectedNote.id : null;
          data.currentNoteID = newlySelectedNoteId;
          data.edges.forEach((edge) => {
            const shouldHaveFocus =
              edge.source === newlySelectedNoteId ||
              edge.target === newlySelectedNoteId;
            edge.focused = shouldHaveFocus;
          });
          data.nodes.forEach((node) => {
            node.focused = node.id === newlySelectedNoteId;
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
  const notebookFilterString = await joplin.settings.value(
    // settings key name can't be updated without users losing their current settings
    "SETTING_NOTEBOOK_NAMES_TO_FILTER"
  );
  const shouldFilterChildren = await joplin.settings.value(
    "SETTING_FILTER_CHILD_NOTEBOOKS"
  );
  const isIncludeFilter =
    (await joplin.settings.value("SETTING_FILTER_IS_INCLUDE_FILTER")) ===
      "include";
  const includeBacklinks = await joplin.settings.value(
    "SETTING_INCLUDE_BACKLINKS"
  );
  const excludedBacklinkNoteTitles = await joplin.settings.value(
    "SETTING_NOTE_TITLES_TO_EXCLUDE_FROM_BACKLINKS"
  );
  const showLinkDirection = await joplin.settings.value(
    "SETTING_SHOW_LINK_DIRECTION"
  );

  const selectedNote = await joplin.workspace.selectedNote();
  const selectedNoteId = selectedNote ? selectedNote.id : null;
  const notes = await getNotes(
    selectedNoteId,
    maxNotes,
    maxDegree,
    notebookFilterString,
    shouldFilterChildren,
    isIncludeFilter,
    includeBacklinks,
    excludedBacklinkNoteTitles
  );

  return buildGraphData(notes, selectedNoteId, {
    nodeFontSize: await joplin.settings.value("SETTING_NODE_FONT_SIZE"),
    nodeDistanceRatio:
      (await joplin.settings.value("SETTING_NODE_DISTANCE")) / 100.0,
    showLinkDirection,
    graphIsSelectionBased: maxDegree > 0,
  });
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
