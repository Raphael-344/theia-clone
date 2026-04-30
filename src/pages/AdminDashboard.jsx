import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Users, Upload, BarChart2, TrendingUp, Clock } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { getNoteColor, getNoteGrade } from '../lib/scoring'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const GRADE_BADGE = {
  A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-red-600',
}

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
  const [stats, setStats] = useState({ exams: 0, students: 0, sessions: 0, avg: null })
  const [recentSessions, setRecentSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // ── Compteurs ──────────────────────────────────────────
      const [
        { count: examCount,    error: e1 },
        { count: studentCount, error: e2 },
        { count: sessionCount, error: e3 },
      ] = await Promise.all([
        supabase.from('exams').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('exam_sessions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      ])

      console.log('ADMIN DASH counts:', { examCount, studentCount, sessionCount })
      if (e1) console.error('exams count error:', e1.message)
      if (e2) console.error('profiles count error:', e2.message)
      if (e3) console.error('sessions count error:', e3.message)

      // Moyenne générale
      const { data: noteData } = await supabase
        .from('exam_sessions')
        .select('final_note')
        .eq('status', 'submitted')

      const avg = noteData?.length
        ? parseFloat((noteData.reduce((a, s) => a + (s.final_note ?? 0), 0) / noteData.length).toFixed(1))
        : null

      setStats({
        exams:    examCount    ?? 0,
        students: studentCount ?? 0,
        sessions: sessionCount ?? 0,
        avg,
      })

      // ── Passages récents — sans join ────────────────────────
      const { data: rawSessions, error: sessErr } = await supabase
        .from('exam_sessions')
        .select('id, student_id, exam_id, submitted_at, final_note, status')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(8)

      console.log('ADMIN DASH sessions:', rawSessions?.length, '| error:', sessErr?.message)

      if (rawSessions?.length > 0) {
        const studentIds = [...new Set(rawSessions.map((s) => s.student_id))]
        const examIds    = [...new Set(rawSessions.map((s) => s.exam_id))]

        const [{ data: profiles, error: pErr }, { data: exams, error: xErr }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email').in('id', studentIds),
          supabase.from('exams').select('id, title').in('id', examIds),
        ])

        console.log('ADMIN DASH profiles:', profiles?.length, '| error:', pErr?.message)
        console.log('ADMIN DASH exams:', exams?.length, '| error:', xErr?.message)

        const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
        const examMap    = Object.fromEntries((exams    ?? []).map((e) => [e.id, e]))

        setRecentSessions(rawSessions.map((s) => ({
          ...s,
          profiles: profileMap[s.student_id] ?? null,
          exams:    examMap[s.exam_id]        ?? null,
        })))
      }

      setLoading(false)
    }
    load()
  }, [])

  const avgGrade = stats.avg !== null ? getNoteGrade(stats.avg) : null

  return (
    <Layout title="Tableau de bord">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText}   label="Examens créés"    value={stats.exams}    color="bg-theia-teal"   to="/admin/exams" />
        <StatCard icon={Users}      label="Étudiants"        value={stats.students} color="bg-theia-pink"   to="/admin/students" />
        <StatCard icon={BarChart2}  label="Passages"         value={stats.sessions} color="bg-purple-500"   to="/admin/results" />
        <StatCard
          icon={TrendingUp}
          label="Moyenne générale"
          value={stats.avg !== null
            ? <span className={GRADE_BADGE[avgGrade]}>{stats.avg}% <span className="text-base">({avgGrade})</span></span>
            : '—'}
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
            <Link to="/admin/results" className="text-xs text-theia-teal hover:underline">Voir tout</Link>
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
                    <th className="pb-2 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theia-border">
                  {recentSessions.map((s) => {
                    const grade = s.final_note !== null ? getNoteGrade(s.final_note) : null
                    const color = s.final_note !== null ? getNoteColor(s.final_note) : 'text-gray-400'
                    return (
                      <tr key={s.id} className="hover:bg-theia-gray/50">
                        <td className="py-2.5 font-medium text-gray-800">
                          {s.profiles?.full_name ?? s.profiles?.email ?? '—'}
                        </td>
                        <td className="py-2.5 text-gray-600">{s.exams?.title ?? '—'}</td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {s.submitted_at
                            ? format(new Date(s.submitted_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                            : s.status === 'in_progress'
                              ? <span className="text-yellow-600 font-medium">En cours</span>
                              : '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          {s.final_note !== null ? (
                            <span className={`font-bold ${color}`}>
                              {s.final_note}%
                              {grade && <span className="ml-1 text-xs">({grade})</span>}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            {[
              { to: '/admin/import',   icon: Upload,   color: 'bg-theia-teal/10 group-hover:bg-theia-teal/20',   iconCls: 'text-theia-teal',   label: 'Importer un examen',  sub: 'Format JSON THEIA' },
              { to: '/admin/students', icon: Users,    color: 'bg-theia-pink/10 group-hover:bg-theia-pink/20',   iconCls: 'text-theia-pink',   label: 'Gérer les étudiants', sub: 'Comptes & accès' },
              { to: '/admin/results',  icon: BarChart2,color: 'bg-purple-100 group-hover:bg-purple-200',          iconCls: 'text-purple-600',   label: 'Voir les résultats',  sub: 'Notes & discordances' },
            ].map(({ to, icon: Icon, color, iconCls, label, sub }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-3 rounded-lg border border-theia-border hover:bg-theia-gray hover:border-theia-teal transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={18} className={iconCls} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
