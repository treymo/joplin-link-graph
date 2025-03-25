import { Note, Notebook } from "./types";
import { getFilteredNotebooks } from "./notebooks";

// functions to do with filtering go here

/**
 * Takes all note filter parameters and returns a simplified function that filters a Map of notes
 *
 * @param notebookFilterString comma separated string of notebooks to ***exclude***, values should be names
 * @param shouldFilterChildren boolean toggle to also include notebooks that are the children of those in the filter
 * @param isIncludeFilter boolean toggle to invert selected notebooks
 *
 * @returns a promise for a function of type `(nm: Map<string, Note>) => Map<string, Note>` that can be used to filter notes
 */
export async function getFilterFunction(
  notebookFilterString: string,
  shouldFilterChildren: boolean,
  isIncludeFilter: boolean
): Promise<(nm: Map<string, Note>) => Map<string, Note>> {
    let notebooks = await getFilteredNotebooks(
      notebookFilterString,
      shouldFilterChildren,
      isIncludeFilter
    )

    // TODO: update filter func as more filter options get added
    let filterFunc =
      (a: Map<string, Note>) => {
          if (notebooks.length > 0) {
              a = filterNotesByNotebook(a, notebooks)
          }

          return a
      }

    return filterFunc
}


/**
 * Returns a filtered map of notes by notebook.
 *
 * @param noteMap map of ID to Note objects to be filtered on
 * @param excludedNotebooks array of Notebook objects to ***exclude*** notes with
 *
 * @returns a new `Map<string, Note>` according to the filtered notebooks
 */
function filterNotesByNotebook(
  noteMap: Map<string, Note>,
  excludedNotebooks: Array<Notebook>
): Map<string, Note> {
    if (excludedNotebooks.length == 0) {
        return noteMap
    }

    let newNoteMap: Map<string, Note> = new Map()

    noteMap.forEach((v, k, m) => {
        // if note's parent id (the folder it lives in) doesn't match any excluded notebook IDs, include it
        if (excludedNotebooks
          .filter(nb => nb.id == v.parent_id)
          .length == 0
        ) {
            newNoteMap.set(k, v)
        }
    })

    return newNoteMap
}