import { Note, Notebook } from "./types";
import { getFilteredNotebooks } from "./notebooks";

// functions to do with filtering go here

/**
 * Takes all note filter parameters and returns a simplified function that filters a Map of notes
 *
 * @param notebookFilterString comma separated string of notebooks to filter by, values can be IDs or names
 * @param shouldFilterChildren boolean toggle for filtering notes in notebooks that are children of the filters
 * @param isIncludeFilter boolean toggle to invert selected notebooks
 * @param filteredNoteIDs comma separated string of notes to filter by, values can be IDs only
 */
export async function getFilterFunction(
  notebookFilterString: string,
  shouldFilterChildren: boolean,
  isIncludeFilter: boolean,
  filteredNoteIDs: string
): Promise<(nm: Map<string, Note>) => Map<string, Note>> {
    let notebooks = await getFilteredNotebooks(
      notebookFilterString,
      shouldFilterChildren,
      isIncludeFilter
    )

    const noteIDs = filteredNoteIDs.split(",")

    // TODO: update filter func as more filter options get added
    let filterFunc =
      (a: Map<string, Note>) => {
          if (notebooks.length > 0) {
              a = filterNotesByNotebook(a, notebooks)
          }

          a = new Map(
            // spread the previous map into an array, allowing use of .filter()
            [...a]
              .filter(([k, v]) => ! noteIDs.includes(v.id))
          )

          return a
      }

    return filterFunc
}


/**
 * Returns a filtered map of notes by notebook.
 */
function filterNotesByNotebook(
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