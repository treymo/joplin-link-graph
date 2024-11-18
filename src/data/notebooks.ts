import joplin from "../../api";
import { Notebook } from "./types";

// Functions to do with notebooks or notebooks metadata goes here

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

export async function getFilteredNotebooks(
  filterString: string,
  shouldFilterChildren: boolean,
  isIncludeFilter: boolean
): Promise<Notebook[]> {
    let filteredNotebooks = await getNotebooksByNameAndIDs(filterString)

    if (shouldFilterChildren) {
        filteredNotebooks = await getNotebookChildren(filteredNotebooks)
    }

    if (isIncludeFilter) {
        filteredNotebooks = await invertNotebookSelection(filteredNotebooks)
    }

    return filteredNotebooks
}

async function getNotebooksByNameAndIDs(
  filterText: string
): Promise<Notebook[]> {
    // TODO: currently only gets by name, not IDs

    let filteredNotebooks: Notebook[] = []
    const allNotebooks = await getNotebooks()

    for (let text in filterText.split(",")) {
        let notebooks = allNotebooks
          .filter(anb => anb.title == text)
        filteredNotebooks.push(...notebooks)
    }

    return filteredNotebooks
}

async function getNotebookChildren(
  notebooks: Notebook[]
): Promise<Notebook[]> {
    const allNotebooks = await getNotebooks()

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
            .filter(anb => ! lastChildren
              .map(nb => nb.id)
              .includes(anb.id)
            ).filter(anb => lastChildren
            .map(nb => nb.id)
            .includes(anb.parent_id)
          )
    }

    return notebooks
}

async function invertNotebookSelection(
  notebooks: Notebook[]
): Promise<Notebook[]> {
    const allNotebooks = await getNotebooks()

    return allNotebooks.filter(anb => ! notebooks.map(nb => nb.id).includes(anb.id))
}