import React, { useEffect, useState, useCallback } from 'react';
import { Task, Contributor, SystemStats } from './types.js';
import { Navbar } from './components/Navbar.js';
import { MetricsBar } from './components/MetricsBar.js';
import { TaskCard } from './components/TaskCard.js';
import { TaskTableView } from './components/TaskTableView.js';
import { TaskHistoryModal } from './components/TaskHistoryModal.js';
import { NewTaskModal } from './components/NewTaskModal.js';
import { InterveneModal } from './components/InterveneModal.js';
import { RecoverModal } from './components/RecoverModal.js';
import { ContributorsModal } from './components/ContributorsModal.js';
import { SimulationConfigModal } from './components/SimulationConfigModal.js';
import {
  Search,
  RefreshCw,
  Plus,
  Inbox,
  Sparkles,
} from 'lucide-react';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // View Mode: 'grid' or 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('terac-view-mode') as 'grid' | 'table') || 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('terac-view-mode', mode);
  };

  // Filters
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expertiseFilter, setExpertiseFilter] = useState<string>('all');

  // Modals
  const [newTaskOpen, setNewTaskOpen] = useState<boolean>(false);
  const [contributorsOpen, setContributorsOpen] = useState<boolean>(false);
  const [simulationOpen, setSimulationOpen] = useState<boolean>(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [interveneTask, setInterveneTask] = useState<Task | null>(null);
  const [recoverTask, setRecoverTask] = useState<Task | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warn' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, contribRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/contributors'),
      ]);
      const tasksData = await tasksRes.json();
      const contribData = await contribRes.json();

      setTasks(tasksData.tasks || []);
      setStats(tasksData.stats || null);
      setContributors(contribData.contributors || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Connect to SSE event stream
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'TASK_CREATED' || payload.type === 'TASK_UPDATED') {
          const { task, stats: updatedStats } = payload.data;
          setTasks((prev) => {
            const index = prev.findIndex((t) => t.id === task.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = task;
              return updated;
            } else {
              return [task, ...prev];
            }
          });
          if (updatedStats) setStats(updatedStats);

          setHistoryTask((current) => (current && current.id === task.id ? task : current));
        } else if (payload.type === 'SYSTEM_RESET') {
          fetchData();
        } else if (payload.type === 'CONTRIBUTOR_UPDATED') {
          fetch('/api/contributors')
            .then((res) => res.json())
            .then((data) => setContributors(data.contributors || []));
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchData]);

  // Operator Handlers
  const handleCreateTask = async (data: {
    title: string;
    description: string;
    expertiseRequired: string;
    autoRoute: boolean;
    forceStuck: boolean;
  }) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok) {
      showToast(
        data.forceStuck
          ? `Created task '${result.task.title}' (Simulating 20% hanging edge case)`
          : `Created task '${result.task.title}' and submitted for routing!`,
        data.forceStuck ? 'warn' : 'success'
      );
      fetchData();
    } else {
      alert(result.error || 'Failed to create task');
    }
  };

  const handleIntervene = async (
    action: 'manual_assign' | 'cancel_routing' | 'force_reroute',
    contributorId?: string,
    reason?: string
  ) => {
    if (!interveneTask) return;
    const res = await fetch(`/api/tasks/${interveneTask.id}/intervene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, contributorId, reason, operatorName: 'Human Operator' }),
    });
    if (res.ok) {
      showToast(`Operator intervention applied to ${interveneTask.id}`, 'info');
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || 'Intervention failed');
    }
  };

  const handleRecover = async (
    action: 'reroute' | 'manual',
    contributorId?: string,
    reason?: string
  ) => {
    if (!recoverTask) return;
    const res = await fetch(`/api/tasks/${recoverTask.id}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, contributorId, reason, operatorName: 'Human Operator' }),
    });
    if (res.ok) {
      showToast(`Task ${recoverTask.id} recovered successfully!`, 'success');
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || 'Recovery failed');
    }
  };

  const handleContributorAccept = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/contributor-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    if (res.ok) {
      showToast(`Contributor accepted assignment for ${taskId}. Routing finished!`, 'success');
      fetchData();
    }
  };

  const handleContributorDecline = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/contributor-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'decline',
        reason: 'Current workload capacity exceeded',
      }),
    });
    if (res.ok) {
      showToast(`Contributor declined assignment for ${taskId}. Ready for operator recovery.`, 'warn');
      fetchData();
    }
  };

  const handleSeedStuckDemo = async () => {
    const res = await fetch('/api/system/seed-demo-routing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stuck' }),
    });
    const result = await res.json();
    if (res.ok) {
      showToast(
        `Spawned unresolved routing request ${result.task.id} (20% Edge Case Demo)`,
        'warn'
      );
      fetchData();
    }
  };

  const handleResetDatabase = async () => {
    if (confirm('Reset system and tasks to initial demo state?')) {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      if (res.ok) {
        showToast('System database reset to initial demonstration state.', 'info');
        fetchData();
      }
    }
  };

  const handleAddContributor = async (data: {
    name: string;
    email: string;
    title: string;
    expertise: string[];
  }) => {
    const res = await fetch('/api/contributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      showToast(`Added specialist ${data.name}!`, 'success');
      const contribRes = await fetch('/api/contributors');
      const contribData = await contribRes.json();
      setContributors(contribData.contributors || []);
    }
  };

  // Filter & Search processing
  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'routing' && task.state !== 'routing') return false;
    if (activeFilter === 'assigned' && task.state !== 'assigned') return false;
    if (activeFilter === 'accepted' && task.state !== 'accepted') return false;
    if (
      activeFilter === 'needs_recovery' &&
      task.state !== 'failed' &&
      task.state !== 'declined'
    )
      return false;
    if (activeFilter === 'cancelled' && task.state !== 'cancelled') return false;

    if (
      expertiseFilter !== 'all' &&
      task.expertiseRequired.toLowerCase() !== expertiseFilter.toLowerCase()
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchId = task.id.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchAssignee =
        task.activeAssignee && task.activeAssignee.name.toLowerCase().includes(q);
      const matchExp = task.expertiseRequired.toLowerCase().includes(q);

      if (!matchTitle && !matchId && !matchDesc && !matchAssignee && !matchExp) {
        return false;
      }
    }

    return true;
  });

  // Extract unique expertise areas
  const allExpertiseAreas = Array.from(
    new Set([
      'Finance',
      'Healthcare',
      'Data Analysis',
      'Operations',
      'Legal',
      'Security',
      ...tasks.map((t) => t.expertiseRequired),
      ...contributors.flatMap((c) => c.expertise),
    ])
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        connected={connected}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onOpenNewTask={() => setNewTaskOpen(true)}
        onOpenContributors={() => setContributorsOpen(true)}
        onOpenSimulation={() => setSimulationOpen(true)}
        onSeedStuckDemo={handleSeedStuckDemo}
        onResetDatabase={handleResetDatabase}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-3.5 py-2.5 rounded-lg border shadow-lg flex items-center space-x-2 text-xs font-medium bg-card text-card-foreground ${
              toastMessage.type === 'warn'
                ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                : toastMessage.type === 'info'
                ? 'border-sky-500/40 text-sky-700 dark:text-sky-300'
                : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real-time Metrics Bar */}
        <MetricsBar
          stats={stats}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
        />

        {/* Filter & Controls Toolbar */}
        <div className="p-3 rounded-xl bg-card border border-border mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'routing', label: 'In Routing' },
              { id: 'assigned', label: 'Assigned' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'needs_recovery', label: 'Needs Action' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Expertise Filter */}
          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks, specialists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 rounded-md bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring outline-none w-44 sm:w-56 transition"
              />
            </div>

            {/* Expertise Dropdown */}
            <div className="relative">
              <select
                value={expertiseFilter}
                onChange={(e) => setExpertiseFilter(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-background border border-input text-xs text-foreground outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="all">All Expertise</option>
                {allExpertiseAreas.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchData}
              title="Refresh data"
              className="p-1 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Task View (Grid or Table) */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-xs font-medium">Loading tasks from engine...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center rounded-xl border border-dashed border-border bg-card/50 p-8 flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <Inbox className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No tasks found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Try adjusting your filter or search query, or submit a new task for routing.
            </p>
            <button
              onClick={() => setNewTaskOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <TaskTableView
            tasks={filteredTasks}
            onInspectHistory={(t) => setHistoryTask(t)}
            onIntervene={(t) => setInterveneTask(t)}
            onRecover={(t) => setRecoverTask(t)}
            onContributorAccept={handleContributorAccept}
            onContributorDecline={handleContributorDecline}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onInspectHistory={(t) => setHistoryTask(t)}
                onIntervene={(t) => setInterveneTask(t)}
                onRecover={(t) => setRecoverTask(t)}
                onContributorAccept={handleContributorAccept}
                onContributorDecline={handleContributorDecline}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <NewTaskModal
        isOpen={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onSubmit={handleCreateTask}
      />

      <TaskHistoryModal
        task={historyTask}
        onClose={() => setHistoryTask(null)}
      />

      <InterveneModal
        task={interveneTask}
        contributors={contributors}
        isOpen={Boolean(interveneTask)}
        onClose={() => setInterveneTask(null)}
        onExecute={handleIntervene}
      />

      <RecoverModal
        task={recoverTask}
        contributors={contributors}
        isOpen={Boolean(recoverTask)}
        onClose={() => setRecoverTask(null)}
        onRecover={handleRecover}
      />

      <ContributorsModal
        contributors={contributors}
        isOpen={contributorsOpen}
        onClose={() => setContributorsOpen(false)}
        onAddContributor={handleAddContributor}
      />

      <SimulationConfigModal
        isOpen={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        onResetDatabase={handleResetDatabase}
      />
    </div>
  );
}
