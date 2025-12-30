import { useState, useRef } from "react";
import { useData } from "../context/DataContext";
import TaskDrawer from "../components/TaskDrawer";
import type { Task } from "@eisenhower/shared";

const COLORS = [
  "#ef4444",
  "#22c55e",
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#facc15",
  "#64748b",
  "#0f172a",
];
const COLOR_NAMES: Record<string, string> = {
  "#ef4444": "Red",
  "#22c55e": "Green",
  "#f97316": "Orange",
  "#3b82f6": "Blue",
  "#8b5cf6": "Purple",
  "#ec4899": "Pink",
  "#14b8a6": "Teal",
  "#facc15": "Yellow",
  "#64748b": "Gray",
  "#0f172a": "Dark",
};

const QUADRANT_LABELS: Record<string, string> = {
  do: "Do",
  decide: "Schedule",
  delegate: "Delegate",
  delete: "Eliminate",
};

export default function Todos() {
  const { tasks, addTask, updateTask, deleteTask, reorderTasks, loading } = useData();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const grouped = tasks.reduce(
    (acc, task) => {
      if (!acc[task.color]) acc[task.color] = [];
      acc[task.color].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  const sortedColors = COLORS.filter((c) => grouped[c]);

  const handleAddTask = () => {
    const newTask = addTask({
      title: "",
      note: "",
      tags: [],
      color: COLORS[0],
      q: null,
      completed: false,
    });
    setActiveTask(newTask);
  };

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, { completed: !task.completed });
  };

  const handleUpdate = (updates: Partial<Task>) => {
    if (activeTask) {
      updateTask(activeTask.id, updates);
      setActiveTask({ ...activeTask, ...updates });
    }
  };

  const handleDelete = () => {
    if (activeTask) {
      deleteTask(activeTask.id);
      setActiveTask(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    setTimeout(() => {
      (e.target as HTMLElement).classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragging");
    setDraggedTask(null);
    setDragOverId(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragCounter.current++;
    if (draggedTask && draggedTask.id !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (!draggedTask || draggedTask.id === targetTask.id) {
      setDragOverId(null);
      return;
    }

    if (draggedTask.color !== targetTask.color) {
      setDragOverId(null);
      return;
    }

    const colorTasks = grouped[targetTask.color];
    const draggedIndex = colorTasks.findIndex((t) => t.id === draggedTask.id);
    const targetIndex = colorTasks.findIndex((t) => t.id === targetTask.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDragOverId(null);
      return;
    }

    const newColorTasks = [...colorTasks];
    newColorTasks.splice(draggedIndex, 1);
    newColorTasks.splice(targetIndex, 0, draggedTask);

    const newTaskIds: string[] = [];
    for (const color of COLORS) {
      if (color === targetTask.color) {
        newTaskIds.push(...newColorTasks.map((t) => t.id));
      } else if (grouped[color]) {
        newTaskIds.push(...grouped[color].map((t) => t.id));
      }
    }

    reorderTasks(newTaskIds);
    setDragOverId(null);
  };

  const handleDropEnd = (e: React.DragEvent, color: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (!draggedTask || draggedTask.color !== color) {
      setDragOverId(null);
      return;
    }

    const colorTasks = grouped[color];
    const draggedIndex = colorTasks.findIndex((t) => t.id === draggedTask.id);

    if (draggedIndex === -1 || draggedIndex === colorTasks.length - 1) {
      setDragOverId(null);
      return;
    }

    const newColorTasks = [...colorTasks];
    newColorTasks.splice(draggedIndex, 1);
    newColorTasks.push(draggedTask);

    const newTaskIds: string[] = [];
    for (const c of COLORS) {
      if (c === color) {
        newTaskIds.push(...newColorTasks.map((t) => t.id));
      } else if (grouped[c]) {
        newTaskIds.push(...grouped[c].map((t) => t.id));
      }
    }

    reorderTasks(newTaskIds);
    setDragOverId(null);
  };

  if (loading) {
    return (
      <>
        <header>
          <h1>Todos</h1>
        </header>
        <div className="empty-state">Loading...</div>
      </>
    );
  }

  return (
    <>
      <header>
        <h1>Todos</h1>
      </header>

      <div className="todo-container">
        <div className="todo-groups">
          {sortedColors.length === 0 ? (
            <div className="empty-state">
              No todos yet. Add one to get started!
            </div>
          ) : (
            sortedColors.map((color) => (
              <div key={color} className="todo-group">
                <div className="todo-group-header">
                  <span
                    className="todo-group-dot"
                    style={{ background: color }}
                  ></span>
                  <span>{COLOR_NAMES[color] || "Other"}</span>
                </div>
                <div className="todo-list">
                  {grouped[color].map((task) => (
                    <div
                      key={task.id}
                      className={`todo-item ${task.completed ? "completed" : ""} ${dragOverId === task.id ? "drag-over" : ""}`}
                      onClick={() => setActiveTask(task)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onDragEnter={(e) => handleDragEnter(e, task.id)}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, task)}
                    >
                      <span className="drag-handle">⋮⋮</span>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleToggleComplete(task)}
                      />
                      <span>{task.title || "Untitled"}</span>
                      {task.q && (
                        <span className={`quadrant-badge q-${task.q}`}>
                          {QUADRANT_LABELS[task.q]}
                        </span>
                      )}
                    </div>
                  ))}
                  {/* Drop zone for end of list */}
                  <div
                    className={`todo-drop-end ${dragOverId === `end-${color}` ? "drag-over" : ""}`}
                    onDragEnter={(e) => handleDragEnter(e, `end-${color}`)}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropEnd(e, color)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
        <button className="add-todo-btn" onClick={handleAddTask}>
          + Add Todo
        </button>
      </div>

      <TaskDrawer
        task={activeTask}
        onClose={() => setActiveTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        showQuadrant={true}
      />
    </>
  );
}
