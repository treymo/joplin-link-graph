import joplin from "api";

export interface Notebook {
  id: string;
  title: string;
  parent_id: string;
}

export async function getNotebooks(): Promise<Array<Notebook>> {
  var allNotebooks = [];
  var page_num = 1;
  do {
    var notebooks = await joplin.data.get(["folders"], {
      fields: ["id", "title", "parent_id"],
      page: page_num,
    });
    allNotebooks.push(...notebooks.items);
    page_num++;
  } while (notebooks.has_more);

  return allNotebooks;
}

export interface Note {
  id: string;
  parent_id: string;
  title: string;
  links: any[];
  linkedToCurrentNote?: boolean;
}

interface JoplinNote {
  id: string;
  parent_id: string;
  title: string;
  body: string;
}

// Fetch notes
export async function getNotes(
  selectedNote: string,
  maxNotes: number,
  maxDegree: number
): Promise<Map<string, Note>> {
  if (maxDegree > 0) {
    return getLinkedNotes(selectedNote, maxDegree);
  } else {
    return getAllNotes(maxNotes);
  }
}

/**
 * Returns a filtered map of notes by notebook name.
 */
export async function filterNotesByNotebookName(
  notes: Map<string, Note>,
  notebooks: Array<Notebook>,
  filteredNotebookNames: Array<string>,
  shouldFilterChildren: boolean,
  isIncludeFilter: boolean
): Promise<Map<string, Note>> {
  // No filtering needed.
  if (filteredNotebookNames.length < 1) return notes;

  const notebookIdsByName = new Map<string, string>();
  notebooks.forEach((n) => notebookIdsByName.set(n.title, n.id));
  const notebooksById = new Map<string, Notebook>();
  notebooks.forEach((n) => notebooksById.set(n.id, n));

  // Get a list of valid notebook names to filter out.
  filteredNotebookNames = filteredNotebookNames.filter((name) =>
    notebookIdsByName.has(name)
  );

  function shouldIncludeNote(parent_id: string): boolean {
    var parentNotebook: Notebook = notebooksById.get(parent_id);
    // Filter out the direct parent.
    if (filteredNotebookNames.includes(parentNotebook.title)) {
      return isIncludeFilter;
    }

    // Filter a note if any of its ancestor notebooks are filtered.
    if (shouldFilterChildren) {
      while (parentNotebook !== undefined) {
        if (filteredNotebookNames.includes(parentNotebook.title)) {
          return isIncludeFilter;
        }
        parentNotebook = notebooksById.get(parentNotebook.parent_id);
      }
    }
    return !isIncludeFilter;
  }

  var filteredNotes = new Map<string, Note>();
  notes.forEach(function (n, id) {
    if (shouldIncludeNote(n.parent_id)) {
      filteredNotes.set(id, n);
    }
  });

  return filteredNotes;
}

// Fetches every note.
async function getAllNotes(maxNotes: number): Promise<Map<string, Note>> {
  var allNotes = new Array<JoplinNote>();
  var page_num = 1;
  do {
    // `parent_id` is the ID of the notebook containing the note.
    var notes = await joplin.data.get(["notes"], {
      fields: ["id", "parent_id", "title", "body"],
      order_by: "updated_time",
      order_dir: "DESC",
      limit: maxNotes < 100 ? maxNotes : 100,
      page: page_num,
    });
    allNotes.push(...notes.items);
    page_num++;
  } while (notes.has_more && allNotes.length < maxNotes);

  const noteMap = new Map();
  allNotes.map((note) => noteMap.set(note.id, buildNote(note)));
  return noteMap;
}

function buildNote(joplinNote: JoplinNote): Note {
  const links = getAllLinksForNote(joplinNote.body);
  return {
    id: joplinNote.id,
    title: joplinNote.title,
    parent_id: joplinNote.parent_id,
    links: links,
  };
}

// Fetch all notes linked to a given source note, up to a maximum degree of
// separation.
async function getLinkedNotes(
  source_id: string,
  maxDegree: number
): Promise<Map<string, Note>> {
  var pending = [];
  var visited = new Set();
  const noteMap = new Map();
  var degree = 0;

  pending.push(source_id);
  do {
    // Traverse a new batch of pending note ids, storing the note data in
    // the resulting map, and stashing the newly found linked notes for the
    // next iteration.
    const joplinNotes = await getNoteArray(pending);
    pending.forEach((pendingNoteId) => visited.add(pendingNoteId));
    pending = [];

    joplinNotes.forEach((joplinNote) => {
      // store note data to be returned at the end of the traversal
      const note = buildNote(joplinNote);
      noteMap.set(joplinNote.id, note);

      // stash any new links for the next iteration
      note.links.forEach((link) => {
        // prevent cycles by filtering notes we've already seen.
        if (!visited.has(link)) {
          pending.push(link);
        }
      });
    });

    degree++;

    // stop whenever we've reached the maximum degree of separation, or
    // we've exhausted the adjacent nodes.
  } while (pending.length > 0 && degree <= maxDegree);

  return noteMap;
}

async function getNoteArray(ids: string[]): Promise<Array<JoplinNote>> {
  var promises = ids.map((id) =>
    joplin.data.get(["notes", id], {
      fields: ["id", "parent_id", "title", "body"],
    })
  );

  // joplin queries could fail -- make sure we catch errors.
  const results = await Promise.all(promises.map((p) => p.catch((e) => e)));

  // remove from results any promises that errored out, returning the valid
  // subset of queries.
  const valid = results.filter((r) => !(r instanceof Error));
  return valid;
}

function getAllLinksForNote(noteBody: string) {
  const links = [];
  // TODO: needs to handle resource links vs note links. see 4. Tips note for
  // webclipper screenshot.
  // https://stackoverflow.com/questions/37462126/regex-match-markdown-link
  const linkRegexp = /\[\]|\[.*?\]\(:\/(.*?)\)/g;
  var match = null;
  do {
    match = linkRegexp.exec(noteBody);
    if (match != null && match[1] !== undefined) {
      links.push(match[1]);
    }
  } while (match != null);
  return links;
}
