import joplin from 'api';
import * as joplinData from './data';
import { SettingItemType, ToolbarButtonLocation } from 'api/types';
var deepEqual = require('deep-equal')

const DEFAULT_NODE_FONT_SIZE = 20;
const DEFAULT_MAX_NOTES = 700;
const DEFAULT_MAX_DEGREE = 0;

async function createSettings() {
  const sectionName = "graph-ui.settings"
  await joplin.settings.registerSection(sectionName, {
    label: 'Graph UI',
    // Check out https://forkaweso.me/Fork-Awesome/icons/ for available icons.
    iconName: 'fas fa-sitemap'
  });

  await joplin.settings.registerSetting('nodeNameFontSize', {
    value: DEFAULT_NODE_FONT_SIZE,
    type: SettingItemType.Int,
    section: sectionName,
    public: true,
    label: '(Requires restart) Size of the node label font',
    description: 'Font size for the label of nodes on the graph..'
  });

  await joplin.settings.registerSetting('maxNodesOnGraph', {
    value: DEFAULT_MAX_NOTES,
    type: SettingItemType.Int,
    section: sectionName,
    public: true,
    label: 'Max nodes in graph',
    description: 'Maximum number of nodes shown in the graph. Most recent nodes have priority.'
  });

  await joplin.settings.registerSetting("filteredNotebookNames", {
    value: "",
    type: SettingItemType.String,
    section: sectionName,
    public: true,
    label: "Notebooks names to filter out",
    description: "Comma separated list of Notebook names to filter.",
  });

  await joplin.settings.registerSetting("filterChildNotebooks", {
    value: true,
    type: SettingItemType.Bool,
    section: sectionName,
    public: true,
    label: "Filter out child notebooks",
    description: "Filters out notebooks that are children of the notebooks listed above.",
  });

  await joplin.settings.registerSetting("maxSeparationDegree", {
    value: DEFAULT_MAX_DEGREE,
    type: SettingItemType.Int,
    minimum: 0,
    section: sectionName,
    public: true,
    label: "Max degree of separation",
    description: "Maximum number of link jumps from selected note. Zero for all notes",
  });
}

/**
 * Returns a list of notes to be filtered out of the graph display.
 */
async function getFilteredNotes(notes: Map<string, joplinData.Note>,
  notebooks: Array<joplinData.Notebook>) {
  const filteredNotebookNames = await joplin.settings.value("filteredNotebookNames");
  // No filtering needed.
  if ("" === filteredNotebookNames) return new Set();

  const notebooksByName = new Map();
  const notebooksById = new Map();
  notebooks.forEach(n => notebooksByName.set(n.title, n.id))
  notebooks.forEach(n => notebooksById.set(n.id, n))

  // Get a list of valid notebook names to filter out.
  var namesToFilter : Array<string> = filteredNotebookNames.split(",");
  namesToFilter = namesToFilter.filter(name => notebooksByName.has(name));

  // Turn notebook names into IDs.
  const notebookIDsToFilter : Set<string> = new Set(namesToFilter.map(name => notebooksByName.get(name)));

  const shouldFilterChildren = await joplin.settings.value("filterChildNotebooks");
  const filteredNotes = new Set<string>();
  notes.forEach(function(n, id) {
    var parentNotebook: joplinData.Note = notebooksById.get(n.parent_id)
    if (shouldFilterChildren) {
      // Filter a note if any of its ancestor notebooks are filtered.
      while (parentNotebook !== undefined) {
        if (notebookIDsToFilter.has(parentNotebook.id)) {
          filteredNotes.add(id);
          break;
        }
        parentNotebook = notebooksById.get(parentNotebook.parent_id);
      }
    } else {
      // Only filter the immediate children of the notebook.
      if (notebookIDsToFilter.has(parentNotebook.id)) {
        filteredNotes.add(id);
      }
    }
  });

  return filteredNotes;
}

