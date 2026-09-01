import joplin from "api";
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
    // An empty setting names no notebooks. Inverting that would name every
    // notebook, and the caller excludes whatever it is given.
    if (splitFilterTerms(filterString).length === 0) {
        return []
    }

    const allNotebooks = await getNotebooks()

    let filteredNotebooks = getNotebooksByNameAndIDs(filterString, allNotebooks)

    if (shouldFilterChildren) {
        filteredNotebooks = getNotebookChildren(filteredNotebooks, allNotebooks)
    }

    if (isIncludeFilter) {
        filteredNotebooks = invertNotebookSelection(filteredNotebooks, allNotebooks)
    }

    return filteredNotebooks
}

export function getNotebooksByNameAndIDs(
  filterText: string,
  allNotebooks: Notebook[]
): Notebook[] {
    // TODO: currently only gets by name, not IDs

    let filteredNotebooks: Notebook[] = []

    for (let text of splitFilterTerms(filterText)) {
        let notebooks = allNotebooks
          .filter(anb => anb.title == text)
        filteredNotebooks.push(...notebooks)
    }

    return filteredNotebooks
}

/**
 * Splits the notebook filter setting into the names it holds.
 *
 * @param filterText the raw setting value
 */
export function splitFilterTerms(filterText: string): string[] {
    return filterText
      .split(",")
      .map(term => term.trim())
      .filter(term => term !== "")
}

export function getNotebookChildren(
  notebooks: Notebook[],
  allNotebooks: Notebook[]
): Notebook[] {
    const selectedIds = new Set(notebooks.map(nb => nb.id))

    // Each pass collects the children of the generation found by the previous
    // one, so a notebook is reached however deeply it is nested.
    let generation = notebooks
    while (generation.length > 0) {
        const parentIds = new Set(generation.map(nb => nb.id))

        generation = allNotebooks
          .filter(anb => ! selectedIds.has(anb.id))
          .filter(anb => parentIds.has(anb.parent_id))

        generation.forEach(nb => selectedIds.add(nb.id))
        notebooks = notebooks.concat(generation)
    }

    return notebooks
}

export function invertNotebookSelection(
  notebooks: Notebook[],
  allNotebooks: Notebook[]
): Notebook[] {
    return allNotebooks.filter(anb => ! notebooks.map(nb => nb.id).includes(anb.id))
}
