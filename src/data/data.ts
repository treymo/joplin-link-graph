import { Note } from "./types";
import {
  getAllNotes,
  getLinkedNotes
} from "./notes";
// every function required by index.ts is listed here

// Fetch notes
async function getNotes(
    selectedNote: string,
    maxNotes: number,
    maxDegree: number,
    namesToFilter: Array<string> = undefined,
    shouldFilterChildren: boolean = undefined,
    isIncludeFilter: boolean = undefined,
    includeBacklinks: boolean = undefined
): Promise<Map<string, Note>> {
  var notes = new Map<string, Note>();
  if (maxDegree > 0) {
    notes = await getLinkedNotes(
      selectedNote,
      maxDegree,
      includeBacklinks,
      namesToFilter,
      shouldFilterChildren,
      isIncludeFilter
    )
  } else {
    notes = await getAllNotes(
      maxNotes,
      namesToFilter,
      shouldFilterChildren,
      isIncludeFilter
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