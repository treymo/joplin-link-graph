import { describe, expect, it, vi } from "vitest";

const SETTINGS = {
  SETTING_MAX_SEPARATION_DEGREE: 0,
  SETTING_MAX_NODES: 100,
  SETTING_NOTEBOOK_NAMES_TO_FILTER: "",
  SETTING_FILTER_CHILD_NOTEBOOKS: false,
  SETTING_FILTER_IS_INCLUDE_FILTER: "exclude",
  SETTING_INCLUDE_BACKLINKS: false,
  SETTING_NOTE_TITLES_TO_EXCLUDE_FROM_BACKLINKS: "",
  SETTING_SHOW_LINK_DIRECTION: false,
  SETTING_NODE_FONT_SIZE: 20,
  SETTING_NODE_DISTANCE: 100,
};

function notesPage(...titles: string[]) {
  return {
    items: titles.map((title, index) => ({
      id: `note-${index}`,
      parent_id: "notebook",
      title: title,
      body: "",
    })),
    has_more: false,
  };
}

// The workspace and settings handlers call updateUI without awaiting it, so a
// test has to let the pending promise chain drain before asserting.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function startPlugin() {
  vi.resetModules();
  const stub = await import("../test/joplin-stub");
  vi.mocked(stub.default.settings.value).mockImplementation(
    async (key: string) => SETTINGS[key]
  );
  vi.mocked(stub.default.workspace.selectedNote).mockResolvedValue(null);
  vi.mocked(stub.default.data.get).mockResolvedValue(notesPage("A"));
  await import("./index");
  await stub.captured.onStart();
  return stub;
}

describe("updateUI", () => {
  it("reads no notes while the panel is hidden", async () => {
    const stub = await startPlugin();
    stub.setPanelVisible(false);
    vi.mocked(stub.default.data.get).mockClear();

    stub.captured.workspaceHandlers.noteSelectionChange();
    stub.captured.workspaceHandlers.syncComplete();
    stub.captured.settingsChangeHandler();
    await flush();

    expect(stub.default.data.get).not.toHaveBeenCalled();
  });

  it("reads notes while the panel is visible", async () => {
    const stub = await startPlugin();
    stub.setPanelVisible(true);
    vi.mocked(stub.default.data.get).mockClear();

    stub.captured.workspaceHandlers.syncComplete();
    await flush();

    expect(stub.default.data.get).toHaveBeenCalled();
  });

  it("runs the refresh owed from a hidden panel once the panel is shown", async () => {
    const stub = await startPlugin();
    stub.setPanelVisible(false);
    stub.captured.workspaceHandlers.syncComplete();
    await flush();
    vi.mocked(stub.default.data.get).mockClear();

    await stub.captured.commands.get("showHideGraphUI").execute();

    expect(stub.default.data.get).toHaveBeenCalled();

    vi.mocked(stub.default.data.get).mockClear();
    await stub.captured.commands.get("showHideGraphUI").execute();
    await stub.captured.commands.get("showHideGraphUI").execute();

    expect(stub.default.data.get).not.toHaveBeenCalled();
  });
});

describe("the poll message", () => {
  it("resolves a pending poll with the next model change", async () => {
    const stub = await startPlugin();
    stub.setPanelVisible(true);

    const poll = stub.captured.panelMessageHandler({ name: "poll" });
    stub.captured.workspaceHandlers.syncComplete();
    await flush();
    const modelChange = await poll;

    expect(modelChange.name).toEqual("syncComplete");
    expect(modelChange.data.nodes.map((node) => node.title)).toEqual(["A"]);
  });
});

describe("the update message", () => {
  it("answers with freshly fetched data", async () => {
    const stub = await startPlugin();
    stub.captured.workspaceHandlers.syncComplete();
    await flush();
    vi.mocked(stub.default.data.get).mockResolvedValue(notesPage("A", "B"));

    const response = await stub.captured.panelMessageHandler({
      name: "update",
    });

    expect(response.data.nodes.map((node) => node.title)).toEqual(["A", "B"]);

    await stub.captured.panelMessageHandler({ name: "poll" });
    let modelChange;
    stub.captured
      .panelMessageHandler({ name: "poll" })
      .then((change) => (modelChange = change));
    stub.captured.workspaceHandlers.syncComplete();
    await flush();

    expect(modelChange).toBeUndefined();
  });

  it("reads no notes while the panel is hidden", async () => {
    const stub = await startPlugin();
    stub.setPanelVisible(false);
    vi.mocked(stub.default.data.get).mockClear();

    await stub.captured.panelMessageHandler({ name: "update" });

    expect(stub.default.data.get).not.toHaveBeenCalled();
  });

  it("leaves a refresh owed while the panel is hidden", async () => {
    const stub = await startPlugin();
    stub.setPanelVisible(false);
    await stub.captured.panelMessageHandler({ name: "update" });
    vi.mocked(stub.default.data.get).mockClear();

    await stub.captured.commands.get("showHideGraphUI").execute();

    expect(stub.default.data.get).toHaveBeenCalled();
  });
});
