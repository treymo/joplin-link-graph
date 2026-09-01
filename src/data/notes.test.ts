import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllBacklinksForNote,
  getAllLinksForNote,
  getLinkedNotes,
  getNoteIdsByTitle,
} from "./notes";
import { JoplinNote, Note } from "./types";
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
});

describe("getLinkedNotes with no note selected", () => {
  const keepAll = (nm: Map<string, Note>) => nm;

  beforeEach(() => {
    vi.mocked(joplin.data.get).mockReset();
  });

  it("collects no notes", async () => {
    const notes = await getLinkedNotes(null, 1, false, new Set(), keepAll);
    expect(notes.size).toBe(0);
  });

  it("asks Joplin for nothing", async () => {
    await getLinkedNotes(null, 1, false, new Set(), keepAll);
    expect(joplin.data.get).not.toHaveBeenCalled();
  });
});

/**
 * Answers a `["search"]` call with a single unpaginated page of the given items.
 */
function mockSearchResults(items: object[]) {
  vi.mocked(joplin.data.get).mockResolvedValue({ items, has_more: false });
}

describe("getNoteIdsByTitle", () => {
  beforeEach(() => {
    vi.mocked(joplin.data.get).mockReset();
  });

  it("resolves a listed title to the id of the note carrying it", async () => {
    mockSearchResults([{ id: "hist", title: "History" }]);
    expect(await getNoteIdsByTitle("History")).toEqual(new Set(["hist"]));
  });

  it("asks Joplin for the title as a quoted phrase", async () => {
    mockSearchResults([]);
    await getNoteIdsByTitle("Daily Log");
    expect(joplin.data.get).toHaveBeenCalledWith(
      ["search"],
      expect.objectContaining({ query: 'title:"Daily Log"' })
    );
  });

  it("drops a note whose title merely starts with the listed title", async () => {
    mockSearchResults([
      { id: "hist", title: "History" },
      { id: "rome", title: "History of Rome" },
    ]);
    expect(await getNoteIdsByTitle("History")).toEqual(new Set(["hist"]));
  });

  it("resolves every title in a comma separated list", async () => {
    vi.mocked(joplin.data.get)
      .mockResolvedValueOnce({
        items: [{ id: "hist", title: "History" }],
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [{ id: "log", title: "Daily Log" }],
        has_more: false,
      });
    expect(await getNoteIdsByTitle("History, Daily Log")).toEqual(
      new Set(["hist", "log"])
    );
    expect(joplin.data.get).toHaveBeenCalledTimes(2);
  });

  it("returns the ids of every note sharing a listed title", async () => {
    mockSearchResults([
      { id: "hist1", title: "History" },
      { id: "hist2", title: "History" },
    ]);
    expect(await getNoteIdsByTitle("History")).toEqual(
      new Set(["hist1", "hist2"])
    );
  });

  it("returns an empty set when a listed title matches no note", async () => {
    mockSearchResults([]);
    expect(await getNoteIdsByTitle("History")).toEqual(new Set());
  });

  it("asks Joplin for nothing when the setting is empty", async () => {
    expect(await getNoteIdsByTitle("")).toEqual(new Set());
    expect(joplin.data.get).not.toHaveBeenCalled();
  });

  it("asks Joplin for nothing when the setting holds only separators", async () => {
    expect(await getNoteIdsByTitle(" , , ")).toEqual(new Set());
    expect(joplin.data.get).not.toHaveBeenCalled();
  });

  it("collects ids from every page the search reports", async () => {
    vi.mocked(joplin.data.get)
      .mockResolvedValueOnce({
        items: [{ id: "hist1", title: "History" }],
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [{ id: "hist2", title: "History" }],
        has_more: false,
      });
    expect(await getNoteIdsByTitle("History")).toEqual(
      new Set(["hist1", "hist2"])
    );
  });
});

describe("getAllBacklinksForNote", () => {
  beforeEach(() => {
    vi.mocked(joplin.data.get).mockReset();
  });

  it("returns the ids of the notes the search reports", async () => {
    mockSearchResults([{ id: "a" }, { id: "b" }]);
    expect(await getAllBacklinksForNote("target", new Set())).toEqual([
      "a",
      "b",
    ]);
  });

  it("drops an excluded id", async () => {
    mockSearchResults([{ id: "a" }, { id: "hist" }]);
    expect(await getAllBacklinksForNote("target", new Set(["hist"]))).toEqual([
      "a",
    ]);
  });

  it("returns nothing when every linking note is excluded", async () => {
    mockSearchResults([{ id: "hist" }]);
    expect(await getAllBacklinksForNote("target", new Set(["hist"]))).toEqual(
      []
    );
  });
});

describe("getLinkedNotes with excluded backlinks", () => {
  const keepAll = (nm: Map<string, Note>) => nm;

  /**
   * Answers the two endpoints the traversal uses.
   *
   * @param notes notes Joplin holds
   * @param backlinks ids of the notes linking to each note, keyed by note id
   */
  function mockVault(
    notes: JoplinNote[],
    backlinks: { [noteId: string]: string[] }
  ) {
    const notesById = new Map(notes.map((note) => [note.id, note]));
    vi.mocked(joplin.data.get).mockImplementation(
      async (path: string[], query: any) => {
        if (path[0] === "notes") {
          return { ...notesById.get(path[1]) };
        }
        return {
          items: (backlinks[query.query] ?? []).map((id) => ({ id })),
          has_more: false,
        };
      }
    );
  }

  const note = (id: string, body = ""): JoplinNote => ({
    id,
    parent_id: "notebook",
    title: id,
    body,
  });

  beforeEach(() => {
    vi.mocked(joplin.data.get).mockReset();
  });

  it("leaves out a note that only reaches the graph as an excluded backlink", async () => {
    mockVault([note("selected"), note("hist", "[s](:/selected)")], {
      selected: ["hist"],
    });
    const notes = await getLinkedNotes(
      "selected",
      1,
      true,
      new Set(["hist"]),
      keepAll
    );
    expect([...notes.keys()]).toEqual(["selected"]);
  });

  it("keeps a note reached as a backlink when nothing is excluded", async () => {
    mockVault([note("selected"), note("hist", "[s](:/selected)")], {
      selected: ["hist"],
    });
    const notes = await getLinkedNotes("selected", 1, true, new Set(), keepAll);
    expect([...notes.keys()].sort()).toEqual(["hist", "selected"]);
  });

  it("keeps an excluded note that a note in the graph links to", async () => {
    mockVault([note("selected", "[h](:/hist)"), note("hist")], {});
    const notes = await getLinkedNotes(
      "selected",
      1,
      true,
      new Set(["hist"]),
      keepAll
    );
    expect([...notes.keys()].sort()).toEqual(["hist", "selected"]);
  });

  it("keeps the selected note when its own title is excluded", async () => {
    mockVault([note("hist"), note("other", "[h](:/hist)")], {
      hist: ["other"],
    });
    const notes = await getLinkedNotes(
      "hist",
      1,
      true,
      new Set(["hist"]),
      keepAll
    );
    expect(notes.get("hist").distanceToCurrentNote).toBe(0);
  });
});
