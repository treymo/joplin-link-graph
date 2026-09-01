import { describe, expect, it } from "vitest";
import { buildNote } from "./utils";
import { JoplinNote } from "./types";

function joplinNote(body: string): JoplinNote {
  return { id: "n1", parent_id: "nb1", title: "A note", body };
}

describe("buildNote", () => {
  it("carries the identifying fields across", () => {
    const note = buildNote(joplinNote(""));
    expect(note).toMatchObject({
      id: "n1",
      parent_id: "nb1",
      title: "A note",
    });
  });

  it("collects the note's outgoing links", () => {
    const note = buildNote(joplinNote("[One](:/aaa) [Two](:/bbb)"));
    expect(note.links).toEqual(new Set(["aaa", "bbb"]));
  });

  it("clears the body on the note it was given", () => {
    // Bodies of a whole vault are large enough to be worth dropping once the
    // links are extracted.
    const source = joplinNote("[One](:/aaa)");
    buildNote(source);
    expect(source.body).toBeNull();
  });
});
