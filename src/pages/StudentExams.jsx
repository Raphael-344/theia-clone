import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, HelpCircle, RotateCcw, CheckCircle, FileText } from 'lucide-react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getNoteColor, getNoteGrade } from '../lib/scoring'

const GRADE_BADGE = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-red-100 text-red-700 border-red-200',
}

export default function StudentExams() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: allExams }, { data: mySessions }] = await Promise.all([
        supabase.from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase
          .from('exam_sessions')
          .select('*')
          .eq('student_id', user.id)
          .order('submitted_at', { ascending: false }),
      ])
      setExams(allExams ?? [])
      setSessions(mySessions ?? [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const getExamInfo = (examId) => {
    const submitted  = sessions.filter((s) => s.exam_id === examId && s.status === 'submitted')
    const inProgress = sessions.find((s) => s.exam_id === examId && s.status === 'in_progress')
    return { submitted, inProgress, lastSubmitted: submitted[0] }
  }

  return (
    <Layout title="Mes examens">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-20">
          <HelpCircle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun examen disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const { submitted, inProgress, lastSubmitted } = getExamInfo(exam.id)
            const attemptCount = submitted.length
            const hasDone = attemptCount > 0
            const grade = hasDone ? getNoteGrade(lastSubmitted.final_note ?? 0) : null
            const color = hasDone ? getNoteColor(lastSubmitted.final_note ?? 0) : null

            return (
              <div key={exam.id} className="card hover:shadow-card-hover transition-shadow flex flex-col">
                {/* Titre + badge mention */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-800">{exam.title}</h3>
                  {hasDone && grade && (
                    <span className={`shrink-0 text-sm font-black px-2.5 py-0.5 rounded-full border ${GRADE_BADGE[grade]}`}>
                      {grade}
                    </span>
                  )}
                </div>

                {exam.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{exam.description}</p>
                )}

                {/* Méta */}
                <div className="flex gap-3 text-xs text-gray-400 mt-auto mb-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <HelpCircle size={12} />
                    {Array.isArray(exam.questions) ? exam.questions.length : 0} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {exam.duration} min
                  </span>
                  {attemptCount > 0 && (
                    <span className="flex items-center gap-1 text-theia-teal font-medium">
                      <CheckCircle size={12} />
                      {attemptCount} tentative{attemptCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {hasDone && lastSubmitted && (
                  <p className={`text-xs font-semibold mb-3 ${color}`}>
                    Dernier score : {lastSubmitted.final_note}%
                  </p>
                )}

                {/* Boutons d'action */}
                <div className="flex flex-col gap-2">
                  {inProgress && (
                    <Link
                      to={`/exam/${exam.id}`}
                      className="btn-primary flex items-center justify-center gap-2 text-sm"
                      style={{ backgroundColor: '#e8701a' }}
                    >
                      <Play size={14} /> Reprendre l'examen en cours
                    </Link>
                  )}
                  {hasDone && (
                    <Link
                      to={`/results/${lastSubmitted.id}`}
                      className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-all hover:bg-theia-teal/5"
                      style={{ borderColor: '#1e5c5c', color: '#1e5c5c' }}
                    >
                      <FileText size={14} />
                      Voir le corrigé
                    </Link>
                  )}
                  {!inProgress && (
                    <Link
                      to={`/exam/${exam.id}`}
                      className="btn-primary flex items-center justify-center gap-2 text-sm"
                      style={{ backgroundColor: hasDone ? '#2d7a8a' : '#0a4a5a' }}
                    >
                      {hasDone ? <RotateCcw size={14} /> : <Play size={14} />}
                      {hasDone ? "Repasser l'examen" : "Commencer l'examen"}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
