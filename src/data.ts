import joplin from 'api';

export interface Notebook {
  id: string;
  title: string;
  parent_id: string;
}

export async function getNotebooks(): Promise<Array<Notebook>> {
  var allNotebooks = []
  var page_num = 1;
  do {
    var notebooks = await joplin.data.get(['folders'], {
      fields: ['id', 'title', 'parent_id'],
      page: page_num,
    });
    allNotebooks.push(...notebooks.items);
    page_num++;
  } while (notebooks.has_more)

  return allNotebooks;
}

export interface Note {
  id: string;
  parent_id: string;
  title: string;
  body: string;
  linkedToCurrentNote?: boolean;
}

// Fetch notes
export async function getNotes(
  selectedNote: string, maxNotes: number, maxDegree: number): Promise<Map<string, Note>> {
  if(maxDegree > 0) {
    return getLinkedNotes(selectedNote, maxDegree);
  } else {
    return getAllNotes(maxNotes);
  }
}

// Fetches every note.
async function getAllNotes(maxNotes: number): Promise<Map<string, Note>> {
  var allNotes = []
  var page_num = 1;
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

// Fetch all notes linked to a given source note, up to a maximum degree of
// separation.
async function getLinkedNotes(source_id:string, maxDegree:number) : Promise<Map<string, Note>> {

  var pending = [];
  var visited = [];
  const noteMap = new Map();
  var degree = 0;

  pending.push(source_id);
  do {
    // Traverse a new batch of pending note ids, storing the note data in
    // the resulting map, and stashing the newly found linked notes for the
    // next iteration.

    const notes = await getNoteArray(pending);
    visited.push(...pending);
    pending = [];

    notes.forEach(note => {

      // store note data to be returned at the end
      // of the traversal
      const links = getAllLinksForNote(note.body);
      noteMap.set(note.id, {
        title: note.title,
        parent_id: note.parent_id,
        links: links});

      // stash any new links for the next iteration
      links.forEach(link => {

        // prevent cycles by filtering notes we've already seen.
        // TODO this check can get expensive for massive graphs
        if(!visited.includes(link)) {
          pending.push(link);
        }
      });
    });

    degree++;

    // stop whenever we've reached the maximum degree of separation, or
    // we've exhausted the adjacent nodes.
  } while(pending.length > 0 && degree <= maxDegree);

  return noteMap;
}

async function getNoteArray(ids:string[]) {

  var promises = ids.map( id =>
    joplin.data.get(['notes', id], {
      fields: ['id', 'parent_id', 'title', 'body']
    })
  );

  // joplin queries could fail -- make sure we catch errors.
  const results = await Promise.all(promises.map( p => p.catch(e => e)));

  // remove from results any promises that errored out, returning the valid
  // subset of queries.
  const valid = results.filter(r => !(r instanceof Error));
  return valid;
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
