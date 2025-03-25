import { Note } from "./types";
import {
  getAllNotes,
  getLinkedNotes
} from "./notes";
import { getFilterFunction } from "./filter";
// every function required by index.ts is listed here

/**
 * Collects notes from Joplin according to given parameters
 *
 * @param selectedNote ID of currently selected note, used when getting linked notes
 * @param maxNotes maximum notes to collect, used when getting all notes
 * @param maxDegree maximum distance away from the current note to get notes for, used when getting linked notes, set to 0 to get all notes
 * @param filteredNotebookNames comma separated string of notebooks to ***exclude***, values should be names
 * @param shouldFilterChildren boolean toggle to also include notebooks that are the children of those in the filter
 * @param isIncludeFilter boolean toggle to invert selected notebooks (default value is `false` to exclude, set to `true` to use filter values for inclusion)
 * @param includeBacklinks boolean toggle to also use backlinks to collect notes, used when getting linked notes
 */
async function getNotes(
    selectedNote: string,
    maxNotes: number,
    maxDegree: number,
    filteredNotebookNames: string,
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean,
    includeBacklinks: boolean
): Promise<Map<string, Note>> {
  let notes = new Map<string, Note>();

  const filterFunc = await getFilterFunction(
    filteredNotebookNames,
    shouldFilterChildren,
    isIncludeFilter
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