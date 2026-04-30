import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, BarChart2, BookOpen, RotateCcw } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getNoteColor, getNoteGrade } from '../lib/scoring'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const GRADE_BADGE = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-red-100 text-red-700',
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [availableExams, setAvailableExams] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: exams }, { data: mySessions }] = await Promise.all([
        supabase.from('exams').select('id, title, description, duration, questions').eq('is_active', true),
        supabase
          .from('exam_sessions')
          .select('id, exam_id, status, final_note, submitted_at, exams:exam_id(title)')
          .eq('student_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(10),
      ])
      setAvailableExams(exams ?? [])
      setSessions(mySessions ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const inProgressSession = sessions.find((s) => s.status === 'in_progress')

  // Dernière session soumise par examen
  const lastSubmittedByExam = {}
  for (const s of sessions) {
    if (s.status === 'submitted' && !lastSubmittedByExam[s.exam_id]) {
      lastSubmittedByExam[s.exam_id] = s
    }
  }

  const recentSubmitted = sessions.filter((s) => s.status === 'submitted').slice(0, 5)

  return (
    <Layout title="Accueil">
      {/* Bannière examen en cours */}
      {inProgressSession && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-yellow-600 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800">Examen en cours</p>
              <p className="text-sm text-yellow-700">
                {inProgressSession.exams?.title} — reprenez là où vous en étiez.
              </p>
            </div>
          </div>
          <Link
            to={`/exam/${inProgressSession.exam_id}`}
            className="btn-orange flex items-center gap-2 shrink-0"
          >
            <Play size={15} /> Reprendre
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Examens disponibles */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-theia-teal" />
            Examens disponibles
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : availableExams.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun examen disponible pour l'instant</p>
          ) : (
            <div className="space-y-3">
              {availableExams.map((exam) => {
                const last = lastSubmittedByExam[exam.id]
                const isInProgress = inProgressSession?.exam_id === exam.id
                const grade = last ? getNoteGrade(last.final_note ?? 0) : null

                return (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-theia-border hover:bg-theia-gray transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                      <p className="text-xs text-gray-400">
                        {Array.isArray(exam.questions) ? exam.questions.length : 0} questions · {exam.duration} min
                        {last && (
                          <span className={`ml-2 font-semibold ${getNoteColor(last.final_note ?? 0)}`}>
                            {last.final_note}%
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {grade && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_BADGE[grade]}`}>
                          {grade}
                        </span>
                      )}
                      <Link
                        to={`/exam/${exam.id}`}
                        className="btn-primary flex items-center gap-1.5 py-1.5 text-xs"
                        style={{ backgroundColor: isInProgress ? '#e8701a' : last ? '#2d7a8a' : undefined }}
                      >
                        {isInProgress ? <Play size={13} /> : last ? <RotateCcw size={13} /> : <Play size={13} />}
                        {isInProgress ? 'Reprendre' : last ? 'Repasser' : 'Commencer'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Résultats récents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart2 size={18} className="text-theia-pink" />
              Mes résultats récents
            </h2>
            <Link to="/student/results" className="text-xs text-theia-teal hover:underline">
              Tout voir
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentSubmitted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Vous n'avez encore passé aucun examen</p>
          ) : (
            <div className="space-y-2">
              {recentSubmitted.map((s) => {
                const grade = getNoteGrade(s.final_note ?? 0)
                const color = getNoteColor(s.final_note ?? 0)
                return (
                  <Link
                    key={s.id}
                    to={`/results/${s.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-theia-gray transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 group-hover:text-theia-teal transition-colors">
                        {s.exams?.title ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.submitted_at ? format(new Date(s.submitted_at), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black ${color}`}>{s.final_note ?? 0}%</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_BADGE[grade]}`}>
                        {grade}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
