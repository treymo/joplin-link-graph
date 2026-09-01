import { Note } from "./types";

export interface Edge {
  source: string;
  target: string;
  sourceDistanceToCurrentNode?: number;
  targetDistanceToCurrentNode?: number;
  focused: boolean;
}

export interface Node {
  id: string;
  title: string;
  focused: boolean;
  distanceToCurrentNode?: number;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
  currentNoteID: string;
  nodeFontSize: number;
  nodeDistanceRatio: number;
  showLinkDirection: boolean;
  graphIsSelectionBased: boolean; // maxDegree > 0
}

/**
 * How the webview should draw the graph, as opposed to which notes are in it.
 */
export interface DisplaySettings {
  nodeFontSize: number;
  nodeDistanceRatio: number;
  showLinkDirection: boolean;
  graphIsSelectionBased: boolean;
}

/**
 * Flattens the collected notes into the node and edge lists the webview draws.
 *
 * @param notes notes to draw, keyed by id
 * @param selectedNoteId note Joplin has selected
 * @param display drawing settings passed through to the webview
 */
export function buildGraphData(
  notes: Map<string, Note>,
  selectedNoteId: string,
  display: DisplaySettings
): GraphData {
  const data: GraphData = {
    nodes: [],
    edges: [],
    currentNoteID: selectedNoteId,
    ...display,
  };

  notes.forEach(function (note, id) {
    for (let link of note.links) {
      // Slice note link if link directs to an anchor
      var index = link.indexOf("#");
      if (index != -1) {
        link = link.substr(0, index);
      }

      // The destination note could have been deleted.
      const linkDestExists = notes.has(link);
      if (!linkDestExists) {
        continue;
      }

      data.edges.push({
        source: id,
        target: link,
        sourceDistanceToCurrentNode: notes.get(id).distanceToCurrentNote,
        targetDistanceToCurrentNode: notes.get(link).distanceToCurrentNote,
        focused: id === selectedNoteId || link === selectedNoteId,
      });

      // Mark nodes that are adjacent to the currently selected note.
      if (id === selectedNoteId) {
        notes.get(link).linkedToCurrentNote = true;
      } else if (link == selectedNoteId) {
        notes.get(id).linkedToCurrentNote = true;
      } else {
        const l = notes.get(link);
        l.linkedToCurrentNote = l.linkedToCurrentNote || false;
      }
    }
    data.nodes.push({
      id: id,
      title: note.title,
      focused: note.linkedToCurrentNote,
      distanceToCurrentNode: note.distanceToCurrentNote,
    });
  });

  return data;
}
