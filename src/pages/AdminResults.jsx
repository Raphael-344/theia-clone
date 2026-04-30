import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { getNoteColor, getNoteGrade } from '../lib/scoring'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowRight, Filter, ShieldAlert } from 'lucide-react'

const GRADE_BADGE = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-red-100 text-red-700',
}

export default function AdminResults() {
  const [sessions, setSessions] = useState([])
  const [exams, setExams] = useState([])
  const [violationCounts, setViolationCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedExam = searchParams.get('exam') ?? ''

  useEffect(() => {
    const load = async () => {
      const [{ data: allSessions }, { data: allExams }] = await Promise.all([
        supabase
          .from('exam_sessions')
          .select(`
            id, exam_id, student_id, status, final_note, total_points, max_points, submitted_at,
            profiles:student_id(full_name, email),
            exams:exam_id(id, title)
          `)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false }),
        supabase.from('exams').select('id, title').order('title'),
      ])

      const sessionList = allSessions ?? []
      setSessions(sessionList)
      setExams(allExams ?? [])

      // Compter les violations par session
      if (sessionList.length > 0) {
        const ids = sessionList.map((s) => s.id)
        const { data: logs } = await supabase
          .from('anti_cheat_logs')
          .select('session_id')
          .in('session_id', ids)
        const counts = {}
        for (const log of (logs ?? [])) {
          counts[log.session_id] = (counts[log.session_id] ?? 0) + 1
        }
        setViolationCounts(counts)
      }

      setLoading(false)
    }
    load()
  }, [])

  const filtered = selectedExam
    ? sessions.filter((s) => s.exams?.id === selectedExam)
    : sessions

  // Numéro de tentative par (exam_id, student_id)
  const withAttempts = (() => {
    const counterMap = {}
    const asc = [...filtered].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
    const attemptMap = {}
    for (const s of asc) {
      const key = `${s.exams?.id}:${s.student_id}`
      counterMap[key] = (counterMap[key] ?? 0) + 1
      attemptMap[s.id] = counterMap[key]
    }
    return filtered.map((s) => ({ ...s, _attempt: attemptMap[s.id] }))
  })()

  const avg = filtered.length
    ? (filtered.reduce((acc, s) => acc + (s.final_note ?? 0), 0) / filtered.length).toFixed(1)
    : null

  return (
    <Layout title="Résultats des étudiants">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={14} />
          Filtrer par examen :
        </div>
        <select
          value={selectedExam}
          onChange={(e) => setSearchParams(e.target.value ? { exam: e.target.value } : {})}
          className="input-field w-auto"
        >
          <option value="">Tous les examens</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        {avg && (
          <span className="ml-auto text-sm font-medium text-gray-600">
            Moyenne :{' '}
            <span className={`font-black text-base ${getNoteColor(parseFloat(avg))}`}>
              {avg}%
            </span>
            {' — '}
            <span className={`font-black ${GRADE_BADGE[getNoteGrade(parseFloat(avg))]?.split(' ')[1] ?? ''}`}>
              {getNoteGrade(parseFloat(avg))}
            </span>
          </span>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : withAttempts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">Aucun résultat</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-theia-border">
                  <th className="pb-3 font-semibold">Étudiant</th>
                  <th className="pb-3 font-semibold">Examen</th>
                  <th className="pb-3 font-semibold text-center">Tentative</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-center">Score</th>
                  <th className="pb-3 font-semibold text-center">Mention</th>
                  <th className="pb-3 font-semibold text-center">Violations</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-theia-border">
                {withAttempts.map((s) => {
                  const grade = getNoteGrade(s.final_note ?? 0)
                  const color = getNoteColor(s.final_note ?? 0)
                  const vCount = violationCounts[s.id] ?? 0
                  return (
                    <tr key={s.id} className="hover:bg-theia-gray/50 transition-colors">
                      <td className="py-3">
                        <p className="font-medium text-gray-800">
                          {s.profiles?.full_name ?? s.profiles?.email ?? '—'}
                        </p>
                        {s.profiles?.full_name && (
                          <p className="text-xs text-gray-400">{s.profiles.email}</p>
                        )}
                      </td>
                      <td className="py-3 text-gray-600 text-sm">{s.exams?.title ?? '—'}</td>
                      <td className="py-3 text-center">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          #{s._attempt}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {s.submitted_at
                          ? format(new Date(s.submitted_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                          : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-black text-base ${color}`}>
                          {s.final_note ?? 0}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${GRADE_BADGE[grade]}`}>
                          {grade}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {vCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            <ShieldAlert size={11} />
                            {vCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/results/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs text-theia-teal hover:underline font-medium"
                        >
                          Corrigé <ArrowRight size={12} />
                        </Link>
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
