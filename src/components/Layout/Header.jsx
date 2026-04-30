import React from 'react'
import { Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Header({ title = 'Tableau de bord' }) {
  const { profile, isAdmin } = useAuth()

  return (
    <header className="bg-white border-b border-theia-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Badge rôle */}
        <span className={isAdmin ? 'badge-admin' : 'badge-student'}>
          {isAdmin ? 'Administrateur' : 'Étudiant'}
        </span>

        {/* Cloche notification */}
        <button className="relative p-2 rounded-lg hover:bg-theia-gray transition-colors">
          <Bell size={18} className="text-gray-500" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-theia-teal flex items-center justify-center text-white text-sm font-semibold">
            {(profile?.full_name ?? profile?.email ?? 'U')[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {profile?.full_name ?? profile?.email ?? 'Utilisateur'}
          </span>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </div>
      </div>
    </header>
  )
}
