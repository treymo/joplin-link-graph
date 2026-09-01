import { vi } from "vitest";

// Stands in for the `api` module under test. The real api/index.ts declares
// `joplin` as an ambient global, so importing it outside Joplin throws.
const joplin = {
  data: { get: vi.fn() },
  settings: { value: vi.fn(), setValue: vi.fn() },
  workspace: { selectedNote: vi.fn() },
  commands: { execute: vi.fn() },
};

export default joplin;
