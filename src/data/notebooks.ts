import joplin from "../../api";
import { Notebook } from "./types";

// Functions to do with notebooks or notebooks metadata goes here

/**
 * Gets all notebooks
 */
export async function getNotebooks(): Promise<Array<Notebook>> {
    var allNotebooks = [];
    var page_num = 1;
    do {
        var notebooks = await joplin.data.get(["folders"], {
            fields: ["id", "title", "parent_id"],
            page: page_num,
        });
        allNotebooks.push(...notebooks.items);
        page_num++;
    } while (notebooks.has_more);

    return allNotebooks;
}

/**
 * Get notebooks according to given parameters
 *
 * @param filterString comma separated string of notebook names to add to filter
 * @param shouldFilterChildren boolean toggle to also add children of filtered notebooks to filter
 * @param isIncludeFilter boolean toggle to invert selected notebooks
 */
export async function getFilteredNotebooks(
  filterString: string,
  shouldFilterChildren: boolean,
  isIncludeFilter: boolean
): Promise<Notebook[]> {
    const allNotebooks = await getNotebooks()

    let filteredNotebooks = await getNotebooksByNameAndIDs(filterString, allNotebooks)

    if (shouldFilterChildren) {
        filteredNotebooks = getNotebookChildren(filteredNotebooks, allNotebooks)
    }

    if (isIncludeFilter) {
        filteredNotebooks = invertNotebookSelection(filteredNotebooks, allNotebooks)
    }

    return filteredNotebooks
}

async function getNotebooksByNameAndIDs(
  filterText: string,
  allNotebooks: Notebook[]
): Promise<Notebook[]> {
    let filteredNotebooks = []

    for (const text of filterText.split(",")) {
        // wrapped in try block because Joplin will throw an error if the query ID isn't in the right format
        try {
            let notebook = await joplin.data.get(
              ["folders", text], {
                  fields: ["id", "title", "parent_id"],
                  page: 1,
              });

            if (notebook) {
                filteredNotebooks.push(notebook)
            } else {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("good format but no search results")
            }
        } catch {
            // if we didn't find a notebook, it's not an ID, so we do a name search instead
            const notebooks = allNotebooks
              .filter(nb => nb.title == text)

            filteredNotebooks.push(...notebooks)
        }
    }

    return filteredNotebooks
}

function getNotebookChildren(
  notebooks: Notebook[],
  allNotebooks: Notebook[]
): Notebook[] {
    // for every notebook, if
    //   - it's parent is in the filter list
    //   - it's not in the filter list itself
    // are both true, then it's a direct child of the filtered NBs
    let childrenOfFilteredNBs: Notebook[] =
      allNotebooks
        // if the NB already exists in the filtered NB IDs, exclude it
        .filter(anb => ! notebooks.map(nb => nb.id).includes(anb.id))
        // if NBs parent exists in the filtered NB IDs, include it
        .filter(anb => notebooks.map(nb => nb.id).includes(anb.parent_id))

    let lastChildren = childrenOfFilteredNBs
    while (childrenOfFilteredNBs.length > 0) {
        notebooks = notebooks.concat(childrenOfFilteredNBs)

        // fetch next set of children not in the filter list
        childrenOfFilteredNBs =
          allNotebooks
            .filter(anb => ! notebooks
              .map(nb => nb.id)
              .includes(anb.id))
            .filter(anb => lastChildren
              .map(nb => nb.id)
              .includes(anb.parent_id))
    }

    return notebooks
}

function invertNotebookSelection(
  notebooks: Notebook[],
  allNotebooks: Notebook[]
): Notebook[] {
    return allNotebooks.filter(anb => ! notebooks.map(nb => nb.id).includes(anb.id))
}
