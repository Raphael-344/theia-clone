import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Users, Upload, BarChart2, TrendingUp, Clock } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className="card flex items-center gap-4 hover:shadow-card-hover transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ exams: 0, students: 0, sessions: 0 })
  const [recentSessions, setRecentSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ count: examCount }, { count: studentCount }, { count: sessionCount }] =
        await Promise.all([
          supabase.from('exams').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('exam_sessions').select('id', { count: 'exact', head: true }),
        ])

      setStats({
        exams: examCount ?? 0,
        students: studentCount ?? 0,
        sessions: sessionCount ?? 0,
      })

      const { data: sessions } = await supabase
        .from('exam_sessions')
        .select(`
          id, submitted_at, final_note, status,
          profiles:student_id (full_name, email),
          exams:exam_id (title)
        `)
        .order('submitted_at', { ascending: false })
        .limit(8)

      setRecentSessions(sessions ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <Layout title="Tableau de bord">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FileText}
          label="Examens créés"
          value={stats.exams}
          color="bg-theia-teal"
          to="/admin/exams"
        />
        <StatCard
          icon={Users}
          label="Étudiants"
          value={stats.students}
          color="bg-theia-pink"
          to="/admin/students"
        />
        <StatCard
          icon={BarChart2}
          label="Passages"
          value={stats.sessions}
          color="bg-purple-500"
          to="/admin/results"
        />
        <StatCard
          icon={TrendingUp}
          label="Moyenne générale"
          value="—"
          color="bg-theia-green"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Passages récents */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={16} className="text-theia-teal" />
              Passages récents
            </h2>
            <Link to="/admin/results" className="text-xs text-theia-teal hover:underline">
              Voir tout
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun passage pour l'instant</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-theia-border">
                    <th className="pb-2 font-medium">Étudiant</th>
                    <th className="pb-2 font-medium">Examen</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theia-border">
                  {recentSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-theia-gray/50">
                      <td className="py-2.5 font-medium text-gray-800">
                        {s.profiles?.full_name ?? s.profiles?.email ?? '—'}
                      </td>
                      <td className="py-2.5 text-gray-600">{s.exams?.title ?? '—'}</td>
                      <td className="py-2.5 text-gray-400 text-xs">
                        {s.submitted_at
                          ? format(new Date(s.submitted_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                          : s.status === 'in_progress' ? (
                            <span className="text-yellow-600 font-medium">En cours</span>
                          ) : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {s.final_note !== null ? (
                          <span className={`font-bold ${s.final_note >= 10 ? 'text-theia-green' : 'text-theia-red'}`}>
                            {s.final_note}/20
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link
              to="/admin/import"
              className="flex items-center gap-3 p-3 rounded-lg border border-theia-border
                         hover:bg-theia-gray hover:border-theia-teal transition-all group"
            >
              <div className="w-9 h-9 bg-theia-teal/10 rounded-lg flex items-center justify-center group-hover:bg-theia-teal/20">
                <Upload size={18} className="text-theia-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Importer un examen</p>
                <p className="text-xs text-gray-400">Format JSON THEIA</p>
              </div>
            </Link>

            <Link
              to="/admin/students"
              className="flex items-center gap-3 p-3 rounded-lg border border-theia-border
                         hover:bg-theia-gray hover:border-theia-teal transition-all group"
            >
              <div className="w-9 h-9 bg-theia-pink/10 rounded-lg flex items-center justify-center group-hover:bg-theia-pink/20">
                <Users size={18} className="text-theia-pink" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Gérer les étudiants</p>
                <p className="text-xs text-gray-400">Comptes & accès</p>
              </div>
            </Link>

            <Link
              to="/admin/results"
              className="flex items-center gap-3 p-3 rounded-lg border border-theia-border
                         hover:bg-theia-gray hover:border-theia-teal transition-all group"
            >
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                <BarChart2 size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Voir les résultats</p>
                <p className="text-xs text-gray-400">Notes & discordances</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
