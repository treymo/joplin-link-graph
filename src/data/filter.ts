import { Note, Notebook } from "./types";

// functions to do with filtering  go here

/**
 * Returns a filtered map of notes by notebook name.
 */
export async function filterNotesByNotebookName(
    notes: Map<string, Note>,
    notebooks: Array<Notebook>,
    filteredNotebookNames: Array<string>,
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean
): Promise<Map<string, Note>> {
    // No filtering needed.
    if (filteredNotebookNames.length < 1) return notes;

    const notebookIdsByName = new Map<string, string>();
    notebooks.forEach((n) => notebookIdsByName.set(n.title, n.id));
    const notebooksById = new Map<string, Notebook>();
    notebooks.forEach((n) => notebooksById.set(n.id, n));

    // Get a list of valid notebook names to filter out.
    filteredNotebookNames = filteredNotebookNames.filter((name) =>
        notebookIdsByName.has(name)
    );

    function shouldIncludeNote(parent_id: string): boolean {
        var parentNotebook: Notebook = notebooksById.get(parent_id);
        // Filter out the direct parent.
        if (filteredNotebookNames.includes(parentNotebook.title)) {
            return isIncludeFilter;
        }

        // Filter a note if any of its ancestor notebooks are filtered.
        if (shouldFilterChildren) {
            while (parentNotebook !== undefined) {
                if (filteredNotebookNames.includes(parentNotebook.title)) {
                    return isIncludeFilter;
                }
                parentNotebook = notebooksById.get(parentNotebook.parent_id);
            }
        }
        return !isIncludeFilter;
    }

    var filteredNotes = new Map<string, Note>();
    notes.forEach(function (n, id) {
        if (shouldIncludeNote(n.parent_id)) {
            filteredNotes.set(id, n);
        }
    });

    return filteredNotes;
}