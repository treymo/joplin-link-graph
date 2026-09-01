import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllLinksForNote, getLinkedNotes } from "./notes";
import { Note } from "./types";
import joplin from "api";

describe("getAllLinksForNote", () => {
  it("finds the target id of a markdown link", () => {
    expect(getAllLinksForNote("see [Other](:/abc123)")).toEqual(
      new Set(["abc123"])
    );
  });

  it("finds every link in a body", () => {
    const body = "[One](:/aaa) and [Two](:/bbb)\n\n[Three](:/ccc)";
    expect(getAllLinksForNote(body)).toEqual(new Set(["aaa", "bbb", "ccc"]));
  });

  it("collapses repeated links to the same note", () => {
    expect(getAllLinksForNote("[a](:/aaa) [again](:/aaa)")).toEqual(
      new Set(["aaa"])
    );
  });

  it("returns an empty set for a body with no links", () => {
    expect(getAllLinksForNote("plain text, [not a link](https://example.com)"))
      .toEqual(new Set());
  });

  it("returns an empty set for an empty body", () => {
    expect(getAllLinksForNote("")).toEqual(new Set());
  });

  it("skips a link whose label is empty", () => {
    // The leading `\[\]` alternative in the pattern consumes the empty label
    // before the link branch can match, so the target is never collected.
    expect(getAllLinksForNote("[](:/aaa) [real](:/bbb)")).toEqual(
      new Set(["bbb"])
    );
  });

  it("keeps the anchor fragment on the id", () => {
    // fetchData strips the fragment when it builds edges; this function does not.
    expect(getAllLinksForNote("[T](:/abc123#a-heading)")).toEqual(
      new Set(["abc123#a-heading"])
    );
  });

  it("cannot tell a resource link from a note link", () => {
    expect(getAllLinksForNote("![shot](:/res456)")).toEqual(new Set(["res456"]));
  });

  it("finds the target id of a link reference definition", () => {
    const body = "see [Other][ref]\n\n[ref]: :/abc123";
    expect(getAllLinksForNote(body)).toEqual(new Set(["abc123"]));
  });

  it("ignores the title trailing a link reference definition", () => {
    expect(getAllLinksForNote('[ref]: :/abc123 "Other"')).toEqual(
      new Set(["abc123"])
    );
  });

  it("unwraps an angle-bracketed link reference definition", () => {
    expect(getAllLinksForNote("[ref]: <:/abc123>")).toEqual(new Set(["abc123"]));
  });

  it("allows a link reference definition to be indented three spaces", () => {
    expect(getAllLinksForNote("   [ref]: :/abc123")).toEqual(
      new Set(["abc123"])
    );
  });

  it("ignores a link reference definition pointing outside Joplin", () => {
    expect(getAllLinksForNote("[ref]: https://example.com")).toEqual(new Set());
  });

  it("ignores a bracketed label followed by a colon mid-line", () => {
    expect(getAllLinksForNote("prose [ref]: :/abc123")).toEqual(new Set());
  });

  it("collects both inline links and link reference definitions", () => {
    const body = "[One](:/aaa) and [Two][ref]\n\n[ref]: :/bbb";
    expect(getAllLinksForNote(body)).toEqual(new Set(["aaa", "bbb"]));
  });

  it("collapses an inline link and a definition naming the same note", () => {
    const body = "[One](:/aaa) and [Again][ref]\n\n[ref]: :/aaa";
    expect(getAllLinksForNote(body)).toEqual(new Set(["aaa"]));
  });
});

describe("getLinkedNotes with no note selected", () => {
  const keepAll = (nm: Map<string, Note>) => nm;

  beforeEach(() => {
    vi.mocked(joplin.data.get).mockReset();
  });

  it("collects no notes", async () => {
    const notes = await getLinkedNotes(null, 1, false, keepAll);
    expect(notes.size).toBe(0);
  });

  it("asks Joplin for nothing", async () => {
    await getLinkedNotes(null, 1, false, keepAll);
    expect(joplin.data.get).not.toHaveBeenCalled();
  });
});
