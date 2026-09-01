import { vi } from "vitest";

interface RegisteredCommand {
  name: string;
  execute: (...args: any[]) => any;
}

type Handler = (...args: any[]) => any;

/**
 * Everything src/index.ts hands to Joplin during onStart, so a test can drive
 * the plugin the way Joplin would.
 */
export const captured = {
  onStart: undefined as Handler | undefined,
  commands: new Map<string, RegisteredCommand>(),
  panelMessageHandler: undefined as Handler | undefined,
  workspaceHandlers: {} as Record<string, Handler>,
  settingsChangeHandler: undefined as Handler | undefined,
};

let panelVisible = true;

export function setPanelVisible(visible: boolean) {
  panelVisible = visible;
}

// Stands in for the `api` module under test. The real api/index.ts declares
// `joplin` as an ambient global, so importing it outside Joplin throws.
const joplin = {
  data: { get: vi.fn() },
  settings: {
    value: vi.fn(),
    setValue: vi.fn(),
    registerSection: vi.fn(async () => {}),
    registerSettings: vi.fn(async () => {}),
    onChange: vi.fn(async (handler: Handler) => {
      captured.settingsChangeHandler = handler;
    }),
  },
  workspace: {
    selectedNote: vi.fn(),
    onNoteChange: vi.fn(async (handler: Handler) => {
      captured.workspaceHandlers.noteChange = handler;
    }),
    onNoteSelectionChange: vi.fn(async (handler: Handler) => {
      captured.workspaceHandlers.noteSelectionChange = handler;
    }),
    onSyncStart: vi.fn(async (handler: Handler) => {
      captured.workspaceHandlers.syncStart = handler;
    }),
    onSyncComplete: vi.fn(async (handler: Handler) => {
      captured.workspaceHandlers.syncComplete = handler;
    }),
  },
  commands: {
    execute: vi.fn(),
    register: vi.fn(async (command: RegisteredCommand) => {
      captured.commands.set(command.name, command);
    }),
  },
  plugins: {
    register: vi.fn(async (plugin: { onStart: Handler }) => {
      captured.onStart = plugin.onStart;
    }),
  },
  views: {
    panels: {
      create: vi.fn(async (id: string) => id),
      setHtml: vi.fn(async () => {}),
      addScript: vi.fn(async () => {}),
      onMessage: vi.fn((handle: string, handler: Handler) => {
        captured.panelMessageHandler = handler;
      }),
      show: vi.fn(async (handle: string, show = true) => {
        panelVisible = show;
      }),
      visible: vi.fn(async () => panelVisible),
    },
    toolbarButtons: { create: vi.fn(async () => {}) },
    menuItems: { create: vi.fn(async () => {}) },
  },
};

export default joplin;
