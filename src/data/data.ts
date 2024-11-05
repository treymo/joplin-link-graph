import { Note } from "./types";
import { getNotebooks } from "./notebooks"
import { getAllNotes, getLinkedNotes } from "./notes";
import { filterNotesByNotebookName } from "./filter";

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
    notes = await getLinkedNotes(selectedNote, maxDegree, includeBacklinks);
  } else {
    notes = await getAllNotes(maxNotes);
  }
  if (namesToFilter.length > 0) {
    const notebooks = await getNotebooks();
    notes = await filterNotesByNotebookName(
      notes,
      notebooks,
      namesToFilter,
      shouldFilterChildren,
      isIncludeFilter
    );
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