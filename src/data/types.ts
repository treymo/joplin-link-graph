// collection of types/etc used elsewhere in data processing

export interface Notebook {
    id: string;
    title: string;
    parent_id: string;
}

export interface Note {
    id: string;
    parent_id: string;
    title: string;
    links: Set<string>;
    linkedToCurrentNote?: boolean;
    /**
     * (Minimal) distance of this note to current/selected note in Joplin
     * 0 => current note itself
     * 1 => directly adjacent note
     * x => ... and so on
     */
    distanceToCurrentNote?: number;
}

export interface JoplinNote {
    id: string;
    parent_id: string;
    title: string;
    body: string;
}

export type Tag = {
    id: string;
    title: string;
}