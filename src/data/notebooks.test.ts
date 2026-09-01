import { describe, expect, it } from "vitest";
import {
  getNotebookChildren,
  getNotebooksByNameAndIDs,
  invertNotebookSelection,
} from "./notebooks";
import { Notebook } from "./types";

function notebook(id: string, parent_id = ""): Notebook {
  return { id, title: id, parent_id };
}

const ids = (notebooks: Notebook[]) => notebooks.map((n) => n.id).sort();

describe("getNotebooksByNameAndIDs", () => {
  const all = [notebook("Work"), notebook("Personal"), notebook("Archive")];

  it("matches a notebook by its title", () => {
    expect(ids(getNotebooksByNameAndIDs("Work", all))).toEqual(["Work"]);
  });

  it("matches every name in a comma separated list", () => {
    expect(ids(getNotebooksByNameAndIDs("Work,Archive", all))).toEqual([
      "Archive",
      "Work",
    ]);
  });

  it("matches every notebook sharing a title", () => {
    const duplicates = [
      { id: "a", title: "Notes", parent_id: "" },
      { id: "b", title: "Notes", parent_id: "" },
    ];
    expect(ids(getNotebooksByNameAndIDs("Notes", duplicates))).toEqual([
      "a",
      "b",
    ]);
  });

  it("matches nothing when no title matches", () => {
    expect(getNotebooksByNameAndIDs("Nowhere", all)).toEqual([]);
  });
});

describe("getNotebookChildren", () => {
  it("keeps the notebooks it was given when they have no children", () => {
    const all = [notebook("Work"), notebook("Personal")];
    expect(ids(getNotebookChildren([all[0]], all))).toEqual(["Work"]);
  });

  it("adds the children of a notebook", () => {
    const all = [
      notebook("Work"),
      notebook("Projects", "Work"),
      notebook("Personal"),
    ];
    expect(ids(getNotebookChildren([all[0]], all))).toEqual([
      "Projects",
      "Work",
    ]);
  });

  it("adds grandchildren as well as children", () => {
    const all = [
      notebook("Work"),
      notebook("Projects", "Work"),
      notebook("Alpha", "Projects"),
      notebook("Personal"),
    ];
    expect(ids(getNotebookChildren([all[0]], all))).toEqual([
      "Alpha",
      "Projects",
      "Work",
    ]);
  });

  it("does not repeat a notebook that is already selected", () => {
    const all = [notebook("Work"), notebook("Projects", "Work")];
    expect(ids(getNotebookChildren([all[0], all[1]], all))).toEqual([
      "Projects",
      "Work",
    ]);
  });
});

describe("invertNotebookSelection", () => {
  it("returns the notebooks that were not selected", () => {
    const all = [notebook("Work"), notebook("Personal"), notebook("Archive")];
    expect(ids(invertNotebookSelection([all[0]], all))).toEqual([
      "Archive",
      "Personal",
    ]);
  });

  it("returns nothing when everything is selected", () => {
    const all = [notebook("Work"), notebook("Personal")];
    expect(invertNotebookSelection(all, all)).toEqual([]);
  });
});
