import joplin from "api";
import { JoplinNote, Note, Notebook, Tag } from "./types"
import { buildNote } from "./utils"
import { filterNotesByNotebookName } from "./filter";
import {getNotebooks} from "./notebooks";

// Functions to do with getting notes or notes metadata goes here

// Fetches every note.
export async function getAllNotes(maxNotes: number): Promise<Map<string, Note>> {
    var allNotes = new Array<JoplinNote>();
    var page_num = 1;
    do {
        // `parent_id` is the ID of the notebook containing the note.
        var notes = await joplin.data.get(["notes"], {
            fields: ["id", "parent_id", "title", "body"],
            order_by: "updated_time",
            order_dir: "DESC",
            limit: maxNotes < 100 ? maxNotes : 100,
            page: page_num,
        });
        allNotes.push(...notes.items);
        page_num++;
    } while (notes.has_more && allNotes.length < maxNotes);

    const noteMap = new Map();
    allNotes.map((note) => noteMap.set(note.id, buildNote(note)));
    return noteMap;
}

export async function getAllNotesFiltered(
    maxNotes: number,
    namesToFilter: string[],
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean
): Promise<Map<string, Note>> {
    const notes = await getAllNotes(maxNotes)
    const notebooks = await getNotebooks()

    const filteredNotes = await filterNotesByNotebookName(
        notes,
        notebooks,
        namesToFilter,
        shouldFilterChildren,
        isIncludeFilter
    )

    return filteredNotes
}

// Fetch all notes linked to a given source note, up to a maximum degree of
// separation.
export async function getLinkedNotes(
    source_id: string,
    maxDegree: number,
    includeBacklinks: boolean
): Promise<Map<string, Note>> {
    let pending = [];
    let visited = new Set();
    const noteMap = new Map();
    let degree = 0;

    pending.push(source_id);
    do {
        // Traverse a new batch of pending note ids, storing the note data in
        // the resulting map, and stashing the newly found linked notes for the
        // next iteration.
        const joplinNotes = await getNoteArray(pending);
        pending.forEach((pendingNoteId) => visited.add(pendingNoteId));
        pending = [];

        for (const joplinNote of joplinNotes) {
            // store note data to be returned at the end of the traversal
            const note = buildNote(joplinNote);
            note.distanceToCurrentNote = degree;
            noteMap.set(joplinNote.id, note);

            const allLinks = [
                ...note.links, // these are the forward-links
                ...(includeBacklinks ? await getAllBacklinksForNote(note.id) : []),
            ];

            // stash any new links for the next iteration
            allLinks.forEach((link) => {
                // prevent cycles by filtering notes we've already seen.
                if (!visited.has(link)) {
                    pending.push(link);
                }
            });
        }

        degree++;

        // stop whenever we've reached the maximum degree of separation, or
        // we've exhausted the adjacent nodes.
    } while (pending.length > 0 && degree <= maxDegree);

    return noteMap;
}

export async function getLinkedNotesFiltered(
    source_id: string,
    maxDegree: number,
    includeBacklinks: boolean,
    namesToFilter: string[],
    shouldFilterChildren: boolean,
    isIncludeFilter: boolean
): Promise<Map<string, Note>> {
    const notebooks = await getNotebooks()

    let pending = [];
    let visited = new Set();
    let noteMap = new Map();
    let degree = 0;

    pending.push(source_id);
    do {
        // Traverse a new batch of pending note ids, storing the note data in
        // the resulting map, and stashing the newly found linked notes for the
        // next iteration.
        const joplinNotes = await getNoteArray(pending);
        pending.forEach((pendingNoteId) => visited.add(pendingNoteId));
        pending = [];

        for (const joplinNote of joplinNotes) {
            // store note data to be returned at the end of the traversal
            const note = buildNote(joplinNote);
            note.distanceToCurrentNote = degree;
            noteMap.set(joplinNote.id, note);

            noteMap = await filterNotesByNotebookName(
                noteMap,
                notebooks,
                namesToFilter,
                shouldFilterChildren,
                isIncludeFilter
            )

            // filter getting next links based on whether the note was excluded by notebook name
            if (noteMap.has(joplinNote.id)) {
                const allLinks = [
                    ...note.links, // these are the forward-links
                    ...(includeBacklinks ? await getAllBacklinksForNote(note.id) : []),
                ];

                // stash any new links for the next iteration
                allLinks.forEach((link) => {
                    // prevent cycles by filtering notes we've already seen.
                    if (!visited.has(link)) {
                        pending.push(link);
                    }
                });
            }
        }

        degree++;

        // stop whenever we've reached the maximum degree of separation, or
        // we've exhausted the adjacent nodes.
    } while (pending.length > 0 && degree <= maxDegree);

    return noteMap;
}

export async function getNoteArray(ids: string[]): Promise<Array<JoplinNote>> {
    var promises = ids.map((id) =>
        joplin.data.get(["notes", id], {
            fields: ["id", "parent_id", "title", "body"],
        })
    );

    // joplin queries could fail -- make sure we catch errors.
    const results = await Promise.all(promises.map((p) => p.catch((e) => e)));

    // remove from results any promises that errored out, returning the valid
    // subset of queries.
    const valid = results.filter((r) => !(r instanceof Error));
    return valid;
}

export function getAllLinksForNote(noteBody: string): Set<string> {
    const links = new Set<string>();
    // TODO: needs to handle resource links vs note links. see 4. Tips note for
    // webclipper screenshot.
    // https://stackoverflow.com/questions/37462126/regex-match-markdown-link
    const linkRegexp = /\[\]|\[.*?\]\(:\/(.*?)\)/g;
    var match = null;
    do {
        match = linkRegexp.exec(noteBody);
        if (match != null && match[1] !== undefined) {
            links.add(match[1]);
        }
    } while (match != null);
    return links;
}

export async function getAllBacklinksForNote(noteId: string) {
    const links: string[] = [];
    let pageNum = 1;
    let response;
    do {
        response = await joplin.data.get(["search"], {
            query: noteId,
            fields: ["id"],
            page: pageNum++,
        });
        links.push(...response.items.map(({ id }) => id));
    } while (response.has_more);
    return links;
}

export async function getNoteTags(noteId: string) {
    const tags: Tag[] = [];
    let pageNum = 1;
    let response;
    do {
        response = await joplin.data.get(["notes", noteId, "tags"], {
            fields: ["id", "title"],
            page: pageNum++,
        });
        tags.push(...response.items);
    } while (response.has_more);
    return tags;
}