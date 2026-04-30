import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  Upload,
  LogOut,
  GraduationCap,
  ClipboardList,
  BarChart2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
      ${isActive
        ? 'bg-white/15 text-white'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`
    }
  >
    <Icon size={18} className="shrink-0" />
    <span>{label}</span>
  </NavLink>
)

export default function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Déconnexion réussie')
    navigate('/login')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40"
      style={{ width: 'var(--sidebar-width)', backgroundColor: '#0a4a5a' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
          <span className="text-theia-sidebar font-bold text-lg">T</span>
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">THEIA</p>
          <p className="text-white/50 text-xs">Plateforme d'examens</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {isAdmin ? (
          <>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
              Administration
            </p>
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Tableau de bord" end />
            <NavItem to="/admin/exams" icon={FileText} label="Examens" />
            <NavItem to="/admin/import" icon={Upload} label="Importer un examen" />
            <NavItem to="/admin/students" icon={Users} label="Étudiants" />
            <NavItem to="/admin/results" icon={BarChart2} label="Résultats" />
          </>
        ) : (
          <>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
              Espace étudiant
            </p>
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Accueil" end />
            <NavItem to="/student/exams" icon={ClipboardList} label="Mes examens" />
            <NavItem to="/student/results" icon={BarChart2} label="Mes résultats" />
          </>
        )}
      </nav>

      {/* Profil + déconnexion */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-theia-teal-light flex items-center justify-center shrink-0">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {profile?.full_name ?? profile?.email ?? 'Utilisateur'}
            </p>
            <p className="text-white/50 text-xs capitalize">{profile?.role ?? '—'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/70
                     hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
