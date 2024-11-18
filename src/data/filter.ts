import { Note, Notebook } from "./types";

// functions to do with filtering go here

/**
 * Returns a filtered map of notes by notebook.
 */
export function filterNotesByNotebook(
  noteMap: Map<string, Note>,
  notebooks: Array<Notebook>
): Map<string, Note> {
    if (notebooks.length == 0) {
        return noteMap
    }

    let newNoteMap: Map<string, Note> = new Map()

    noteMap.forEach((v, k, m) => {
        // if note's parent id (the folder it lives in) doesn't match any excluded notebook IDs, include it
        if (notebooks
          .filter(nb => nb.id == v.parent_id)
          .length == 0
        ) {
            newNoteMap.set(k, v)
        }
    })

    return newNoteMap
}