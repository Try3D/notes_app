import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { uuidAtom, fetchDataAtom, setupVisibilityListenerAtom } from './store'
import Layout from './components/Layout'
import Login from './pages/Login'
import Todos from './pages/Todos'
import Matrix from './pages/Matrix'
import Kanban from './pages/Kanban'
import Links from './pages/Links'
import Settings from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const uuid = useAtomValue(uuidAtom)
  if (!uuid) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const uuid = useAtomValue(uuidAtom)
  const fetchData = useSetAtom(fetchDataAtom)
  const setupVisibilityListener = useSetAtom(setupVisibilityListenerAtom)

  useEffect(() => {
    fetchData()
  }, [uuid, fetchData])

  useEffect(() => {
    if (uuid) {
      setupVisibilityListener()
    }
  }, [uuid, setupVisibilityListener])

  return (
    <Routes>
      <Route path="/login" element={uuid ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Todos />} />
        <Route path="matrix" element={<Matrix />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="links" element={<Links />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
