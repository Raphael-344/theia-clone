import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, ArrowRight, Play } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getNoteColor, getNoteGrade, getNoteLabel } from '../lib/scoring'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const GRADE_BADGE = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-red-100 text-red-700',
}

export default function StudentResults() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('exam_sessions')
        .select('*, exams:exam_id(id, title, duration)')
        .eq('student_id', user.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
      setSessions(data ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  // Attribuer un numéro de tentative par examen (chronologique)
  const withAttempts = (() => {
    const counterByExam = {}
    const asc = [...sessions].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
    const attemptMap = {}
    for (const s of asc) {
      counterByExam[s.exam_id] = (counterByExam[s.exam_id] ?? 0) + 1
      attemptMap[s.id] = counterByExam[s.exam_id]
    }
    return sessions.map((s) => ({ ...s, _attempt: attemptMap[s.id] }))
  })()

  // Meilleure note par examen (pour le compteur "réussis")
  const bestByExam = {}
  for (const s of sessions) {
    if (bestByExam[s.exam_id] === undefined || s.final_note > bestByExam[s.exam_id]) {
      bestByExam[s.exam_id] = s.final_note
    }
  }
  const passCount = Object.values(bestByExam).filter((pct) => pct >= 50).length

  const avg = sessions.length
    ? parseFloat((sessions.reduce((acc, s) => acc + (s.final_note ?? 0), 0) / sessions.length).toFixed(1))
    : null

  return (
    <Layout title="Mes résultats">
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-3xl font-black text-theia-teal">{sessions.length}</p>
            <p className="text-sm text-gray-500 mt-1">Tentative{sessions.length > 1 ? 's' : ''}</p>
          </div>
          <div className="card text-center">
            <p className={`text-3xl font-black ${avg !== null ? getNoteColor(avg) : 'text-gray-400'}`}>
              {avg !== null ? `${avg}%` : '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Moyenne générale</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-black text-theia-green">{passCount}</p>
            <p className="text-sm text-gray-500 mt-1">Réussi{passCount > 1 ? 's' : ''} (≥ B)</p>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <BarChart2 size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Vous n'avez encore passé aucun examen</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-theia-border">
                  <th className="pb-3 font-semibold">Examen</th>
                  <th className="pb-3 font-semibold text-center">Tentative</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-center">Score</th>
                  <th className="pb-3 font-semibold text-center">Mention</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-theia-border">
                {withAttempts.map((s) => {
                  const grade = getNoteGrade(s.final_note ?? 0)
                  const color = getNoteColor(s.final_note ?? 0)
                  return (
                    <tr key={s.id} className="hover:bg-theia-gray/50 transition-colors">
                      <td className="py-3 font-medium text-gray-800">{s.exams?.title ?? '—'}</td>
                      <td className="py-3 text-center">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          #{s._attempt}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {s.submitted_at
                          ? format(new Date(s.submitted_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                          : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-black text-base ${color}`}>{s.final_note ?? 0}%</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${GRADE_BADGE[grade]}`}>
                          {grade}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <Link
                            to={`/results/${s.id}`}
                            className="inline-flex items-center gap-1 text-xs text-theia-teal hover:underline font-medium"
                          >
                            Corrigé <ArrowRight size={12} />
                          </Link>
                          <Link
                            to={`/exam/${s.exam_id}`}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-theia-orange font-medium"
                          >
                            <Play size={12} /> Repasser
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
