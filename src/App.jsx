import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Pages
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import AdminExams from './pages/AdminExams'
import AdminImport from './pages/AdminImport'
import AdminStudents from './pages/AdminStudents'
import AdminResults from './pages/AdminResults'
import AdminExamDetail from './pages/AdminExamDetail'
import StudentExams from './pages/StudentExams'
import StudentResults from './pages/StudentResults'
import ExamPage from './pages/ExamPage'
import ResultsPage from './pages/ResultsPage'

function Spinner() {
  return (
    <div className="fixed inset-0 bg-theia-gray flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-theia-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Guards sans loading — loading est géré au niveau AppRoutes uniquement
function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/dashboard" replace />
}

function RequireStudent({ children }) {
  const { isStudent } = useAuth()
  return isStudent ? children : <Navigate to="/dashboard" replace />
}

// Redirige vers /admin ou /dashboard selon le rôle
function DashboardRedirect() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Navigate to="/admin" replace /> : <StudentDashboard />
}

function AppRoutes() {
  const { loading, user, isAdmin } = useAuth()

  // Spinner affiché une seule fois au démarrage, jamais après
  if (loading) return <Spinner />

  return (
    <Routes>
      {/* Public : redirige si déjà connecté */}
      <Route
        path="/login"
        element={user ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace /> : <Login />}
      />

      {/* Racine : redirige selon l'état auth */}
      <Route
        path="/"
        element={
          !user
            ? <Navigate to="/login" replace />
            : isAdmin
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
        }
      />

      {/* Admin */}
      <Route path="/admin"           element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />
      <Route path="/admin/exams"      element={<RequireAuth><RequireAdmin><AdminExams /></RequireAdmin></RequireAuth>} />
      <Route path="/admin/exams/:id"  element={<RequireAuth><RequireAdmin><AdminExamDetail /></RequireAdmin></RequireAuth>} />
      <Route path="/admin/import"    element={<RequireAuth><RequireAdmin><AdminImport /></RequireAdmin></RequireAuth>} />
      <Route path="/admin/students"  element={<RequireAuth><RequireAdmin><AdminStudents /></RequireAdmin></RequireAuth>} />
      <Route path="/admin/results"   element={<RequireAuth><RequireAdmin><AdminResults /></RequireAdmin></RequireAuth>} />

      {/* Student */}
      <Route path="/dashboard"       element={<RequireAuth><DashboardRedirect /></RequireAuth>} />
      <Route path="/student/exams"   element={<RequireAuth><RequireStudent><StudentExams /></RequireStudent></RequireAuth>} />
      <Route path="/student/results" element={<RequireAuth><RequireStudent><StudentResults /></RequireStudent></RequireAuth>} />

      {/* Examen (tous rôles) */}
      <Route path="/exam/:id"           element={<RequireAuth><ExamPage /></RequireAuth>} />
      <Route path="/results/:sessionId" element={<RequireAuth><ResultsPage /></RequireAuth>} />

      {/* Fallback → racine qui redirige selon l'état */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
