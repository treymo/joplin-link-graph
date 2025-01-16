import { Note } from "./types";
import {
  getAllNotes,
  getLinkedNotes
} from "./notes";
import { getFilterFunction } from "./filter";
// every function required by index.ts is listed here

// Fetch notes
async function getNotes(
    selectedNote: string,
    maxNotes: number,
    maxDegree: number,
    filteredNotebookNames: string,
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean,
    filteredTagsNames: string,
    isTagsIncludeFilter: boolean,
    includeBacklinks: boolean
): Promise<Map<string, Note>> {
  let notes = new Map<string, Note>();

  const filterFunc = await getFilterFunction(
    filteredNotebookNames,
    shouldFilterChildren,
    isIncludeFilter,
    filteredTagsNames,
    isTagsIncludeFilter
  )

  if (maxDegree > 0) {
    notes = await getLinkedNotes(
      selectedNote,
      maxDegree,
      includeBacklinks,
      filterFunc
    )
  } else {
    notes = await getAllNotes(
      maxNotes,
      filterFunc
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