async function fetchData() {
  const selectedNote = await joplin.workspace.selectedNote();
  const notes = await joplinData.getNotes(selectedNote.id);
  const notebooks = await joplinData.getNotebooks();
  var noteIDsToExclude = await getFilteredNotes(notes, notebooks);

  const data = {
    "nodes": [],
    "edges": [],
    "currentNoteID": selectedNote.id,
  };

  notes.forEach(function(note, id) {
    if (noteIDsToExclude.has(id)) return;

    var links = note["links"]
    for (const link of links) {
      if (noteIDsToExclude.has(link)) continue;

      var linkDestExists = notes.has(link);
      if (linkDestExists) {
        data.edges.push({
          "source": id,
          "target": link,
          "focused": (id === selectedNote.id || link === selectedNote.id),
        });

        // Mark nodes that are adjacent to the currently selected note.
        if (id === selectedNote.id) {
          notes.get(link).linkedToCurrentNote = true;
        } else if (link == selectedNote.id) {
          notes.get(id).linkedToCurrentNote = true;
        } else {
          const l = notes.get(link);
          l.linkedToCurrentNote = (l.linkedToCurrentNote || false);
        }
      }
    }
  });

  notes.forEach(function(note, id) {
    if (noteIDsToExclude.has(id)) return;
    data.nodes.push({
      "id": id,
      "title": note.title,
      "focused": note.linkedToCurrentNote,
    })
  });
  return data;
}

joplin.plugins.register({
  onStart: async function() {
    await createSettings();
    const panels = joplin.views.panels;
    const view = await (panels as any).create();
    await panels.setHtml(view, 'Note Graph');

    var prevData = {};
    var syncOngoing = false;
    var data = await fetchData();
    var prevNodeFontSize = await joplin.settings.value("nodeNameFontSize");
    var nodeFontSize = prevNodeFontSize

    // Create a toolbar button
    await joplin.commands.register({
      name: 'showHideGraphUI',
      label: 'Show/Hide Graph View',
      iconName: 'fas fa-sitemap',
      execute: async () => {
        const isVisible = await (panels as any).visible(view);
        (panels as any).show(view, !isVisible);
      },
    });
    await joplin.views.toolbarButtons.create('graphUIButton', 'showHideGraphUI', ToolbarButtonLocation.NoteToolbar);

    // Build Panel
    await panels.addScript(view, './d3.min.js');
    await panels.addScript(view, './webview.css');
    await panels.addScript(view, './note-graph.js');
    panels.onMessage(view, (message:any) => {
      if (message.name === "d3JSLoaded") {
        prevData = data
        return data;
      } else if (message.name === "checkForUpdate") {
        if (message.force === true) {
          prevData = data
          return data;
        }

        if (!syncOngoing) {
          var dataChanged = !deepEqual(data, prevData)
          var settingsChanged = nodeFontSize != prevNodeFontSize;
          if (dataChanged || settingsChanged) {
            prevNodeFontSize = nodeFontSize;
            prevData = data;
            return data;
          }
        }

        return undefined;
      } else if (message.name === "navigateTo") {
        joplin.commands.execute('openNote', message.id)
      }
    });

    async function drawPanel() {
      await panels.setHtml(view, `
                  <div class="graph-content">
                      <div class="header-area">
                        <button onclick="refreshData(true)">Redraw Graph</button>
                        <p class="header">Note Graph</p>
                      </div>
                      <div class="container">
                        <div id="note_graph" style="font-size: ${nodeFontSize}px"/>
                      </div>
        </div>
      `);
    };

    await drawPanel();

    async function updateGraphView() {
      data = await fetchData();
    };

    await joplin.workspace.onNoteChange(() => {
      updateGraphView();
    });
    await joplin.workspace.onNoteSelectionChange(() => {
      updateGraphView();
    });
    await joplin.settings.onChange(() => {
      joplin.settings.value("nodeNameFontSize").then(newFontSize => {
        nodeFontSize = newFontSize;
        // TODO: why does this cause the graph to disappear?
        // drawPanel();
      });
    });

    await joplin.workspace.onSyncStart(() => {
      syncOngoing = true;
    });
    await joplin.workspace.onSyncComplete(() => {
      syncOngoing = false;
    });

  },
});
