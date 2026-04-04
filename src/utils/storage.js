import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USERS: '@gsot_users',
  CURRENT_USER: '@gsot_current_user',
  GOALS: '@gsot_goals',
  STRATEGIES: '@gsot_strategies',
  OBJECTIVES: '@gsot_objectives',
  TACTICS: '@gsot_tactics',
  TASKS: '@gsot_tasks',
};

// ─── Generic helpers ─────────────────────────────────────────────────────────

const getAll = async (key) => {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

const saveAll = async (key, items) => {
  await AsyncStorage.setItem(key, JSON.stringify(items));
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getUsers = () => getAll(KEYS.USERS);

export const saveUser = async (user) => {
  const users = await getUsers();
  const existing = users.findIndex((u) => u.id === user.id);
  if (existing >= 0) {
    users[existing] = user;
  } else {
    users.push(user);
  }
  await saveAll(KEYS.USERS, users);
};

export const getCurrentUser = async () => {
  try {
    const json = await AsyncStorage.getItem(KEYS.CURRENT_USER);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = async (user) => {
  if (user) {
    await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(KEYS.CURRENT_USER);
  }
};

// ─── GSOT CRUD helpers ───────────────────────────────────────────────────────

const makeStore = (key) => ({
  getAll: () => getAll(key),

  getByUser: async (userId) => {
    const items = await getAll(key);
    return items.filter((i) => i.userId === userId);
  },

  getById: async (id) => {
    const items = await getAll(key);
    return items.find((i) => i.id === id) || null;
  },

  save: async (item) => {
    const items = await getAll(key);
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    await saveAll(key, items);
    return item;
  },

  delete: async (id) => {
    const items = await getAll(key);
    await saveAll(key, items.filter((i) => i.id !== id));
  },

  deleteByParent: async (parentField, parentId) => {
    const items = await getAll(key);
    await saveAll(key, items.filter((i) => i[parentField] !== parentId));
  },
});

export const GoalsStore      = makeStore(KEYS.GOALS);
export const StrategiesStore = makeStore(KEYS.STRATEGIES);
export const ObjectivesStore = makeStore(KEYS.OBJECTIVES);
export const TacticsStore    = makeStore(KEYS.TACTICS);
export const TasksStore      = makeStore(KEYS.TASKS);

// ─── Standalone cascade-delete functions ─────────────────────────────────────
//
// These functions read ALL five collections from AsyncStorage in one shot,
// compute the full set of records to remove, then write everything back in
// one parallel batch.  They do NOT touch React state and have no closures
// that could go stale.  They are the ONLY delete path used by GSOTContext.

export async function cascadeDeleteGoal(goalId) {
  const [g, s, o, t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.GOALS),
    AsyncStorage.getItem(KEYS.STRATEGIES),
    AsyncStorage.getItem(KEYS.OBJECTIVES),
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);
  const goals      = JSON.parse(g  || '[]');
  const strategies = JSON.parse(s  || '[]');
  const objectives = JSON.parse(o  || '[]');
  const tactics    = JSON.parse(t  || '[]');
  const tasks      = JSON.parse(tk || '[]');

  const stratIds = strategies.filter(x => x.goalId      === goalId).map(x => x.id);
  const objIds   = objectives.filter(x => stratIds.includes(x.strategyId)).map(x => x.id);
  const tacIds   = tactics   .filter(x => objIds.includes(x.objectiveId)).map(x => x.id);

  await Promise.all([
    AsyncStorage.setItem(KEYS.GOALS,      JSON.stringify(goals     .filter(x => x.id !== goalId))),
    AsyncStorage.setItem(KEYS.STRATEGIES, JSON.stringify(strategies.filter(x => !stratIds.includes(x.id)))),
    AsyncStorage.setItem(KEYS.OBJECTIVES, JSON.stringify(objectives.filter(x => !objIds.includes(x.id)))),
    AsyncStorage.setItem(KEYS.TACTICS,    JSON.stringify(tactics   .filter(x => !tacIds.includes(x.id)))),
    AsyncStorage.setItem(KEYS.TASKS,      JSON.stringify(tasks     .filter(x => !tacIds.includes(x.tacticId)))),
  ]);
}

export async function cascadeDeleteStrategy(strategyId) {
  const [s, o, t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.STRATEGIES),
    AsyncStorage.getItem(KEYS.OBJECTIVES),
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);
  const strategies = JSON.parse(s  || '[]');
  const objectives = JSON.parse(o  || '[]');
  const tactics    = JSON.parse(t  || '[]');
  const tasks      = JSON.parse(tk || '[]');

  const objIds = objectives.filter(x => x.strategyId === strategyId).map(x => x.id);
  const tacIds = tactics   .filter(x => objIds.includes(x.objectiveId)).map(x => x.id);

  await Promise.all([
    AsyncStorage.setItem(KEYS.STRATEGIES, JSON.stringify(strategies.filter(x => x.id !== strategyId))),
    AsyncStorage.setItem(KEYS.OBJECTIVES, JSON.stringify(objectives.filter(x => !objIds.includes(x.id)))),
    AsyncStorage.setItem(KEYS.TACTICS,    JSON.stringify(tactics   .filter(x => !tacIds.includes(x.id)))),
    AsyncStorage.setItem(KEYS.TASKS,      JSON.stringify(tasks     .filter(x => !tacIds.includes(x.tacticId)))),
  ]);
}

export async function cascadeDeleteObjective(objectiveId) {
  const [o, t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.OBJECTIVES),
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);
  const objectives = JSON.parse(o  || '[]');
  const tactics    = JSON.parse(t  || '[]');
  const tasks      = JSON.parse(tk || '[]');

  const tacIds = tactics.filter(x => x.objectiveId === objectiveId).map(x => x.id);

  await Promise.all([
    AsyncStorage.setItem(KEYS.OBJECTIVES, JSON.stringify(objectives.filter(x => x.id !== objectiveId))),
    AsyncStorage.setItem(KEYS.TACTICS,    JSON.stringify(tactics   .filter(x => !tacIds.includes(x.id)))),
    AsyncStorage.setItem(KEYS.TASKS,      JSON.stringify(tasks     .filter(x => !tacIds.includes(x.tacticId)))),
  ]);
}

export async function cascadeDeleteTactic(tacticId) {
  const [t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);
  const tactics = JSON.parse(t  || '[]');
  const tasks   = JSON.parse(tk || '[]');

  await Promise.all([
    AsyncStorage.setItem(KEYS.TACTICS, JSON.stringify(tactics.filter(x => x.id !== tacticId))),
    AsyncStorage.setItem(KEYS.TASKS,   JSON.stringify(tasks  .filter(x => x.tacticId !== tacticId))),
  ]);
}

export async function deleteSingleTask(taskId) {
  const tk    = await AsyncStorage.getItem(KEYS.TASKS);
  const tasks = JSON.parse(tk || '[]');
  await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks.filter(x => x.id !== taskId)));
}

