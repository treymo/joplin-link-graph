import { Note } from "./types";
import {
  getAllNotes,
  getLinkedNotes
} from "./notes";
import { getFilteredNotebooks } from "./notebooks";
// every function required by index.ts is listed here

// Fetch notes
async function getNotes(
    selectedNote: string,
    maxNotes: number,
    maxDegree: number,
    filteredNotebookNames: string,
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean,
    includeBacklinks: boolean
): Promise<Map<string, Note>> {
  var notes = new Map<string, Note>();

  const notebooksToFilter = await getFilteredNotebooks(
    filteredNotebookNames,
    shouldFilterChildren,
    isIncludeFilter
  )

  if (maxDegree > 0) {
    notes = await getLinkedNotes(
      selectedNote,
      maxDegree,
      includeBacklinks,
      notebooksToFilter
    )
  } else {
    notes = await getAllNotes(
      maxNotes,
      notebooksToFilter
    )
  }
  return notes;
}

export {
  getNotes
}

// re-export these functions
export {
  getAllLinksForNote,
  getNoteTags
} from "./notes"