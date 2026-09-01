import { describe, expect, it } from "vitest";
import { buildNote, linksChanged } from "./utils";
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

describe("linksChanged", () => {
  it("reports a change when a link is added", () => {
    expect(linksChanged(new Set(["aaa"]), new Set(["aaa", "bbb"]))).toBe(true);
  });

  it("reports a change when a link is removed", () => {
    expect(linksChanged(new Set(["aaa", "bbb"]), new Set(["aaa"]))).toBe(true);
  });

  it("reports a change when a link points somewhere else", () => {
    expect(linksChanged(new Set(["aaa"]), new Set(["bbb"]))).toBe(true);
  });

  it("reports no change when the same links come back", () => {
    expect(linksChanged(new Set(["aaa", "bbb"]), new Set(["bbb", "aaa"]))).toBe(
      false
    );
  });

  it("reports no change between two notes without links", () => {
    expect(linksChanged(new Set(), new Set())).toBe(false);
  });

  it("reports a change when nothing has been recorded yet", () => {
    expect(linksChanged(undefined, new Set())).toBe(true);
  });
});
