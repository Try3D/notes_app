import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { tasksAtom, updateTaskAtom, deleteTaskAtom, moveTaskAtom, loadingAtom } from '../store'
import TaskDrawer from '../components/TaskDrawer'
import WavyTitle from '../components/WavyTitle'
import type { Task } from '@eisenhower/shared'

type Quadrant = 'do' | 'decide' | 'delegate' | 'delete' | null

const QUADRANTS: { id: Exclude<Quadrant, null>; title: string; subtitle: string; color: string }[] = [
  { id: 'do', title: 'Important & Urgent', subtitle: 'Do First', color: 'red' },
  { id: 'decide', title: 'Important & Not Urgent', subtitle: 'Schedule', color: 'green' },
  { id: 'delegate', title: 'Not Important & Urgent', subtitle: 'Delegate', color: 'orange' },
  { id: 'delete', title: 'Not Important & Not Urgent', subtitle: 'Eliminate', color: 'blue' },
]

export default function Matrix() {
  const tasks = useAtomValue(tasksAtom)
  const loading = useAtomValue(loadingAtom)
  const updateTask = useSetAtom(updateTaskAtom)
  const deleteTask = useSetAtom(deleteTaskAtom)
  const moveTask = useSetAtom(moveTaskAtom)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Quadrant | 'unassigned' | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  const getTasksByQuadrant = (q: Quadrant) => tasks.filter(t => t.q === q)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverQuadrant(null)
    setDragOverTaskId(null)
  }

  const handleQuadrantDragOver = (e: React.DragEvent, quadrant: Quadrant | 'unassigned') => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverQuadrant(quadrant)
  }

  const handleQuadrantDrop = (e: React.DragEvent, quadrant: Quadrant | 'unassigned') => {
    e.preventDefault()
    if (!draggedTaskId) return

    const targetQ = quadrant === 'unassigned' ? null : quadrant
    const quadrantTasks = getTasksByQuadrant(targetQ)
    moveTask(draggedTaskId, { q: targetQ }, quadrantTasks.length, 'q', targetQ)
    handleDragEnd()
  }

  const handleTaskDragEnter = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedTaskId && draggedTaskId !== taskId) {
      setDragOverTaskId(taskId)
    }
  }

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleTaskDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedTaskId || draggedTaskId === targetTask.id) {
      handleDragEnd()
      return
    }

    const targetQ = targetTask.q
    const quadrantTasks = getTasksByQuadrant(targetQ)
    const targetIndex = quadrantTasks.findIndex(t => t.id === targetTask.id)

    moveTask(draggedTaskId, { q: targetQ }, targetIndex, 'q', targetQ)
    handleDragEnd()
  }

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, { completed: !task.completed })
  }

  const handleUpdate = (updates: Partial<Task>) => {
    if (activeTask) {
      updateTask(activeTask.id, updates)
      setActiveTask({ ...activeTask, ...updates })
    }
  }

  const handleDelete = () => {
    if (activeTask) {
      deleteTask(activeTask.id)
      setActiveTask(null)
    }
  }

  const renderTask = (task: Task) => (
    <div
      key={task.id}
      className={`task ${task.completed ? 'completed' : ''} ${draggedTaskId === task.id ? 'dragging' : ''} ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      onDragEnter={(e) => handleTaskDragEnter(e, task.id)}
      onDragOver={handleTaskDragOver}
      onDrop={(e) => handleTaskDrop(e, task)}
      onClick={() => setActiveTask(task)}
    >
      <span className="drag-handle">⋮⋮</span>
      <input
        type="checkbox"
        checked={task.completed}
        onClick={(e) => e.stopPropagation()}
        onChange={() => handleToggleComplete(task)}
      />
      <div className="task-color" style={{ background: task.color }}></div>
      <span>{task.title || 'Untitled'}</span>
    </div>
  )

  if (loading) {
    return (
      <>
        <header><WavyTitle>Eisenhower Matrix</WavyTitle></header>
        <div className="empty-state">Loading...</div>
      </>
    )
  }

  const unassignedTasks = getTasksByQuadrant(null)

  return (
    <>
      <header><WavyTitle>Eisenhower Matrix</WavyTitle></header>

      <div className="matrix-layout">
        <div className="unassigned-column">
          <div
            className={`card ${dragOverQuadrant === 'unassigned' ? 'drag-over' : ''}`}
            onDragOver={(e) => handleQuadrantDragOver(e, 'unassigned')}
            onDragLeave={() => setDragOverQuadrant(null)}
            onDrop={(e) => handleQuadrantDrop(e, 'unassigned')}
          >
            <div className="card-header gray">
              Unassigned
              <small>Drag tasks here</small>
            </div>
            <div className="tasks">
              {unassignedTasks.map(task => renderTask(task))}
            </div>
          </div>
        </div>

        <div className="matrix">
          {QUADRANTS.map(q => {
            const quadrantTasks = getTasksByQuadrant(q.id)
            return (
              <div
                key={q.id}
                className={`card ${dragOverQuadrant === q.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleQuadrantDragOver(e, q.id)}
                onDragLeave={() => setDragOverQuadrant(null)}
                onDrop={(e) => handleQuadrantDrop(e, q.id)}
              >
                <div className={`card-header ${q.color}`}>
                  {q.title}
                  <small>{q.subtitle}</small>
                </div>
                <div className="tasks">
                  {quadrantTasks.map(task => renderTask(task))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDrawer
        task={activeTask}
        onClose={() => setActiveTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        showQuadrant={false}
      />
    </>
  )
}
