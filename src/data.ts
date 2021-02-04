import joplin from 'api';

export async function getNotebooks(): Promise<Array<any>> {
  var allNotebooks = []
  var page_num = 1;
  do {
    var notebooks = await joplin.data.get(['folders'], {
      fields: ['id', 'title'],
      page: page_num,
    });
    allNotebooks.push(...notebooks.items);
    page_num++;
  } while (notebooks.has_more)

  return allNotebooks;
}

// Fetches every note.
export async function getNotes(): Promise<Map<string, any>> {
  var allNotes = []
  var page_num = 1;
  const maxNotes = await joplin.settings.value("maxNodesOnGraph")
  do {
    // `parent_id` is the ID of the notebook containing the note.
    var notes = await joplin.data.get(['notes'], {
      fields: ['id', 'parent_id', 'title', 'body'],
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
    noteMap.set(note.id, {title: note.title, parent_id: note.parent_id, links: links})
  }
  return noteMap;
}

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
