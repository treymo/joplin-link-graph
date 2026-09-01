import { JoplinNote, Note } from "./types";
import { getAllLinksForNote } from "./notes";

// misc utility functions

export function buildNote(joplinNote: JoplinNote): Note {
    const links: Set<string> = getAllLinksForNote(joplinNote.body);
    joplinNote.body = null;
    return {
        id: joplinNote.id,
        title: joplinNote.title,
        parent_id: joplinNote.parent_id,
        links: links,
    };
}

/**
 * Whether a note's outgoing links differ from the last set recorded for it.
 *
 * @param previous links recorded on the last pass, absent before the first one
 * @param current links the note carries now
 */
export function linksChanged(
    previous: Set<string> | undefined,
    current: Set<string>
): boolean {
    if (previous === undefined) {
        return true;
    }
    if (previous.size !== current.size) {
        return true;
    }
    for (const link of current) {
        if (!previous.has(link)) {
            return true;
        }
    }
    return false;
}
