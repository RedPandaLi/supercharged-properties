/* Supercharged Properties — MIT. See LICENSE and NOTICE.md. */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  PropertiesView: () => PropertiesView,
  default: () => SuperchargedPropertiesPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/frontmatter-values.ts
var EMPTY = Object.freeze({ kind: "empty", text: "" });
var TRUE = Object.freeze({ kind: "boolean", text: "true" });
var FALSE = Object.freeze({ kind: "boolean", text: "false" });
function readPropertyValues(input) {
  switch (typeof input) {
    case "string": {
      const text = input.trim();
      return text ? [{ kind: "string", text }] : [EMPTY];
    }
    case "boolean":
      return input ? [TRUE] : [FALSE];
    case "number":
      return Number.isFinite(input) ? [{ kind: "number", text: String(input) }] : [];
    case "object":
      break;
    default:
      return [];
  }
  if (input === null) return [EMPTY];
  if (!Array.isArray(input)) return [];
  if (!input.length) return [EMPTY];
  return readList(input);
}
function readList(input) {
  const output = [];
  let items = input;
  let offset = 0;
  let parents;
  let ancestry;
  for (; ; ) {
    if (offset === items.length) {
      if (!parents?.length) break;
      ancestry?.delete(items);
      const parent = parents.pop();
      items = parent.items;
      offset = parent.offset;
      continue;
    }
    const item = items[offset++];
    switch (typeof item) {
      case "string": {
        const text = item.trim();
        if (text) output.push({ kind: "string", text });
        break;
      }
      case "number":
        if (Number.isFinite(item)) output.push({ kind: "number", text: String(item) });
        break;
      case "boolean":
        output.push(item ? TRUE : FALSE);
        break;
      case "object":
        if (item === null) {
          output.push(EMPTY);
          break;
        }
        if (!Array.isArray(item) || !item.length) break;
        parents ?? (parents = []);
        ancestry ?? (ancestry = /* @__PURE__ */ new Set([items]));
        if (!ancestry.has(item)) {
          parents.push({ items, offset });
          ancestry.add(item);
          items = item;
          offset = 0;
        }
        break;
    }
  }
  return output;
}

// src/index.ts
var fold = (text) => text.trim().normalize("NFC").toLowerCase();
var natural = (a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" });
var PropertyIndex = class {
  constructor() {
    this.properties = /* @__PURE__ */ new Map();
    this.memberships = /* @__PURE__ */ new Map();
  }
  remove(path) {
    for (const [key, values] of this.memberships.get(path) ?? []) {
      const property = this.properties.get(key);
      if (!property) continue;
      property.paths.delete(path);
      for (const value of values) {
        const node = property.values.get(value);
        node?.paths.delete(path);
        if (node?.paths.size === 0) property.values.delete(value);
      }
      if (!property.paths.size) this.properties.delete(key);
    }
    this.memberships.delete(path);
  }
  update(path, frontmatter) {
    this.remove(path);
    if (!frontmatter) return;
    const membership = /* @__PURE__ */ new Map();
    for (const [rawKey, rawValue] of Object.entries(frontmatter)) {
      if (rawKey === "position") continue;
      const key = fold(rawKey);
      if (!key) continue;
      let property = this.properties.get(key);
      if (!property) {
        property = { id: key, label: rawKey, paths: /* @__PURE__ */ new Set(), values: /* @__PURE__ */ new Map() };
        this.properties.set(key, property);
      }
      property.paths.add(path);
      const values = membership.get(key) ?? /* @__PURE__ */ new Set();
      membership.set(key, values);
      for (const entry of readPropertyValues(rawValue)) {
        const id = JSON.stringify([entry.kind, fold(entry.text)]);
        let node = property.values.get(id);
        if (!node) {
          node = { id, label: entry.text || "(empty)", paths: /* @__PURE__ */ new Set() };
          property.values.set(id, node);
        }
        node.paths.add(path);
        values.add(id);
      }
    }
    this.memberships.set(path, membership);
  }
};

// src/sorting.ts
var sortOptions = {
  name: "Property name (A to Z)",
  "name-desc": "Property name (Z to A)",
  count: "Frequency (high to low)",
  "count-asc": "Frequency (low to high)"
};
function sortOrder(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(sortOptions, value) ? value : "name";
}
function sortNodes(nodes, order) {
  return Array.from(nodes).sort((a, b) => {
    const alphabetical = natural(a.label, b.label) || a.id.localeCompare(b.id);
    if (order === "name-desc") return -alphabetical;
    if (order === "count") return b.paths.size - a.paths.size || alphabetical;
    if (order === "count-asc") return a.paths.size - b.paths.size || alphabetical;
    return alphabetical;
  });
}

// src/search.ts
function propertyQuery(key, value, empty = false) {
  const quote = (text) => JSON.stringify(text);
  return value === void 0 ? `[${quote(key)}]` : `[${quote(key)}:${empty ? "null" : quote(value)}]`;
}

// src/profiles.ts
function loadProfiles(raw) {
  if (!Array.isArray(raw)) return [];
  const ids = /* @__PURE__ */ new Set();
  const names = /* @__PURE__ */ new Set();
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const value = entry;
    if (!value || typeof value.id !== "string" || !value.id || typeof value.name !== "string" || !value.name.trim() || !Array.isArray(value.keys)) return [];
    if (ids.has(value.id) || names.has(fold(value.name))) return [];
    ids.add(value.id);
    names.add(fold(value.name));
    return [{ id: value.id, name: value.name.trim(), keys: [...new Set(value.keys.filter((key) => typeof key === "string").map(fold).filter(Boolean))] }];
  });
}
function sameKeys(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((key) => right.has(key));
}

