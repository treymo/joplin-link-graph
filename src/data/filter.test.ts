import { describe, expect, it } from "vitest";
import { filterNotesByNotebook } from "./filter";
import { Note, Notebook } from "./types";

function note(id: string, parent_id: string): Note {
  return { id, parent_id, title: id, links: new Set<string>() };
}

function noteMap(...notes: Note[]): Map<string, Note> {
  return new Map(notes.map((n) => [n.id, n]));
}

const notebook = (id: string): Notebook => ({ id, title: id, parent_id: "" });

describe("filterNotesByNotebook", () => {
  const notes = noteMap(note("n1", "work"), note("n2", "personal"));

  it("drops the notes belonging to an excluded notebook", () => {
    const kept = filterNotesByNotebook(notes, [notebook("work")]);
    expect([...kept.keys()]).toEqual(["n2"]);
  });

  it("keeps every note when no notebook is excluded", () => {
    expect(filterNotesByNotebook(notes, [])).toBe(notes);
  });

  it("drops every note when all their notebooks are excluded", () => {
    const kept = filterNotesByNotebook(notes, [
      notebook("work"),
      notebook("personal"),
    ]);
    expect(kept.size).toBe(0);
  });

  it("leaves the map it was given untouched", () => {
    filterNotesByNotebook(notes, [notebook("work")]);
    expect(notes.size).toBe(2);
  });
});
