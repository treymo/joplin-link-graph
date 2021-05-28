import joplin from 'api';
import { SettingItemType } from 'api/types';

export const SETTING_NODE_FONT_SIZE = "nodeNameFontSize";
const DEFAULT_NODE_FONT_SIZE = 20;
export const SETTING_NODE_DISTANCE = "nodeVisualDistance";

export const SETTING_MAX_NODES = "maxNodesOnGraph";
const DEFAULT_MAX_NOTES = 700;

export const SETTING_MAX_SEPARATION_DEGREE = "maxSeparationDegree";
const DEFAULT_MAX_DEGREE = 0;

export const SETTING_NOTEBOOK_NAMES_TO_FILTER = "filteredNotebookNames";
export const SETTING_FILTER_CHILD_NOTEBOOKS = "filterChildNotebooks";

export async function registerSettings() {
  const sectionName = "graph-ui.settings"
  await joplin.settings.registerSection(sectionName, {
    label: 'Graph UI',
    // Check out https://forkaweso.me/Fork-Awesome/icons/ for available icons.
    iconName: 'fas fa-sitemap'
  });

  await joplin.settings.registerSetting(SETTING_NODE_FONT_SIZE, {
    value: DEFAULT_NODE_FONT_SIZE,
    type: SettingItemType.Int,
    section: sectionName,
    public: true,
    label: '(Requires restart) Size of the node label font',
    description: 'Font size for the label of nodes on the graph..'
  });

  await joplin.settings.registerSetting(SETTING_NODE_DISTANCE, {
    value: 100,
    type: SettingItemType.Int,
    section: sectionName,
    public: true,
    label: 'Distance between nodes',
    description: 'The visual distance between nodes in the graph.'
  });

  await joplin.settings.registerSetting(SETTING_MAX_NODES, {
    value: DEFAULT_MAX_NOTES,
    type: SettingItemType.Int,
    section: sectionName,
    public: true,
    label: 'Max nodes in graph',
    description: 'Maximum number of nodes shown in the graph. Most recent nodes have priority.'
  });

  await joplin.settings.registerSetting(SETTING_NOTEBOOK_NAMES_TO_FILTER, {
    value: "",
    type: SettingItemType.String,
    section: sectionName,
    public: true,
    label: "Notebooks names to filter out",
    description: "Comma separated list of Notebook names to filter.",
  });

  await joplin.settings.registerSetting(SETTING_FILTER_CHILD_NOTEBOOKS, {
    value: true,
    type: SettingItemType.Bool,
    section: sectionName,
    public: true,
    label: "Filter out child notebooks",
    description: "Filters out notebooks that are children of the notebooks listed above.",
  });

  await joplin.settings.registerSetting(SETTING_MAX_SEPARATION_DEGREE, {
    value: DEFAULT_MAX_DEGREE,
    type: SettingItemType.Int,
    minimum: 0,
    section: sectionName,
    public: true,
    label: "Max degree of separation",
    description: "Maximum number of link jumps from selected note. Zero for all notes",
  });
}
