/**
 * Client projects: named saves of builder state with notes, snapshots and JSON import/export.
 * Pure logic over any localStorage-like object so it can be unit-tested in Node.
 * Exposed as window.ProjectStore and via module.exports.
 */
(function (root) {
  const KEY = 'web_builder_projects_v1';
  const FORMAT = 'web-builder-project';
  const MAX_SNAPSHOTS = 20;
  // Version of the project file format. Bump it when the shape of a saved page changes and add a step to MIGRATIONS.
  const CURRENT_VERSION = 4;
  const PAGE_DEFAULTS = { title: 'Assembled Web Page', description: '', favicon: '', fontDisplay: '', fontBody: '', lang: 'en', radius: '', shareImage: '', canonical: '', robots: '', bizType: '', bizName: '', bizPhone: '', bizEmail: '', bizAddress: '', formMethod: '', formTarget: '', altTheme: '', altBg: '', altText: '', altAccent: '', modeButton: '' };

  /**
   * Steps that bring a page state saved by an older version up to the next one, keyed by the version they start from.
   * 1 -> 2: page settings gained share image, canonical address and robots; every key is now always present.
   * 2 -> 3: page settings gained the business fields used for JSON-LD.
   * 3 -> 4: projects can have several pages (`pages`, `activePageId`); older ones are single-page.
   */
  const MIGRATIONS = {
    1: (state) => ({ ...state, page: { ...PAGE_DEFAULTS, ...(state.page || {}) } }),
    2: (state) => ({ ...state, page: { ...PAGE_DEFAULTS, ...(state.page || {}) } }),
    3: (state) => ({ ...state, pages: Array.isArray(state.pages) ? state.pages : [], activePageId: state.activePageId || null })
  };

  /** Brings a page state from `fromVersion` to the current format (a copy; the input is not changed). */
  function migrateState(state, fromVersion) {
    let out = clone(state);
    for (let v = Number(fromVersion) || 1; v < CURRENT_VERSION; v++) {
      if (MIGRATIONS[v]) out = MIGRATIONS[v](out);
    }
    return out;
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function validState(state) {
    return !!state && typeof state === 'object' && Array.isArray(state.stack);
  }

  const Sanitize = (typeof require === 'function' && typeof module !== 'undefined' && module.exports) ? require('./project-sanitize.js') : root.ProjectSanitize;
  const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

  function createProjectStore(storage, options = {}) {
    const key = options.key || KEY;
    const maxSnapshots = options.maxSnapshots || MAX_SNAPSHOTS;

    function load() {
      try {
        const data = JSON.parse(storage.getItem(key) || 'null');
        if (data && typeof data === 'object' && data.projects && typeof data.projects === 'object') return data;
      } catch (_) { /* corrupted: start over */ }
      return { activeId: null, projects: {} };
    }

    function persist(data) {
      try {
        storage.setItem(key, JSON.stringify(data));
        return true;
      } catch (_) {
        return false; // quota exceeded or storage unavailable
      }
    }

    function summarize(p) {
      return { id: p.id, name: p.name, client: p.client, notes: p.notes, createdAt: p.createdAt, updatedAt: p.updatedAt, sections: (p.state.stack || []).length, snapshots: p.snapshots.length };
    }

    return {
      list() {
        return Object.values(load().projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(summarize);
      },
      get(id) {
        const p = load().projects[id];
        return p ? clone(p) : null;
      },
      activeId() {
        const d = load();
        return d.projects[d.activeId] ? d.activeId : null;
      },
      setActive(id) {
        const d = load();
        if (!d.projects[id]) return false;
        d.activeId = id;
        return persist(d);
      },
      create({ name, client = '', notes = '', state }) {
        if (!validState(state)) throw new Error('A project needs a state with a stack');
        const d = load();
        const now = new Date().toISOString();
        const p = { id: uid('proj'), name: (name || '').trim() || 'Untitled project', client, notes, createdAt: now, updatedAt: now, state: clone(state), snapshots: [] };
        d.projects[p.id] = p;
        d.activeId = p.id;
        if (!persist(d)) throw new Error('Could not save: browser storage is full');
        return clone(p);
      },
      update(id, { name, client, notes }) {
        const d = load();
        const p = d.projects[id];
        if (!p) return false;
        if (typeof name === 'string' && name.trim()) p.name = name.trim();
        if (typeof client === 'string') p.client = client;
        if (typeof notes === 'string') p.notes = notes;
        p.updatedAt = new Date().toISOString();
        return persist(d);
      },
      saveState(id, state) {
        const d = load();
        const p = d.projects[id];
        if (!p || !validState(state)) return false;
        p.state = clone(state);
        p.updatedAt = new Date().toISOString();
        return persist(d);
      },
      snapshot(id, label) {
        const d = load();
        const p = d.projects[id];
        if (!p) return null;
        const snap = { id: uid('snap'), at: new Date().toISOString(), label: (label || '').trim() || 'Snapshot', state: clone(p.state) };
        p.snapshots = [snap, ...p.snapshots].slice(0, maxSnapshots);
        if (!persist(d)) return null;
        return { id: snap.id, at: snap.at, label: snap.label };
      },
      snapshots(id) {
        const p = load().projects[id];
        return p ? p.snapshots.map(({ id: sid, at, label, state }) => ({ id: sid, at, label, sections: state.stack.length })) : [];
      },
      restoreSnapshot(id, snapId) {
        const p = load().projects[id];
        const snap = p && p.snapshots.find(s => s.id === snapId);
        return snap ? clone(snap.state) : null;
      },
      deleteSnapshot(id, snapId) {
        const d = load();
        const p = d.projects[id];
        if (!p) return false;
        p.snapshots = p.snapshots.filter(s => s.id !== snapId);
        return persist(d);
      },
      remove(id) {
        const d = load();
        if (!d.projects[id]) return false;
        delete d.projects[id];
        if (d.activeId === id) d.activeId = Object.keys(d.projects)[0] || null;
        return persist(d);
      },
      exportProject(id, extras) {
        const p = load().projects[id];
        if (!p) return null;
        const { name, client, notes, state, snapshots, createdAt, updatedAt } = p;
        return JSON.stringify({ format: FORMAT, version: CURRENT_VERSION, exportedAt: new Date().toISOString(), project: { name, client, notes, createdAt, updatedAt, state, snapshots }, extras: extras || {} }, null, 2);
      },
      importProject(json) {
        if (typeof json === 'string' && json.length > MAX_IMPORT_BYTES) throw new Error('That file is too large to be a project (over 20 MB)');
        let parsed;
        try { parsed = JSON.parse(json); } catch (_) { throw new Error('That file is not valid JSON'); }
        if (!parsed || parsed.format !== FORMAT || !parsed.project) throw new Error('That file is not a Web Builder project export');
        const fileVersion = Number(parsed.version) || 1;
        if (fileVersion > CURRENT_VERSION) throw new Error(`That project file was saved by a newer version of the builder (file version ${fileVersion}, this one reads up to ${CURRENT_VERSION}). Update the builder to open it.`);
        const src = parsed.project;
        if (!validState(src.state)) throw new Error('The project file has no page content');
        // older files are brought up to date, saved snapshots included
        src.state = migrateState(src.state, fileVersion);
        if (Array.isArray(src.snapshots)) src.snapshots = src.snapshots.map(s => (s && validState(s.state) ? { ...s, state: migrateState(s.state, fileVersion) } : s));
        // anything that could carry code is stripped; the page keeps what the builder itself would have written
        let removed = 0;
        if (Sanitize) {
          const cleaned = Sanitize.sanitizeState(src.state);
          src.state = cleaned.state;
          removed += cleaned.removed;
          if (Array.isArray(src.snapshots)) src.snapshots = src.snapshots.map(s => { if (!s || !validState(s.state)) return s; const c = Sanitize.sanitizeState(s.state); removed += c.removed; return { ...s, state: c.state }; });
        }
        const d = load();
        const now = new Date().toISOString();
        const p = {
          id: uid('proj'),
          name: String(src.name || 'Imported project').slice(0, 120),
          client: String(src.client || '').slice(0, 120),
          notes: String(src.notes || '').slice(0, 5000),
          createdAt: src.createdAt || now,
          updatedAt: now,
          state: clone(src.state),
          snapshots: (Array.isArray(src.snapshots) ? src.snapshots : []).filter(s => s && validState(s.state)).slice(0, maxSnapshots)
            .map(s => ({ id: uid('snap'), at: s.at || now, label: String(s.label || 'Snapshot').slice(0, 120), state: clone(s.state) }))
        };
        d.projects[p.id] = p;
        d.activeId = p.id;
        if (!persist(d)) throw new Error('Could not save: browser storage is full');
        const out = clone(p);
        out.sanitizedCount = removed;
        // Per-user extras that travel with the file (starred components); the caller decides what to merge
        const ex = parsed.extras && typeof parsed.extras === 'object' ? parsed.extras : {};
        out.extras = { favourites: (Array.isArray(ex.favourites) ? ex.favourites : []).filter(x => typeof x === 'string').slice(0, 500) };
        return out;
      }
    };
  }

  const api = { createProjectStore, migrateState, FORMAT, MAX_SNAPSHOTS, CURRENT_VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ProjectStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
