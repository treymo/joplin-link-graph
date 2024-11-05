import { Note } from "./types";
import {
  getAllNotes,
  getAllNotesFiltered,
  getLinkedNotes,
  getLinkedNotesFiltered
} from "./notes";
// every function required by index.ts is listed here

// Fetch notes
async function getNotes(
    selectedNote: string,
    maxNotes: number,
    maxDegree: number,
    namesToFilter: Array<string>,
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean,
    includeBacklinks: boolean
): Promise<Map<string, Note>> {
  var notes = new Map<string, Note>();
  if (maxDegree > 0) {
    if (namesToFilter.length > 0) {
      notes = await getLinkedNotesFiltered(
          selectedNote,
          maxDegree,
          includeBacklinks,
          namesToFilter,
          shouldFilterChildren,
          isIncludeFilter
      )
    } else {
      notes = await getLinkedNotes(
          selectedNote,
          maxDegree,
          includeBacklinks
      )
    }
  } else {
    if (namesToFilter.length > 0) {
      notes = await getAllNotesFiltered(
          maxNotes,
          namesToFilter,
          shouldFilterChildren,
          isIncludeFilter
      )
    } else {
      notes = await getAllNotes(maxNotes)
    }
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