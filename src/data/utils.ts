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