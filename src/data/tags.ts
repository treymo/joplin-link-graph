import joplin from "../../api";
import { JoplinNote, Note } from "./types";
import { buildNote } from "./utils";

export async function getNotesFromTagString(
  tagString: string
): Promise<Array<Note>> {
    let allTags = []
    let response
    do {
        response = await joplin.data.get(["tags"], {
            fields: ["id", "title"]
        })
        allTags.push(...response.items)
    } while (response.has_more)

    let filteredNotes: Array<JoplinNote> = []
    for (let text of tagString.split(",")) {
        // test if tag filter matches any tags on their names
        const matchTag = allTags
          .filter(t => t.title == text)

        if (matchTag.length > 0) {
            let notes = await getNotesFromTagID(matchTag[0].id)
            filteredNotes.push(...notes)
        }
    }

    return filteredNotes.map(n => buildNote(n))
}

async function getNotesFromTagID(
  tagID: string
): Promise<Array<JoplinNote>> {
    let notes: Array<JoplinNote> = []
    let response
    let pageNum = 1
    do {
        response = await joplin.data.get(["tags", tagID, "notes"], {
            fields: ["id", "parent_id", "title", "body"],
            order_by: "updated_time",
            order_dir: "DESC",
            page: pageNum,
        })
        notes.push(...response.items)
        pageNum++
    } while (response.has_more)

    return notes
}