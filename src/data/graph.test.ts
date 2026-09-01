import { describe, expect, it } from "vitest";
import { buildGraphData, DisplaySettings } from "./graph";
import { Note } from "./types";

const display: DisplaySettings = {
  nodeFontSize: 20,
  nodeDistanceRatio: 1,
  showLinkDirection: false,
  graphIsSelectionBased: false,
};

function note(id: string, links: string[] = []): Note {
  return { id, parent_id: "nb", title: id, links: new Set(links) };
}

function noteMap(...notes: Note[]): Map<string, Note> {
  return new Map(notes.map((n) => [n.id, n]));
}

const edgeIds = (d: { edges: { source: string; target: string }[] }) =>
  d.edges.map((e) => `${e.source}->${e.target}`).sort();

describe("buildGraphData", () => {
  it("makes a node for every note", () => {
    const data = buildGraphData(noteMap(note("a"), note("b")), "a", display);
    expect(data.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("makes an edge for a link between two collected notes", () => {
    const data = buildGraphData(noteMap(note("a", ["b"]), note("b")), "a", display);
    expect(edgeIds(data)).toEqual(["a->b"]);
  });

  it("drops a link to a note that was not collected", () => {
    const data = buildGraphData(noteMap(note("a", ["gone"])), "a", display);
    expect(data.edges).toEqual([]);
  });

  it("strips an anchor fragment from the link target", () => {
    const data = buildGraphData(
      noteMap(note("a", ["b#heading"]), note("b")),
      "a",
      display
    );
    expect(edgeIds(data)).toEqual(["a->b"]);
  });

  it("focuses the edges touching the selected note", () => {
    const notes = noteMap(note("a", ["b"]), note("b", ["c"]), note("c"));
    const data = buildGraphData(notes, "a", display);
    const focused = data.edges.filter((e) => e.focused);
    expect(focused.map((e) => `${e.source}->${e.target}`)).toEqual(["a->b"]);
  });

  it("focuses the nodes the selected note links to", () => {
    const notes = noteMap(note("a", ["b"]), note("b"), note("c"));
    const data = buildGraphData(notes, "a", display);
    const focused = data.nodes.filter((n) => n.focused).map((n) => n.id);
    expect(focused).toEqual(["b"]);
  });

  it("carries the display settings through to the webview", () => {
    const data = buildGraphData(noteMap(note("a")), "a", {
      ...display,
      graphIsSelectionBased: true,
      nodeFontSize: 14,
    });
    expect(data).toMatchObject({
      currentNoteID: "a",
      graphIsSelectionBased: true,
      nodeFontSize: 14,
    });
  });
});

describe("buildGraphData with no note selected", () => {
  it("still draws every note", () => {
    const data = buildGraphData(noteMap(note("a", ["b"]), note("b")), null, display);
    expect(data.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("still draws the links between them", () => {
    const data = buildGraphData(noteMap(note("a", ["b"]), note("b")), null, display);
    expect(edgeIds(data)).toEqual(["a->b"]);
  });

  it("focuses nothing", () => {
    const notes = noteMap(note("a", ["b"]), note("b"));
    const data = buildGraphData(notes, null, display);
    expect(data.edges.some((e) => e.focused)).toBe(false);
    expect(data.nodes.some((n) => n.focused)).toBe(false);
  });
});
