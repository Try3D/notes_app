import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { tasksAtom, addTaskAtom, updateTaskAtom, deleteTaskAtom, moveTaskAtom, loadingAtom } from "../store";
import TaskDrawer from "../components/TaskDrawer";
import WavyTitle from "../components/WavyTitle";
import type { Task } from "@eisenhower/shared";

type KanbanColumn = "backlog" | "todo" | "in-progress" | "done";

const COLUMNS: { id: KanbanColumn; title: string; color: string }[] = [
  { id: "backlog", title: "Backlog", color: "#64748b" },
  { id: "todo", title: "To Do", color: "#8b5cf6" },
  { id: "in-progress", title: "In Progress", color: "#f97316" },
  { id: "done", title: "Done", color: "#22c55e" },
];

export default function Kanban() {
  const tasks = useAtomValue(tasksAtom);
  const loading = useAtomValue(loadingAtom);
  const addTask = useSetAtom(addTaskAtom);
  const updateTask = useSetAtom(updateTaskAtom);
  const deleteTask = useSetAtom(deleteTaskAtom);
  const moveTask = useSetAtom(moveTaskAtom);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const getTasksByColumn = (column: KanbanColumn | null) => {
    if (column === null) {
      return tasks.filter((t) => !t.kanban);
    }
    return tasks.filter((t) => t.kanban === column);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragOverTaskId(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, column: KanbanColumn | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  };

  const handleColumnDrop = (e: React.DragEvent, column: KanbanColumn | null) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const columnTasks = getTasksByColumn(column);
    moveTask(draggedTaskId, { kanban: column }, columnTasks.length, "kanban", column);
    handleDragEnd();
  };

  const handleTaskDragEnter = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId && draggedTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleTaskDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTaskId || draggedTaskId === targetTask.id) {
      handleDragEnd();
      return;
    }

    const targetColumn = targetTask.kanban;
    const columnTasks = getTasksByColumn(targetColumn);
    const targetIndex = columnTasks.findIndex((t) => t.id === targetTask.id);

    moveTask(draggedTaskId, { kanban: targetColumn }, targetIndex, "kanban", targetColumn);
    handleDragEnd();
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

  const handleAddTask = async (column: KanbanColumn) => {
    const newTask = await addTask({
      title: "",
      note: "",
      tags: [],
      color: "#3b82f6",
      q: null,
      kanban: column,
      completed: false,
    });
    if (newTask) setActiveTask(newTask);
  };

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={`kanban-task ${task.completed ? "completed" : ""} ${
        draggedTaskId === task.id ? "dragging" : ""
      } ${dragOverTaskId === task.id ? "drag-over" : ""}`}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      onDragEnter={(e) => handleTaskDragEnter(e, task.id)}
      onDragOver={handleTaskDragOver}
      onDrop={(e) => handleTaskDrop(e, task)}
      onClick={() => setActiveTask(task)}
    >
      <div className="kanban-task-header">
        <div className="kanban-task-color" style={{ background: task.color }}></div>
        <input
          type="checkbox"
          checked={task.completed}
          onClick={(e) => e.stopPropagation()}
          onChange={() => handleToggleComplete(task)}
        />
        <span className="kanban-task-title">{task.title || "Untitled"}</span>
        {task.q && (
          <span className={`kanban-task-quadrant q-${task.q}`}>
            {task.q === "do" ? "Do" : task.q === "decide" ? "Schedule" : task.q === "delegate" ? "Delegate" : "Eliminate"}
          </span>
        )}
      </div>
      {task.note && <p className="kanban-task-note">{task.note.slice(0, 80)}{task.note.length > 80 ? "..." : ""}</p>}
    </div>
  );

  if (loading) {
    return (
      <>
        <header>
          <WavyTitle>Kanban Board</WavyTitle>
        </header>
        <div className="empty-state">Loading...</div>
      </>
    );
  }

  const unassignedTasks = getTasksByColumn(null);

  return (
    <>
      <header>
        <WavyTitle>Kanban Board</WavyTitle>
      </header>

      <div className="kanban-container">
        <div
          className="kanban-unassigned"
          onDragOver={(e) => handleColumnDragOver(e, null)}
          onDragLeave={() => setDragOverColumn(null)}
          onDrop={(e) => handleColumnDrop(e, null)}
        >
          <div className="kanban-column-header" style={{ borderColor: "#64748b" }}>
            <span className="kanban-column-title">Unassigned</span>
            <span className="kanban-column-count">{unassignedTasks.length}</span>
          </div>
          <div className="kanban-tasks">
            {unassignedTasks.map((task) => renderTask(task))}
          </div>
        </div>

        <div className="kanban-board">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByColumn(column.id);
            return (
              <div
                key={column.id}
                className={`kanban-column ${dragOverColumn === column.id ? "drag-over" : ""}`}
                onDragOver={(e) => handleColumnDragOver(e, column.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleColumnDrop(e, column.id)}
              >
                <div className="kanban-column-header" style={{ borderColor: column.color }}>
                  <span className="kanban-column-title">{column.title}</span>
                  <span className="kanban-column-count">{columnTasks.length}</span>
                </div>
                <div className="kanban-tasks">
                  {columnTasks.map((task) => renderTask(task))}
                </div>
                <button className="kanban-add-btn" onClick={() => handleAddTask(column.id)}>
                  + Add Task
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDrawer
        task={activeTask}
        onClose={() => setActiveTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        showQuadrant={true}
        showKanban={true}
      />
    </>
  );
}
