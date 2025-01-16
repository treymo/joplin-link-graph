import { Note, Notebook } from "./types";
import { getFilteredNotebooks } from "./notebooks";
import { getNotesFromTagString } from "./tags";

// functions to do with filtering go here

/**
 * Takes all note filter parameters and returns a simplified function that filters a Map of notes
 *
 * @param notebookFilterString comma separated string of notebooks to filter by, values can be IDs or names
 * @param shouldFilterChildren boolean toggle for filtering notes in notebooks that are children of the filters
 * @param isIncludeFilter boolean toggle to invert selected notebooks
 * @param filteredTagsNames comma separated string of tags to filter by, values must be names only
 * @param isTagsIncludeFilter boolean toggle to include or exclude by tags
 */
export async function getFilterFunction(
  notebookFilterString: string,
  shouldFilterChildren: boolean,
  isIncludeFilter: boolean,
  filteredTagsNames: string,
  isTagsIncludeFilter: boolean
): Promise<(nm: Map<string, Note>) => Map<string, Note>> {
    let notebooks = await getFilteredNotebooks(
      notebookFilterString,
      shouldFilterChildren,
      isIncludeFilter
    )

    const notesFromTags = await getNotesFromTagString(filteredTagsNames)

    // TODO: update filter func as more filter options get added
    let filterFunc =
      (a: Map<string, Note>) => {
          if (notebooks.length > 0) {
              a = filterNotesByNotebook(a, notebooks)
          }

          a = new Map(
            [...a]
              .filter(([k, v])=>
                  notesFromTags
                    .map(n => n.id)
                    // keeps when .includes() and isTagsIncludeFilter are either both true or both false
                    // it's an XNOR gate
                    .includes(v.id) == isTagsIncludeFilter
              )
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