// ─── Cascade auto-complete ────────────────────────────────────────────────────
//
// Called after any save.  Reads strategies/objectives/tactics/tasks fresh from
// AsyncStorage, checks whether all children of each level are completed, and
// auto-promotes the parent to 'completed' when they are.  The chain is:
//   tasks all completed  →  tactic completed
//   tactics all completed  →  objective completed
//   objectives all completed  →  strategy completed
//
// Pass at most one of the options: the level where the change originated.
// The function cascades upward automatically.

export async function cascadeAutoComplete({ tacticId, objectiveId, strategyId } = {}) {
  const [s, o, t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.STRATEGIES),
    AsyncStorage.getItem(KEYS.OBJECTIVES),
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);

  let strategies = JSON.parse(s  || '[]');
  let objectives = JSON.parse(o  || '[]');
  let tactics    = JSON.parse(t  || '[]');
  const tasks    = JSON.parse(tk || '[]');

  const now = new Date().toISOString();
  let dirty = { s: false, o: false, t: false };

  // ── Step 1: tactic → check its tasks ──────────────────────────────────────
  if (tacticId) {
    const tactic = tactics.find((x) => x.id === tacticId);
    if (tactic && tactic.status !== 'completed') {
      const mine = tasks.filter((x) => x.tacticId === tacticId);
      if (mine.length > 0 && mine.every((x) => x.status === 'completed')) {
        tactics = tactics.map((x) =>
          x.id === tacticId ? { ...x, status: 'completed', updatedAt: now } : x
        );
        dirty.t = true;
        // Cascade: promote this tactic's objective for checking
        objectiveId = objectiveId || tactic.objectiveId;
      }
    }
  }

  // ── Step 2: objective → check its tactics ─────────────────────────────────
  if (objectiveId) {
    const objective = objectives.find((x) => x.id === objectiveId);
    if (objective && objective.status !== 'completed') {
      // Use the potentially-updated tactics array
      const mine = tactics.filter((x) => x.objectiveId === objectiveId);
      if (mine.length > 0 && mine.every((x) => x.status === 'completed')) {
        objectives = objectives.map((x) =>
          x.id === objectiveId ? { ...x, status: 'completed', updatedAt: now } : x
        );
        dirty.o = true;
        strategyId = strategyId || objective.strategyId;
      }
    }
  }

  // ── Step 3: strategy → check its objectives ───────────────────────────────
  if (strategyId) {
    const strategy = strategies.find((x) => x.id === strategyId);
    if (strategy && strategy.status !== 'completed') {
      // Use the potentially-updated objectives array
      const mine = objectives.filter((x) => x.strategyId === strategyId);
      if (mine.length > 0 && mine.every((x) => x.status === 'completed')) {
        strategies = strategies.map((x) =>
          x.id === strategyId ? { ...x, status: 'completed', updatedAt: now } : x
        );
        dirty.s = true;
      }
    }
  }

  // Write back only what changed
  const writes = [];
  if (dirty.t) writes.push(AsyncStorage.setItem(KEYS.TACTICS,    JSON.stringify(tactics)));
  if (dirty.o) writes.push(AsyncStorage.setItem(KEYS.OBJECTIVES, JSON.stringify(objectives)));
  if (dirty.s) writes.push(AsyncStorage.setItem(KEYS.STRATEGIES, JSON.stringify(strategies)));
  if (writes.length) await Promise.all(writes);

  return dirty.t || dirty.o || dirty.s; // true if anything was auto-completed
}

// ─── Progress calculation helpers ────────────────────────────────────────────

export const calcProgress = (items) => {
  if (!items || items.length === 0) return 0;
  const completed = items.filter((i) => i.status === 'completed').length;
  return Math.round((completed / items.length) * 100);
};
