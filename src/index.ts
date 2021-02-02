import joplin from 'api';
import { SettingItemType } from 'api/types';
var deepEqual = require('deep-equal')

const DEFAULT_MAX_NOTES = 700;

function getAllLinksForNote(noteBody:string) {
  const links = [];
  // TODO: needs to handle resource links vs note links. see 4. Tips note for
  // webclipper screenshot.
  // https://stackoverflow.com/questions/37462126/regex-match-markdown-link
  const linkRegexp = (/\[\]|\[.*?\]\(:\/(.*?)\)/g);
  var match = linkRegexp.exec(noteBody);
  while (match != null) {
    if (match[1] !== undefined) {
      links.push(match[1]);
    }
    match = linkRegexp.exec(noteBody);
  }
  return links;
}

// Fetches every note.
async function getNotes(): Promise<Map<string, any>> {
  var allNotes = []
  var page_num = 1;
  const maxNotes = await joplin.settings.value("maxNodesOnGraph")
  do {
    var notes = await joplin.data.get(['notes'], {
      fields: ['id', 'title', 'body'],
      order_by: 'updated_time',
      order_dir: 'DESC',
      limit: maxNotes < 100 ? maxNotes : 100,
      page: page_num,
    });
    allNotes.push(...notes.items);
    page_num++;
  } while (notes.has_more && allNotes.length < maxNotes)

  const noteMap = new Map();
  for (const note of allNotes) {
    var links = getAllLinksForNote(note.body);
    noteMap.set(note.id, {title: note.title, links: links})
  }
  return noteMap;
}

async function createSettings() {
    await joplin.settings.registerSection('graph-ui.settings', {
      label: 'Graph UI',
      // Check out https://forkaweso.me/Fork-Awesome/icons/ for available icons.
      iconName: 'fas fa-sitemap'
    });

     await joplin.settings.registerSetting('maxNodesOnGraph', {
      value: DEFAULT_MAX_NOTES,
      type: SettingItemType.Int,
      section: 'graph-ui.settings',
      public: true,
      label: 'Max nodes in graph',
      description: 'Maximun number of nodes shown in the graph. Most recent nodes have priority.'
    });

}

async function fetchData() {
    const notes = await getNotes()
    const data = {
      "nodes": [],
      "edges": [],
    }

    notes.forEach(function(value, id) {
      data.nodes.push({
        "id": id,
        "title": value.title,
      })
      var links = value["links"]
      if (links.length > 0) {
        for (const link of links) {
          // Ignore links that don't link to notes.
          if (notes.has(link)) {
            data.edges.push({
              "source": id,
              "target": link,
            });
          }
        }
      }
    });
  return data;
}

joplin.plugins.register({
  onStart: async function() {
    await createSettings();
    const panels = joplin.views.panels;
    const view = await (panels as any).create();
    var prevData = {};
    var data = await fetchData();

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
        var sameData = deepEqual(data, prevData)
        if (!sameData) {
          prevData = data
          return data;
        }
        return undefined;
      } else if (message.name === "navigateTo") {
        joplin.commands.execute('openNote', message.id)
      }
    });

    await panels.setHtml(view, `
                <div class="outline-content">
                    <div class="header-area">
                      <button onclick="refreshData(true)">Redraw Graph</button>
                      <p class="header">Note Graph</p>
                    </div>
                    <div class="container">
                      <div id="note_graph"/>
                    </div>
      </div>
    `);

    async function updateGraphView() {
      data = await fetchData();
    };

    await joplin.workspace.onNoteContentChange(() => {
      updateGraphView();
    });
    await joplin.workspace.onNoteSelectionChange(() => {
      updateGraphView();
    });
  },
});
