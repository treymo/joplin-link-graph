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
