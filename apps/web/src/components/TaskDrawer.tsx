import { useState, useEffect, useRef } from 'react'
import type { Task } from '@eisenhower/shared'

const COLORS = ["#ef4444", "#22c55e", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#facc15", "#64748b", "#0f172a"]

interface TaskDrawerProps {
  task: Task | null
  onClose: () => void
  onUpdate: (updates: Partial<Task>) => void
  onDelete: () => void
  showQuadrant?: boolean
}

export default function TaskDrawer({ task, onClose, onUpdate, onDelete, showQuadrant = false }: TaskDrawerProps) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [quadrant, setQuadrant] = useState<string>('')
  const [color, setColor] = useState(COLORS[0])
  const titleRef = useRef<HTMLInputElement>(null)
  const prevTaskIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (task) {
      // Only update form fields and focus when opening a different task
      if (prevTaskIdRef.current !== task.id) {
        setTitle(task.title)
        setNote(task.note)
        setTags(task.tags.join(', '))
        setQuadrant(task.q || '')
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
      if (task && drawer && !drawer.contains(target) && !target.closest('.todo-item') && !target.closest('.task') && !target.closest('.add-todo-btn')) {
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
        <button className="delete-btn" onClick={onDelete}>Delete Task</button>
      </div>
    </div>
  )
}
