import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { rescheduleAllNotifications } from '../utils/notifications';
import {
  GoalsStore,
  StrategiesStore,
  ObjectivesStore,
  TacticsStore,
  TasksStore,
  calcProgress,
  cascadeDeleteGoal,
  cascadeDeleteStrategy,
  cascadeDeleteObjective,
  cascadeDeleteTactic,
  deleteSingleTask,
  cascadeAutoComplete,
} from '../utils/storage';
import { exportData as _exportData, importData as _importData } from '../utils/exportImport';

const GSOTContext = createContext(null);
export const useGSOT = () => useContext(GSOTContext);

export const GSOTProvider = ({ children }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [tactics, setTactics] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [g, s, o, t, tk] = await Promise.all([
      GoalsStore.getByUser(user.id),
      StrategiesStore.getByUser(user.id),
      ObjectivesStore.getByUser(user.id),
      TacticsStore.getByUser(user.id),
      TasksStore.getByUser(user.id),
    ]);
    setGoals(g);
    setStrategies(s);
    setObjectives(o);
    setTactics(t);
    setTasks(tk);
    setLoading(false);
    // Rebuild the full notification schedule whenever data changes
    rescheduleAllNotifications(g, s, o, t, tk).catch(() => {});
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Goals ──────────────────────────────────────────────────────────────────

  const saveGoal = async (goalData) => {
    const goal = {
      id: goalData.id || `goal_${Date.now()}`,
      userId: user.id,
      createdAt: goalData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'not_started',
      priority: 'medium',
      ...goalData,
    };
    await GoalsStore.save(goal);
    await loadAll();
    return goal;
  };

  const deleteGoal = async (goalId) => {
    try {
      await cascadeDeleteGoal(goalId);
      await loadAll();
    } catch (err) {
      Alert.alert('Delete Failed', String(err?.message || err));
    }
  };

  // ── Strategies ─────────────────────────────────────────────────────────────

  const saveStrategy = async (data) => {
    const item = {
      id: data.id || `strategy_${Date.now()}`,
      userId: user.id,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'not_started',
      priority: 'medium',
      ...data,
    };
    await StrategiesStore.save(item);
    await loadAll();
    return item;
  };

  const deleteStrategy = async (strategyId) => {
    try {
      await cascadeDeleteStrategy(strategyId);
      await loadAll();
    } catch (err) {
      Alert.alert('Delete Failed', String(err?.message || err));
    }
  };

  // ── Objectives ─────────────────────────────────────────────────────────────

  const saveObjective = async (data) => {
    const item = {
      id: data.id || `objective_${Date.now()}`,
      userId: user.id,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'not_started',
      priority: 'medium',
      ...data,
    };
    await ObjectivesStore.save(item);
    // Auto-complete strategy if all sibling objectives are now done
    if (item.status === 'completed' && item.strategyId) {
      await cascadeAutoComplete({ strategyId: item.strategyId });
    }
    await loadAll();
    return item;
  };

  const deleteObjective = async (objectiveId) => {
    try {
      await cascadeDeleteObjective(objectiveId);
      await loadAll();
    } catch (err) {
      Alert.alert('Delete Failed', String(err?.message || err));
    }
  };

  // ── Tactics ────────────────────────────────────────────────────────────────

  const saveTactic = async (data) => {
    const item = {
      id: data.id || `tactic_${Date.now()}`,
      userId: user.id,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'not_started',
      priority: 'medium',
      ...data,
    };
    await TacticsStore.save(item);
    // Auto-complete objective → strategy if all sibling tactics are now done
    if (item.status === 'completed' && item.objectiveId) {
      await cascadeAutoComplete({ objectiveId: item.objectiveId });
    }
    await loadAll();
    return item;
  };

  const deleteTactic = async (tacticId) => {
    try {
      await cascadeDeleteTactic(tacticId);
      await loadAll();
    } catch (err) {
      Alert.alert('Delete Failed', String(err?.message || err));
    }
  };

  // ── Tasks ──────────────────────────────────────────────────────────────────

  const saveTask = async (data) => {
    const item = {
      id: data.id || `task_${Date.now()}`,
      userId: user.id,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'not_started',
      priority: 'medium',
      ...data,
    };
    await TasksStore.save(item);
    // Auto-complete tactic → objective → strategy if all children done
    if (item.status === 'completed' && item.tacticId) {
      await cascadeAutoComplete({ tacticId: item.tacticId });
    }
    await loadAll();
    return item;
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteSingleTask(taskId);
      await loadAll();
    } catch (err) {
      Alert.alert('Delete Failed', String(err?.message || err));
    }
  };

  // ── Progress helpers ───────────────────────────────────────────────────────

  const getGoalProgress = (goalId) => {
    const relStrategies = strategies.filter((s) => s.goalId === goalId);
    if (relStrategies.length === 0) return 0;
    const progresses = relStrategies.map((s) => getStrategyProgress(s.id));
    return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  };

  const getStrategyProgress = (strategyId) => {
    const relObjectives = objectives.filter((o) => o.strategyId === strategyId);
    if (relObjectives.length === 0) return 0;
    const progresses = relObjectives.map((o) => getObjectiveProgress(o.id));
    return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  };

  const getObjectiveProgress = (objectiveId) => {
    const relTactics = tactics.filter((t) => t.objectiveId === objectiveId);
    if (relTactics.length === 0) return 0;
    const progresses = relTactics.map((t) => getTacticProgress(t.id));
    return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  };

  const getTacticProgress = (tacticId) => {
    const relTasks = tasks.filter((t) => t.tacticId === tacticId);
    if (relTasks.length === 0) return 0;
    return calcProgress(relTasks);
  };

  // ── Dashboard stats ────────────────────────────────────────────────────────

  const getDashboardStats = () => {
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressItems = [
      ...goals, ...strategies, ...objectives, ...tactics,
    ].filter((i) => i.status === 'in_progress').length;

    return {
      totalGoals: goals.length,
      completedGoals,
      totalTasks: tasks.length,
      completedTasks,
      inProgressItems,
      totalStrategies: strategies.length,
      totalObjectives: objectives.length,
      totalTactics: tactics.length,
    };
  };

  // ── Import a full template chain ──────────────────────────────────────────
  const importTemplate = async (template, goalOverrides = {}) => {
    const now = new Date().toISOString();

    // Create the Goal — caller can override title/description/priority/etc.
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const goal = {
      id: goalId,
      userId: user.id,
      title: template.title,
      description: template.description,
      category: template.category || 'other',
      status: 'not_started',
      priority: 'medium',
      templateId: template.id,
      importedAt: now,
      createdAt: now,
      updatedAt: now,
      ...goalOverrides,      // title / description / priority / dueDate overrides
    };
    await GoalsStore.save(goal);

    // Create Strategies → Objectives → Tactics → Tasks
    for (let si = 0; si < template.strategies.length; si++) {
      const strat = template.strategies[si];
      const stratId = `strategy_${Date.now()}_${si}_${Math.random().toString(36).slice(2, 7)}`;
      await StrategiesStore.save({
        id: stratId,
        userId: user.id,
        goalId,
        title: strat.title,
        description: strat.description || '',
        status: 'not_started',
        createdAt: now,
        updatedAt: now,
      });

      for (let oi = 0; oi < strat.objectives.length; oi++) {
        const obj = strat.objectives[oi];
        const objId = `objective_${Date.now()}_${si}_${oi}_${Math.random().toString(36).slice(2, 7)}`;
        await ObjectivesStore.save({
          id: objId,
          userId: user.id,
          strategyId: stratId,
          title: obj.title,
          description: obj.description || '',
          measures: obj.measures || '',
          status: 'not_started',
          createdAt: now,
          updatedAt: now,
        });

        for (let ti = 0; ti < obj.tactics.length; ti++) {
          const tac = obj.tactics[ti];
          const tacId = `tactic_${Date.now()}_${si}_${oi}_${ti}_${Math.random().toString(36).slice(2, 7)}`;
          await TacticsStore.save({
            id: tacId,
            userId: user.id,
            objectiveId: objId,
            title: tac.title,
            description: tac.description || '',
            status: 'not_started',
            createdAt: now,
            updatedAt: now,
          });

          for (let tki = 0; tki < (tac.tasks || []).length; tki++) {
            const task = tac.tasks[tki];
            await TasksStore.save({
              id: `task_${Date.now()}_${si}_${oi}_${ti}_${tki}_${Math.random().toString(36).slice(2, 7)}`,
              userId: user.id,
              tacticId: tacId,
              title: task.title,
              description: task.description || '',
              status: 'not_started',
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }
    }

    await loadAll();
    return goalId;
  };

  // ── Export / Import ───────────────────────────────────────────────────────
  const exportData = () => _exportData(user);

  const importData = async (jsonString, mode = 'merge') => {
    const result = await _importData(jsonString, user, mode);
    if (result.success) await loadAll();
    return result;
  };

  return (
    <GSOTContext.Provider
      value={{
        goals,
        strategies,
        objectives,
        tactics,
        tasks,
        loading,
        loadAll,
        // CRUD
        saveGoal,
        deleteGoal,
        saveStrategy,
        deleteStrategy,
        saveObjective,
        deleteObjective,
        saveTactic,
        deleteTactic,
        saveTask,
        deleteTask,
        // Templates
        importTemplate,
        // Progress
        getGoalProgress,
        getStrategyProgress,
        getObjectiveProgress,
        getTacticProgress,
        // Stats
        getDashboardStats,
        // Export / Import
        exportData,
        importData,
      }}
    >
      {children}
    </GSOTContext.Provider>
  );
};