// src/main.ts
var VIEW = "supercharged-properties";
var defaults = { counts: true, sort: "name", hidden: "", expanded: [], pinned: [], scope: null, profiles: [], activeProfile: null };
var SuperchargedPropertiesPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.index = new PropertyIndex();
    this.prefs = { ...defaults };
    this.saveQueue = Promise.resolve();
  }
  async onload() {
    const loaded = await this.loadData();
    const saved = loaded && typeof loaded === "object" && !Array.isArray(loaded) ? loaded : {};
    const profiles = loadProfiles(saved?.profiles);
    this.prefs = {
      profiles,
      activeProfile: typeof saved.activeProfile === "string" && profiles.some((profile) => profile.id === saved.activeProfile) ? saved.activeProfile : null,
      scope: Array.isArray(saved?.scope) ? saved.scope.filter((v) => typeof v === "string") : null,
      pinned: Array.isArray(saved?.pinned) ? saved.pinned.filter((v) => typeof v === "string") : [],
      counts: typeof saved?.counts === "boolean" ? saved.counts : true,
      sort: sortOrder(saved?.sort),
      hidden: typeof saved?.hidden === "string" ? saved.hidden : "",
      expanded: Array.isArray(saved?.expanded) ? saved.expanded.filter((v) => typeof v === "string") : []
    };
    this.registerView(VIEW, (leaf) => new PropertiesView(leaf, this));
    this.addRibbonIcon("list-tree", "Open Supercharged Properties", () => {
      void this.open();
    });
    this.addCommand({ id: "open", name: "Open sidebar", callback: () => {
      void this.open();
    } });
    this.addCommand({ id: "open-tab", name: "Open in tab", callback: () => {
      void this.openTab();
    } });
    this.addCommand({ id: "rebuild", name: "Refresh property index", callback: () => this.rebuild() });
    this.addSettingTab(new PreferencesTab(this));
    this.registerEvent(this.app.metadataCache.on("changed", (file, _data, cache) => {
      this.index.update(file.path, cache.frontmatter);
      this.refresh();
    }));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof import_obsidian.TFile && file.extension === "md") {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache) {
          this.index.update(file.path, cache.frontmatter);
          this.refresh();
        }
      }
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file instanceof import_obsidian.TFile) {
        this.index.remove(file.path);
        this.refresh();
      } else this.scheduleRebuild();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file instanceof import_obsidian.TFile) {
        this.index.remove(oldPath);
        if (file.extension === "md") this.index.update(file.path, this.app.metadataCache.getFileCache(file)?.frontmatter);
        this.refresh();
      } else this.scheduleRebuild();
    }));
    this.register(() => {
      window.clearTimeout(this.timer);
      window.clearTimeout(this.rebuildTimer);
    });
    this.app.workspace.onLayoutReady(() => this.rebuild());
  }
  scheduleRebuild() {
    window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), 150);
  }
  rebuild() {
    window.clearTimeout(this.rebuildTimer);
    this.index = new PropertyIndex();
    for (const file of this.app.vault.getMarkdownFiles()) {
      this.index.update(file.path, this.app.metadataCache.getFileCache(file)?.frontmatter);
    }
    this.refresh();
  }
  refresh() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) {
        if (leaf.view instanceof PropertiesView) leaf.view.render();
      }
    }, 100);
  }
  save() {
    const snapshot = JSON.parse(JSON.stringify(this.prefs));
    this.saveQueue = this.saveQueue.then(() => this.saveData(snapshot)).catch(() => {
      new import_obsidian.Notice("Could not save Supercharged Properties settings. Check vault permissions and available storage.");
    });
    this.refresh();
    return this.saveQueue;
  }
  async openTab() {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
  async open() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }
};
function el(parent, tag, cls = "", text = "") {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}
var PropertiesView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = "";
    this.searchScope = "any";
    this.scopeQuery = "";
    this.visibleKeys = [];
    this.allExpanded = false;
    this.expandedValues = /* @__PURE__ */ new Set();
    this.limits = /* @__PURE__ */ new Map();
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "Supercharged Properties";
  }
  getIcon() {
    return "list-tree";
  }
  async onOpen() {
    this.contentEl.replaceChildren();
    this.contentEl.classList.add("pv-view");
    const toolbar = el(this.contentEl, "div", "pv-toolbar");
    this.searchHeader = el(toolbar, "div", "pv-search-header");
    this.searchHeader.hidden = true;
    const search = el(this.searchHeader, "div", "pv-search");
    (0, import_obsidian.setIcon)(el(search, "span", "pv-icon"), "search");
    this.input = el(search, "input", "pv-filter");
    this.input.type = "search";
    this.input.placeholder = "Find properties, values, notes\u2026";
    this.input.setAttribute("aria-label", "Filter properties and values");
    this.input.addEventListener("input", () => {
      this.query = fold(this.input.value);
      this.render();
    });
    this.searchScopeButton = this.iconButton(this.searchHeader, "Search in: Search everything", "sliders-horizontal", () => this.openSearchScopeMenu());
    this.searchScopeButton.setAttribute("aria-haspopup", "menu");
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.toggleSearch(false);
      }
    });
    const profileRow = el(toolbar, "div", "pv-profile-row");
    this.scopeButton = this.iconButton(profileRow, "Choose properties to show", "panels-top-left", () => {
      this.scopePanel.hidden = !this.scopePanel.hidden;
      this.scopeButton.setAttribute("aria-expanded", String(!this.scopePanel.hidden));
      if (!this.scopePanel.hidden) {
        this.renderScope();
        this.scopePanel.querySelector("input")?.focus();
      }
    });
    this.scopeButton.setAttribute("aria-expanded", "false");
    this.profileSelect = el(profileRow, "select", "pv-profile-select");
    this.profileSelect.setAttribute("aria-label", "Property view");
    this.profileSelect.addEventListener("change", () => {
      const value = this.profileSelect.value;
      if (value === "all") {
        this.plugin.prefs.scope = null;
        this.plugin.prefs.activeProfile = null;
      } else if (value !== "custom") {
        const profile = this.plugin.prefs.profiles.find((item) => `profile:${item.id}` === value);
        if (profile) {
          this.plugin.prefs.scope = [...profile.keys];
          this.plugin.prefs.activeProfile = profile.id;
        }
      } else this.plugin.prefs.activeProfile = null;
      this.query = "";
      this.input.value = "";
      this.expandedValues.clear();
      void this.plugin.save();
      this.plugin.refresh();
      this.render();
    });
    const actions = el(toolbar, "div", "pv-actions pv-nav-actions");
    toolbar.prepend(actions);
    this.sortButton = this.iconButton(actions, "Sort properties", "arrow-up-narrow-wide", () => this.openSortMenu());
    this.sortButton.setAttribute("aria-haspopup", "menu");
    this.iconButton(actions, "Refresh property index", "refresh-cw", () => this.plugin.rebuild());
    this.expandToggle = this.iconButton(actions, "Expand all properties", "list-tree", () => {
      if (this.allExpanded) {
        this.query = "";
        this.input.value = "";
        this.expandedValues.clear();
        this.plugin.prefs.expanded = [];
      } else {
        this.plugin.prefs.expanded = [.../* @__PURE__ */ new Set([...this.plugin.prefs.expanded, ...this.visibleKeys])];
      }
      void this.plugin.save();
      this.render();
    });
    this.searchToggle = this.iconButton(actions, "Toggle search", "search", () => this.toggleSearch(this.searchHeader.hidden));
    this.searchToggle.setAttribute("aria-expanded", "false");
    this.scopePanel = el(toolbar, "div", "pv-scope-panel");
    this.scopePanel.hidden = true;
    this.summary = el(this.contentEl, "div", "pv-summary");
    this.summary.setAttribute("aria-live", "polite");
    this.body = el(this.contentEl, "div", "pv-tree");
    this.body.setAttribute("aria-label", "Properties, values and notes");
    this.contentEl.appendChild(this.summary);
    this.render();
  }
  toggleSearch(show) {
    this.searchHeader.hidden = !show;
    this.searchToggle.setAttribute("aria-expanded", String(show));
    this.searchToggle.setAttribute("aria-pressed", String(show));
    if (show) this.input.focus();
    else {
      this.query = "";
      this.input.value = "";
      this.render();
      this.searchToggle.focus();
    }
  }
  openSearchScopeMenu() {
    const menu = new import_obsidian.Menu();
    for (const [value, label] of [["any", "Search everything"], ["key", "Property names"], ["value", "Values"], ["note", "Note names / paths"]]) {
      menu.addItem((item) => item.setTitle(label).setChecked(this.searchScope === value).onClick(() => {
        this.searchScope = value;
        this.searchScopeButton.title = `Search in: ${label}`;
        this.searchScopeButton.setAttribute("aria-label", `Search in: ${label}`);
        this.searchScopeButton.setAttribute("data-filtered", String(value !== "any"));
        this.render();
        this.input.focus();
      }));
    }
    const rect = this.searchScopeButton.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
  }
  button(parent, label, title, run) {
    const button = el(parent, "button", "", label);
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", run);
    return button;
  }
  iconButton(parent, title, icon, run) {
    const button = this.button(parent, "", title, run);
    button.className = "pv-icon-button";
    (0, import_obsidian.setIcon)(button, icon);
    return button;
  }
  openSortMenu() {
    const menu = new import_obsidian.Menu();
    for (const [value, label] of Object.entries(sortOptions)) {
      menu.addItem((item) => item.setTitle(label).setChecked(this.plugin.prefs.sort === value).onClick(() => {
        this.plugin.prefs.sort = sortOrder(value);
        void this.plugin.save();
        this.plugin.refresh();
        this.render();
      }));
    }
    const rect = this.sortButton.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
  }
  sorted(nodes) {
    return sortNodes(nodes, this.plugin.prefs.sort);
  }
  toggleProperty(key) {
    const keys = new Set(this.plugin.prefs.expanded);
    if (keys.has(key)) keys.delete(key);
    else keys.add(key);
    this.plugin.prefs.expanded = [...keys];
    void this.plugin.save();
    this.render();
  }
  renderScope() {
    this.scopePanel.replaceChildren();
    const actions = el(this.scopePanel, "div", "pv-actions");
    this.button(actions, "All", "Show all properties", () => {
      this.plugin.prefs.scope = null;
      void this.plugin.save();
      this.renderScope();
      this.render();
    });
    this.button(actions, "None", "Clear property selection", () => {
      this.plugin.prefs.scope = [];
      void this.plugin.save();
      this.renderScope();
      this.render();
    });
    const search = el(this.scopePanel, "div", "pv-search pv-picker-search");
    (0, import_obsidian.setIcon)(el(search, "span", "pv-icon"), "search");
    const input = el(search, "input", "pv-filter");
    input.type = "search";
    input.placeholder = "Find a property\u2026";
    input.value = this.scopeQuery;
    input.setAttribute("aria-label", "Search properties to select");
    input.addEventListener("input", () => {
      this.scopeQuery = input.value;
      this.renderScopeChoices();
    });
    this.scopeChoices = el(this.scopePanel, "div", "pv-scope-choices");
    this.renderScopeChoices();
    el(this.scopePanel, "p", "pv-hint", "Search filters this list only. All / None apply to every property.");
    const manager = el(this.scopePanel, "div", "pv-profile-manager");
    el(manager, "div", "pv-hint", "Save this selection as a view");
    this.profileName = el(manager, "input", "pv-profile-name");
    this.profileName.type = "text";
    this.profileName.placeholder = "View name, e.g. Writing";
    this.profileName.maxLength = 80;
    this.profileName.setAttribute("aria-label", "Profile name");
    const buttons = el(manager, "div", "pv-profile-actions");
    this.button(buttons, "Save new", "Save selection as new profile", () => this.manageProfile("new"));
    this.profileUpdate = this.button(buttons, "Update", "Update active profile selection", () => this.manageProfile("update"));
    this.profileRename = this.button(buttons, "Rename", "Rename active profile", () => this.manageProfile("rename"));
    this.profileDelete = this.button(buttons, "Delete", "Delete active profile", () => this.manageProfile("delete"));
    this.syncProfiles();
  }
  syncProfiles() {
    const profiles = this.plugin.prefs.profiles;
    const active = profiles.find((profile) => profile.id === this.plugin.prefs.activeProfile);
    this.profileSelect.replaceChildren();
    const hidden = new Set(this.plugin.prefs.hidden.split("\n").map(fold).filter(Boolean));
    const count = (keys) => new Set([...keys].filter((key) => this.plugin.index.properties.has(key) && !hidden.has(key))).size;
    el(this.profileSelect, "option", "", `All properties (${count(this.plugin.index.properties.keys())})`).value = "all";
    if (this.plugin.prefs.scope !== null && !active) el(this.profileSelect, "option", "", `Custom selection (${count(this.plugin.prefs.scope)})`).value = "custom";
    for (const profile of profiles) {
      const modified = profile === active && !sameKeys(profile.keys, this.plugin.prefs.scope ?? [...this.plugin.index.properties.keys()]);
      el(this.profileSelect, "option", "", profile.name + (modified ? " (modified)" : "") + ` (${count(profile === active ? this.plugin.prefs.scope ?? this.plugin.index.properties.keys() : profile.keys)})`).value = `profile:${profile.id}`;
    }
    this.profileSelect.value = active ? `profile:${active.id}` : this.plugin.prefs.scope === null ? "all" : "custom";
    if (this.profileUpdate) {
      this.profileUpdate.disabled = !active;
      this.profileRename.disabled = !active;
      this.profileDelete.disabled = !active;
    }
  }
  manageProfile(action) {
    const prefs = this.plugin.prefs;
    const active = prefs.profiles.find((profile) => profile.id === prefs.activeProfile);
    const name = this.profileName.value.trim();
    if (action === "new" || action === "rename") {
      if (!name) {
        new import_obsidian.Notice("Enter a name for this view.");
        this.profileName.focus();
        return;
      }
      if (prefs.profiles.some((profile) => fold(profile.name) === fold(name) && (action === "new" || profile !== active))) {
        new import_obsidian.Notice("A view with that name already exists.");
        return;
      }
    }
    const keys = [...prefs.scope ?? this.plugin.index.properties.keys()];
    if (action === "new") {
      const id = this.contentEl.ownerDocument.defaultView.crypto.randomUUID();
      prefs.profiles.push({ id, name, keys });
      prefs.activeProfile = id;
      prefs.scope = [...keys];
    } else if (!active) return;
    else if (action === "update") {
      active.keys = keys;
      prefs.scope = [...keys];
    } else if (action === "rename") active.name = name;
    else {
      prefs.profiles = prefs.profiles.filter((profile) => profile !== active);
      prefs.activeProfile = null;
    }
    this.profileName.value = "";
    void this.plugin.save();
    this.plugin.refresh();
    this.render();
  }
  renderScopeChoices() {
    if (!this.scopeChoices) return;
    const scroll = this.scopeChoices.scrollTop;
    this.scopeChoices.replaceChildren();
    const choices = new Map([...this.plugin.index.properties.values()].map((property) => [property.id, property]));
    for (const key of this.plugin.prefs.scope ?? []) {
      if (!choices.has(key)) choices.set(key, { id: key, label: key, paths: /* @__PURE__ */ new Set(), values: /* @__PURE__ */ new Map() });
    }
    const properties = this.sorted(choices.values()).filter((property) => fold(property.label).includes(fold(this.scopeQuery)));
    for (const property of properties) {
      const label = el(this.scopeChoices, "label", "pv-scope-choice");
      const checkbox = el(label, "input");
      checkbox.type = "checkbox";
      checkbox.checked = this.plugin.prefs.scope === null || this.plugin.prefs.scope.includes(property.id);
      checkbox.dataset.pvFocus = JSON.stringify(["scope", property.id]);
      checkbox.setAttribute("aria-label", `Include ${property.label}`);
      el(label, "span", "", property.label);
      checkbox.addEventListener("change", () => {
        const scope = new Set(this.plugin.prefs.scope ?? this.plugin.index.properties.keys());
        if (checkbox.checked) scope.add(property.id);
        else scope.delete(property.id);
        this.plugin.prefs.scope = [...scope];
        void this.plugin.save();
        this.render();
      });
    }
    if (!properties.length) el(this.scopeChoices, "p", "pv-hint", "No matching properties.");
    this.scopeChoices.scrollTop = scroll;
  }
  matches(text, scope) {
    return (this.searchScope === "any" || this.searchScope === scope) && fold(text).includes(this.query);
  }
  render() {
    if (!this.body) return;
    this.syncProfiles();
    const focusId = this.contentEl.ownerDocument.activeElement?.dataset.pvFocus;
    const scroll = this.body.scrollTop;
    this.body.replaceChildren();
    if (!this.scopePanel.hidden) this.renderScopeChoices();
    const hidden = new Set(this.plugin.prefs.hidden.split("\n").map(fold).filter(Boolean));
    const pinned = new Set(this.plugin.prefs.pinned);
    const scope = this.plugin.prefs.scope;
    const properties = this.sorted(this.plugin.index.properties.values()).filter((p) => !hidden.has(p.id) && (scope === null || scope.includes(p.id))).sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
    this.sortButton.title = `Sort: ${sortOptions[this.plugin.prefs.sort]}`;
    let visible = 0;
    this.visibleKeys = [];
    for (const property of properties) {
      const keyMatches = !this.query || this.matches(property.label, "key");
      const noteMatches = (node) => [...node.paths].some((path) => this.matches(path, "note"));
      const values = this.sorted(property.values.values()).filter((v) => keyMatches || this.matches(v.label, "value") || noteMatches(v));
      if (!keyMatches && !values.length && !noteMatches(property)) continue;
      visible++;
      this.visibleKeys.push(property.id);
      const group = el(this.body, "div", "pv-group");
      const row = el(group, "div", "pv-row pv-property-row");
      const expanded = !!this.query || this.plugin.prefs.expanded.includes(property.id);
      const toggle = this.iconButton(row, `${expanded ? "Collapse" : "Expand"} ${property.label}`, expanded ? "chevron-down" : "chevron-right", () => this.toggleProperty(property.id));
      toggle.className = "pv-toggle";
      toggle.disabled = !!this.query;
      toggle.dataset.pvFocus = JSON.stringify(["toggle", property.id]);
      toggle.setAttribute("aria-expanded", String(expanded));
      const button = this.nodeButton(row, property, property, () => this.toggleProperty(property.id));
      button.setAttribute("aria-expanded", String(expanded));
      if (!expanded) continue;
      const children = el(group, "div", "pv-values");
      const limit = this.limits.get(property.id) ?? 100;
      for (const value of values.slice(0, limit)) {
        const valueGroup = el(children, "div", "pv-value-group");
        const id = JSON.stringify([property.id, value.id]);
        const showNotes = this.expandedValues.has(id) || !!this.query && !keyMatches && !this.matches(value.label, "value") && noteMatches(value);
        const valueRow = el(valueGroup, "div", "pv-row");
        const toggleValue = () => {
          if (showNotes) this.expandedValues.delete(id);
          else this.expandedValues.add(id);
          this.render();
        };
        const valueToggle = this.iconButton(valueRow, `${showNotes ? "Collapse" : "Expand"} notes for ${property.label}: ${value.label}`, showNotes ? "chevron-down" : "chevron-right", toggleValue);
        valueToggle.className = "pv-toggle";
        valueToggle.dataset.pvFocus = JSON.stringify(["value-toggle", property.id, value.id]);
        valueToggle.setAttribute("aria-expanded", String(showNotes));
        valueToggle.disabled = !!this.query && !keyMatches && !this.matches(value.label, "value") && noteMatches(value);
        const valueButton = this.nodeButton(valueRow, property, value, toggleValue);
        valueButton.setAttribute("aria-expanded", String(showNotes));
        if (showNotes) this.renderNotes(valueGroup, value, id, keyMatches || this.matches(value.label, "value"));
      }
      if (values.length > limit) this.button(children, `Show more (${values.length - limit})`, "Show more values", () => {
        this.limits.set(property.id, limit + 100);
        this.render();
      });
      const assigned = new Set([...property.values.values()].flatMap((value) => [...value.paths]));
      const otherPaths = new Set([...property.paths].filter((path) => !assigned.has(path)));
      if (otherPaths.size) this.renderNotes(children, { ...property, paths: otherPaths }, property.id, keyMatches);
    }
    this.allExpanded = this.visibleKeys.length > 0 && (!!this.query || this.visibleKeys.every((key) => this.plugin.prefs.expanded.includes(key)));
    const toggleLabel = this.allExpanded ? "Collapse all properties" : "Expand all properties";
    this.expandToggle.title = toggleLabel;
    this.expandToggle.setAttribute("aria-label", toggleLabel);
    this.expandToggle.setAttribute("aria-pressed", String(this.allExpanded));
    this.expandToggle.disabled = this.visibleKeys.length === 0;
    (0, import_obsidian.setIcon)(this.expandToggle, this.allExpanded ? "fold-vertical" : "list-tree");
    this.summary.textContent = `${visible} properties \xB7 ${scope === null ? "Entire vault" : "Custom selection"}`;
    if (!visible) el(this.body, "div", "pv-empty", scope?.length === 0 ? "Choose properties above to start exploring." : "No matching properties. Adjust your search or selection.");
    this.body.scrollTop = scroll;
    if (focusId) Array.from(this.contentEl.querySelectorAll("[data-pv-focus]")).find((e) => e.dataset.pvFocus === focusId)?.focus({ preventScroll: true });
  }
  nodeButton(row, property, node, run) {
    const isKey = node === property;
    const button = this.button(row, "", `${isKey ? "Toggle" : "Show notes with"} ${property.label}${isKey ? "" : ": " + node.label} (${node.paths.size})`, run);
    button.className = "pv-node";
    button.dataset.pvFocus = JSON.stringify([property.id, isKey ? null : node.id]);
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.showMenu(event, property, node);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "ContextMenu" || event.shiftKey && event.key === "F10") {
        event.preventDefault();
        const rect = button.getBoundingClientRect();
        this.showMenu(new MouseEvent("contextmenu", { clientX: rect.left, clientY: rect.bottom }), property, node);
      }
    });
    el(button, "span", "pv-label", node.label);
    if (isKey && this.plugin.prefs.pinned.includes(property.id)) (0, import_obsidian.setIcon)(el(button, "span", "pv-pin"), "pin");
    if (!isKey) {
      const kind = JSON.parse(node.id)[0];
      if (kind !== "string") el(button, "span", "pv-kind", kind);
    }
    if (this.plugin.prefs.counts) el(button, "span", "pv-count", String(node.paths.size));
    return button;
  }
  renderNotes(parent, node, id, ancestorMatches) {
    const notes = el(parent, "div", "pv-notes");
    const paths = [...node.paths].sort(natural).filter((path) => !this.query || ancestorMatches || this.matches(path, "note"));
    const limitKey = `notes:${id}`;
    const limit = this.limits.get(limitKey) ?? 100;
    for (const path of paths.slice(0, limit)) {
      const button = this.button(notes, "", path, () => {
      });
      button.className = "pv-file";
      (0, import_obsidian.setIcon)(el(button, "span", "pv-icon"), "file-text");
      el(button, "span", "pv-note-name", path.split("/").pop()?.replace(/\.md$/, "") ?? path);
      const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (folder) el(button, "small", "pv-note-path", folder);
      button.addEventListener("click", (event) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof import_obsidian.TFile) void this.app.workspace.getLeaf(event.ctrlKey || event.metaKey).openFile(file).catch(() => new import_obsidian.Notice("Unable to open note."));
      });
    }
    if (paths.length > limit) this.button(notes, "Show more notes", "Show 100 more notes", () => {
      this.limits.set(limitKey, limit + 100);
      this.render();
    });
  }
  queryFor(property, node) {
    if (property === node) return propertyQuery(property.label);
    const [kind] = JSON.parse(node.id);
    return propertyQuery(property.label, node.label, kind === "empty");
  }
  async copy(text) {
    try {
      await this.contentEl.ownerDocument.defaultView.navigator.clipboard.writeText(text);
      new import_obsidian.Notice("Copied to clipboard.");
    } catch {
      new import_obsidian.Notice("Clipboard unavailable.");
    }
  }
  async search(property, node) {
    const query = this.queryFor(property, node);
    let created = null;
    try {
      let leaf = this.app.workspace.getLeavesOfType("search")[0];
      if (!leaf) {
        const newLeaf = this.app.workspace.getLeftLeaf(true) ?? this.app.workspace.getLeaf(true);
        created = newLeaf;
        leaf = newLeaf;
        await newLeaf.setViewState({ type: "search", active: true });
      }
      const view = leaf.view;
      if (typeof view.setQuery !== "function") {
        created?.detach();
        created = null;
        new import_obsidian.Notice("Enable the Search core plugin to use Open in Search.");
        return;
      }
      view.setQuery(query);
      created = null;
      await this.app.workspace.revealLeaf(leaf);
      if (node !== property && JSON.parse(node.id)[0] === "empty") {
        new import_obsidian.Notice("Search matches null properties; the local empty row also includes blank strings and empty lists.");
      }
    } catch {
      if (created) {
        created.detach();
        created = null;
        new import_obsidian.Notice("Enable the Search core plugin to use Open in Search.");
        return;
      }
      new import_obsidian.Notice("Could not open Search. Your notes remain available in the property tree.");
    }
  }
  showMenu(event, property, node) {
    const menu = new import_obsidian.Menu();
    menu.addItem((item) => item.setTitle("Open in Search").setIcon("search").onClick(() => {
      void this.search(property, node);
    }));
    menu.addItem((item) => item.setTitle("Copy search query").setIcon("copy").onClick(() => {
      void this.copy(this.queryFor(property, node));
    }));
    menu.addItem((item) => item.setTitle("Copy matching note links").setIcon("link").onClick(() => {
      void this.copy([...node.paths].sort(natural).map((path) => `[[${path.replace(/\.md$/, "")}]]`).join("\n"));
    }));
    if (node === property) {
      const pinned = this.plugin.prefs.pinned.includes(property.id);
      menu.addItem((item) => item.setTitle(pinned ? "Unpin property" : "Pin property").setIcon("pin").onClick(() => {
        this.plugin.prefs.pinned = pinned ? this.plugin.prefs.pinned.filter((key) => key !== property.id) : [...this.plugin.prefs.pinned, property.id];
        void this.plugin.save();
        this.render();
      }));
      menu.addItem((item) => item.setTitle("Hide property").setIcon("eye-off").onClick(() => {
        this.plugin.prefs.hidden += `
${property.label}`;
        void this.plugin.save();
        this.render();
        new import_obsidian.Notice("Property hidden. Restore it in Supercharged Properties settings.");
      }));
    }
    menu.showAtMouseEvent(event);
  }
};
var PreferencesTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  getSettingDefinitions() {
    return [
      { name: "Show note counts", render: (setting) => {
        setting.addToggle((toggle) => toggle.setValue(this.plugin.prefs.counts).onChange(async (value) => {
          this.plugin.prefs.counts = value;
          await this.plugin.save();
        }));
      } },
      { name: "Sort by", render: (setting) => {
        setting.addDropdown((dropdown) => dropdown.addOptions(sortOptions).setValue(this.plugin.prefs.sort).onChange(async (value) => {
          this.plugin.prefs.sort = sortOrder(value);
          await this.plugin.save();
        }));
      } },
      { name: "Hidden properties", desc: "One property name per line. Leave empty to show all YAML properties.", render: (setting) => {
        setting.addTextArea((text) => text.setValue(this.plugin.prefs.hidden).onChange(async (value) => {
          this.plugin.prefs.hidden = value;
          await this.plugin.save();
        }));
      } }
    ];
  }
  display() {
    this.containerEl.replaceChildren();
    for (const definition of this.getSettingDefinitions()) {
      const setting = new import_obsidian.Setting(this.containerEl).setName(definition.name);
      if (definition.desc) setting.setDesc(definition.desc);
      definition.render(setting);
    }
  }
};
