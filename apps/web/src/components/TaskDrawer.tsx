import { useState, useEffect, useRef } from 'react'
import type { Task } from '@eisenhower/shared'

const COLORS = ["#ef4444", "#22c55e", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#facc15", "#64748b", "#0f172a"]

interface TaskDrawerProps {
  task: Task | null
  onClose: () => void
  onUpdate: (updates: Partial<Task>) => void
  onDelete: () => void
  showQuadrant?: boolean
  showKanban?: boolean
}

export default function TaskDrawer({ task, onClose, onUpdate, onDelete, showQuadrant = false, showKanban = false }: TaskDrawerProps) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [quadrant, setQuadrant] = useState<string>('')
  const [kanban, setKanban] = useState<string>('')
  const [color, setColor] = useState(COLORS[0])
  const titleRef = useRef<HTMLInputElement>(null)
  const prevTaskIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (task) {
      if (prevTaskIdRef.current !== task.id) {
        setTitle(task.title)
        setNote(task.note)
        setTags(task.tags.join(', '))
        setQuadrant(task.q || '')
        setKanban(task.kanban || '')
        setColor(task.color)
        setTimeout(() => titleRef.current?.focus(), 50)
        prevTaskIdRef.current = task.id
      }
    } else {
      prevTaskIdRef.current = null
    }
  }, [task])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && task) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [task, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const drawer = document.getElementById('drawer')
      const target = e.target as HTMLElement
      if (task && drawer && !drawer.contains(target) && !target.closest('.todo-item') && !target.closest('.task') && !target.closest('.kanban-task') && !target.closest('.add-todo-btn') && !target.closest('.kanban-add-btn')) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [task, onClose])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    onUpdate({ title: value })
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
    onUpdate({ note: value })
  }

  const handleTagsChange = (value: string) => {
    setTags(value)
    onUpdate({ tags: value.split(',').map(t => t.trim()).filter(Boolean) })
  }

  const handleQuadrantChange = (value: string) => {
    setQuadrant(value)
    onUpdate({ q: value ? value as Task['q'] : null })
  }

  const handleKanbanChange = (value: string) => {
    setKanban(value)
    onUpdate({ kanban: value ? value as Task['kanban'] : null })
  }

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    onUpdate({ color: newColor })
  }

  return (
    <div id="drawer" className={`drawer ${task ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>Task Details</h3>
        <button onClick={onClose}>&#10005;</button>
      </div>

      <input
        ref={titleRef}
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Title"
      />
      <textarea
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
        placeholder="Note"
      />
      <input
        value={tags}
        onChange={(e) => handleTagsChange(e.target.value)}
        placeholder="Tags (comma separated)"
      />

      {showQuadrant && (
        <>
          <label className="quadrant-label">Eisenhower Quadrant</label>
          <select value={quadrant} onChange={(e) => handleQuadrantChange(e.target.value)}>
            <option value="">Not assigned</option>
            <option value="do">Do First (Important & Urgent)</option>
            <option value="decide">Schedule (Important & Not Urgent)</option>
            <option value="delegate">Delegate (Not Important & Urgent)</option>
            <option value="delete">Eliminate (Not Important & Not Urgent)</option>
          </select>
        </>
      )}

      {showKanban && (
        <>
          <label className="quadrant-label">Kanban Status</label>
          <select value={kanban} onChange={(e) => handleKanbanChange(e.target.value)}>
            <option value="">Not assigned</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </>
      )}

      <label className="color-label">Color</label>
      <div className="color-picker">
        {COLORS.map(c => (
          <div
            key={c}
            className="color-dot"
            style={{ 
              background: c,
              outline: c === color ? '2px solid var(--text)' : 'none'
            }}
            onClick={() => handleColorChange(c)}
          />
        ))}
      </div>

      <div className="drawer-footer">
        <button className="done-btn" onClick={onClose}>Done</button>
        <button className="delete-btn" onClick={onDelete}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
