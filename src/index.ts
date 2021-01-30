import joplin from 'api';
var deepEqual = require('deep-equal')

function noteLinks(noteBody:string) {
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

// TODO: note type instead of Any
async function getNotes(): Promise<Map<string, any>> {
  const notes = await joplin.data.get(['notes'], {
    fields: ['id', 'title', 'body'],
    order_by: 'updated_time',
    order_dir: 'DESC',
  });

  const noteMap = new Map();
  for (const note of notes.items) {
    var links = noteLinks(note.body);
    noteMap.set(note.id, {title: note.title, links: links})
  }
  return noteMap;
}

joplin.plugins.register({
  onStart: async function() {
    const panels = joplin.views.panels;
    const view = await (panels as any).create();
    var prevData = {};

    await panels.addScript(view, './d3.min.js');
    await panels.addScript(view, './note-graph.js');

    async function updateGraphView() {
      const data = {
        "nodes": [],
        "edges": [],
      }
      panels.onMessage(view, (message:any) => {
        if (message.name === "d3JSLoaded") {
          prevData = data
          return data;
        } else if (message.name === "checkForUpdate") {
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

      const notes = await getNotes()
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


      // TODO: move to settings
      const fontSize = 10
      const fontWeight = "normal"

      await panels.setHtml(view, `
                  <div class="outline-content">
                      <p class="header">Links</p>
                      <div class="container" style="
                          font-size: ${fontSize}pt;
                          font-weight: ${fontWeight};
                      ">
                        <div id="note_graph"></div>
                      </div>
        </div>
      `);
    };

    await joplin.workspace.onNoteContentChange(() => {
      updateGraphView();
    });
    updateGraphView();
  },
});
