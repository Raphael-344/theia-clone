import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAntiCheat } from '../hooks/useAntiCheat'
import { scoreExam } from '../lib/scoring'
import toast from 'react-hot-toast'

function Timer({ duration, onExpire }) {
  const [remaining, setRemaining] = useState(duration * 60)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(interval); onExpire(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpire])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const isUrgent = remaining <= 300

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold
                     ${isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-theia-teal/10 text-theia-teal'}`}>
      <Clock size={16} />
      {h > 0 && `${String(h).padStart(2, '0')}:`}
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  )
}

export default function ExamPage() {
  const { id: examId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [exam, setExam] = useState(null)
  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState({})
  const [savedAnswers, setSavedAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Violations enregistrées mais jamais de soumission forcée
  const { requestFullscreen, exitFullscreen } = useAntiCheat({
    sessionId: session?.id,
    enabled: !!session,
  })

  useEffect(() => {
    const init = async () => {
      const { data: examData, error: examErr } = await supabase
        .from('exams').select('*').eq('id', examId).single()
      if (examErr || !examData) {
        toast.error('Examen introuvable')
        navigate('/student/exams')
        return
      }
      setExam(examData)

      const { data: existing } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .single()

      if (existing) {
        setSession(existing)
        setAnswers(existing.answers ?? {})
        setSavedAnswers(existing.answers ?? {})
      } else {
        const { data: newSession, error: sessionErr } = await supabase
          .from('exam_sessions')
          .insert({ exam_id: examId, student_id: user.id, status: 'in_progress', answers: {} })
          .select().single()
        if (sessionErr) {
          toast.error('Impossible de démarrer la session')
          navigate('/student/exams')
          return
        }
        setSession(newSession)
      }

      setLoading(false)
      await requestFullscreen()
    }
    init()
  }, [examId, user.id]) // eslint-disable-line

  const scrollToQuestion = (i) => {
    document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSingleChange = (questionId, choiceId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }))
  }

  const handleMultipleChange = (questionId, choiceId, checked) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : []
      const next = checked ? [...current, choiceId] : current.filter((id) => id !== choiceId)
      return { ...prev, [questionId]: next }
    })
  }

  const handleTextChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const saveAllAnswers = useCallback(async (currentAnswers) => {
    if (!session) return
    const toSave = currentAnswers ?? answers
    setSaving(true)
    const { error } = await supabase
      .from('exam_sessions').update({ answers: toSave }).eq('id', session.id)
    if (!error) {
      setSavedAnswers({ ...toSave })
      toast.success('Réponses enregistrées', { duration: 1500 })
    }
    setSaving(false)
  }, [session, answers])

  const handleSubmit = useCallback(async (forced = false) => {
    if (!forced && !confirm('Êtes-vous sûr de vouloir remettre votre examen ?')) return
    setSubmitting(true)

    const { totalPoints, maxPoints, finalNote, discordances } = scoreExam(exam.questions, answers)

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        answers,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        final_note: finalNote,
        total_points: totalPoints,
        max_points: maxPoints,
        discordances,
      })
      .eq('id', session.id)

    await exitFullscreen()

    if (!error) {
      toast.success('Examen soumis !')
      navigate(`/results/${session.id}`)
    } else {
      toast.error('Erreur lors de la soumission')
      setSubmitting(false)
    }
  }, [exam, answers, session, navigate, exitFullscreen])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-theia-gray flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-theia-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de l'examen…</p>
        </div>
      </div>
    )
  }

  if (!exam) return null

  const questions = exam.questions ?? []
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).filter((k) =>
    answers[k] !== undefined && answers[k] !== '' &&
    !(Array.isArray(answers[k]) && answers[k].length === 0)
  ).length

  return (
    <div className="exam-fullscreen">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-theia-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-theia-sidebar rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{exam.title}</p>
              <p className="text-xs text-gray-400">
                {answeredCount}/{totalQuestions} répondu{answeredCount > 1 ? 'es' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {exam.duration && (
              <Timer duration={exam.duration} onExpire={() => handleSubmit(true)} />
            )}
            <button
              onClick={() => saveAllAnswers()}
              disabled={saving}
              className="btn-outline flex items-center gap-2 text-sm"
            >
              <CheckCircle size={15} />
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            {submitting ? (
              <div className="btn-primary flex items-center gap-2 opacity-75 cursor-not-allowed">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Soumission…
              </div>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                className="btn-primary flex items-center gap-2"
                style={{ backgroundColor: '#0a4a5a' }}
              >
                <Send size={15} />
                Remettre
              </button>
            )}
          </div>
        </div>

        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-theia-teal transition-all duration-300"
            style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
        {/* Navigation latérale */}
        <div className="hidden lg:block w-52 shrink-0">
          <div className="card sticky top-24">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigation</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => {
                const hasAnswer = answers[q.id] !== undefined &&
                  answers[q.id] !== '' &&
                  !(Array.isArray(answers[q.id]) && answers[q.id].length === 0)
                const isSaved = JSON.stringify(savedAnswers[q.id]) === JSON.stringify(answers[q.id])
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all hover:scale-110
                      ${hasAnswer && isSaved
                        ? 'bg-theia-green text-white'
                        : hasAnswer
                          ? 'bg-theia-orange text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-theia-green" />Enregistrée</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-theia-orange" />Non sauvegardée</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-200" />Sans réponse</div>
            </div>
          </div>
        </div>

        {/* Toutes les questions */}
        <div className="flex-1 min-w-0 space-y-6">
          {questions.map((question, i) => {
            const hasAnswer = answers[question.id] !== undefined &&
              answers[question.id] !== '' &&
              !(Array.isArray(answers[question.id]) && answers[question.id].length === 0)
            const isSaved = JSON.stringify(savedAnswers[question.id]) === JSON.stringify(answers[question.id])

            return (
              <div key={question.id} id={`q-${i}`} className="card scroll-mt-24">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-semibold text-theia-teal bg-theia-teal/10 px-2.5 py-1 rounded-full">
                        Question {i + 1} / {totalQuestions}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        {question.type === 'single' ? 'Choix unique' :
                         question.type === 'multiple' ? 'Choix multiple' : 'Réponse libre'}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        ×{question.coefficient ?? 1} pts
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-gray-800 leading-relaxed">
                      {question.text}
                    </h2>
                  </div>
                  {hasAnswer && (
                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full mt-2 ${isSaved ? 'bg-theia-green' : 'bg-theia-orange'}`} />
                  )}
                </div>

                <div className="space-y-2.5">
                  {question.type === 'text' ? (
                    <textarea
                      value={answers[question.id] ?? ''}
                      onChange={(e) => handleTextChange(question.id, e.target.value)}
                      rows={4}
                      className="input-field resize-none"
                      placeholder="Rédigez votre réponse ici…"
                    />
                  ) : question.choices?.map((choice) => {
                    const isSelected = question.type === 'single'
                      ? answers[question.id] === choice.id
                      : (Array.isArray(answers[question.id]) && answers[question.id].includes(choice.id))

                    return (
                      <label
                        key={choice.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all
                          ${isSelected
                            ? 'border-theia-teal bg-theia-teal/5'
                            : 'border-theia-border hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {question.type === 'single' ? (
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            value={choice.id}
                            checked={isSelected}
                            onChange={() => handleSingleChange(question.id, choice.id)}
                            className="w-4 h-4 accent-theia-teal"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleMultipleChange(question.id, choice.id, e.target.checked)}
                            className="w-4 h-4 accent-theia-teal rounded"
                          />
                        )}
                        <span className={`text-sm ${isSelected ? 'text-theia-teal font-medium' : 'text-gray-700'}`}>
                          <span className="font-semibold mr-2">{choice.id.toUpperCase()}.</span>
                          {choice.text}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Zone de soumission finale */}
          <div className="card border-2 border-dashed border-theia-border bg-theia-gray">
            <div className="text-center py-3">
              <p className="font-semibold text-gray-700 mb-1">
                {answeredCount}/{totalQuestions} questions répondues
              </p>
              <p className="text-sm text-gray-500 mb-4">Vérifiez vos réponses avant de remettre.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => saveAllAnswers()}
                  disabled={saving}
                  className="btn-outline flex items-center gap-2"
                >
                  <CheckCircle size={15} />
                  {saving ? 'Sauvegarde…' : 'Tout sauvegarder'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2 px-6"
                  style={{ backgroundColor: '#0a4a5a' }}
                >
                  <Send size={15} />
                  {submitting ? 'Soumission…' : "Remettre l'examen"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white rounded-lg px-4 py-2 border border-theia-border mb-6">
            <AlertTriangle size={13} className="text-yellow-500 shrink-0" />
            Mode surveillance actif — toute navigation hors de cette page est enregistrée. Votre examen n'est pas interrompu.
          </div>
        </div>
      </div>
    </div>
  )
}
