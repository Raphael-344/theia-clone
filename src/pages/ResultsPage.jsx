import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Play, ShieldAlert, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getNoteGrade, getNoteLabel } from '../lib/scoring'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Constantes visuelles ────────────────────────────────────────────────────

const TEAL_HEADER = '#1e5c5c'   // fond header question (teal foncé Theia)

const SCALE = [
  { grade: 'A', label: 'Très bien',  range: '≥ 75 %',      bg: '#1a7a4a', text: '#fff' },
  { grade: 'B', label: 'Bien',       range: '50 % – 75 %',  bg: '#1565a8', text: '#fff' },
  { grade: 'C', label: 'Passable',   range: '25 % – 50 %',  bg: '#c47d00', text: '#fff' },
  { grade: 'D', label: 'Insuffisant',range: '< 25 %',       bg: '#b91c1c', text: '#fff' },
]

const STATUS_BAND = {
  correct:   { bg: '#d4edda', border: '#28a745', text: '#155724', label: 'Réponses correctes' },
  partial:   { bg: '#fff3cd', border: '#fd7e14', text: '#856404', label: 'Réponses partiellement correctes' },
  cancelled: { bg: '#e2e3e5', border: '#6c757d', text: '#383d41', label: 'Question annulée — non comptée' },
  wrong:    { bg: '#f8d7da', border: '#dc3545', text: '#721c24', label: 'Réponses incorrectes' },
  empty:    { bg: '#f8d7da', border: '#dc3545', text: '#721c24', label: 'Sans réponse' },
  manual:   { bg: '#e2e3e5', border: '#6c757d', text: '#383d41', label: 'Correction manuelle' },
}

// ─── Composants ──────────────────────────────────────────────────────────────

function CheckSymbol({ yes }) {
  return yes ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded"
          style={{ background: '#1e5c5c', color: '#fff', fontWeight: 700, fontSize: 13 }}>
      ✓
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded border-2"
          style={{ borderColor: '#adb5bd', color: '#adb5bd', fontSize: 11 }}>
      ■
    </span>
  )
}

function QuestionBlock({ discordance: d, question, studentAnswers, index }) {
  const band  = STATUS_BAND[d.status] ?? STATUS_BAND.wrong
  const qType = d.type === 'single'   ? 'Question à réponse unique'
              : d.type === 'multiple' ? 'Question à réponses multiples'
              : 'Question à réponse libre'

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">

      {/* ── 1. Header teal foncé ──────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3"
           style={{ backgroundColor: TEAL_HEADER }}>
        <span className="text-white font-bold text-sm">Question {index + 1}</span>
        <span className="text-white text-xs opacity-80 font-medium">{qType}</span>
      </div>

      {/* ── 2. Texte de la question (ou image si "(voir image)") ── */}
      <div className="px-5 py-4 bg-white border-b border-gray-100">
        {d.questionText === '(voir image)' && question?.image_url
          ? <img src={question.image_url} alt="Question" className="rounded-xl max-w-full mb-2" style={{ maxHeight: 280 }} />
          : <p className="text-sm font-semibold text-gray-800 leading-relaxed">{d.questionText}</p>
        }
        <p className="text-xs text-gray-400 mt-1">Coefficient : ×{d.coeff}</p>
      </div>

      {/* ── 3. Bandeau statut ─────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2"
           style={{ backgroundColor: band.bg, borderTop: `2px solid ${band.border}` }}>
        <span className="text-xs font-bold" style={{ color: band.text }}>{band.label}</span>
        {d.type !== 'text' && (
          <span className="text-xs font-semibold" style={{ color: band.text }}>
            {d.discordanceCount} discordance{d.discordanceCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── 4. Tableau des choix (type text = fallback) ───── */}
      {d.type === 'text' ? (
        <div className="px-5 py-4 bg-white">
          <p className="text-xs text-gray-500 mb-1">Réponse saisie</p>
          <p className="text-sm text-gray-700 italic">{d.studentAnswer || '(non répondu)'}</p>
        </div>
      ) : (
        <ChoiceTable
          discordance={d}
          question={question}
          studentAnswers={studentAnswers}
        />
      )}
    </div>
  )
}

function ChoiceTable({ discordance: d, question, studentAnswers }) {
  const choices = question?.choices ?? []

  const selectedIds = (() => {
    if (!question) return new Set()
    if (question.type === 'single')
      return new Set(studentAnswers ? [studentAnswers] : [])
    return new Set(Array.isArray(studentAnswers) ? studentAnswers : [])
  })()

  if (choices.length === 0) {
    return (
      <div className="px-5 py-3 bg-white text-xs text-gray-400 italic">
        Données de correction indisponibles pour cette question.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white">
        <thead>
          <tr style={{ backgroundColor: '#f1f3f5' }}>
            <th className="w-12 px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b border-r border-gray-200" />
            <th className="w-36 px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b border-r border-gray-200">
              Réponse attendue
            </th>
            <th className="w-36 px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b border-r border-gray-200">
              Réponse saisie
            </th>
            <th className="w-40 px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b border-r border-gray-200">
              Réponse discordante
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200" />
          </tr>
        </thead>
        <tbody>
          {choices.map((choice) => {
            const expected = choice.correct
            const saisie   = selectedIds.has(choice.id)
            const discord  = expected !== saisie

            let rowBg = 'transparent'
            if (discord)  rowBg = '#fdecea'   // rouge très clair
            if (expected && !discord) rowBg = '#f0faf4'  // vert très clair si bonne réponse bien cochée

            return (
              <tr key={choice.id} style={{ backgroundColor: rowBg }}>
                <td className="px-3 py-2.5 text-center font-bold text-gray-700 border-b border-r border-gray-200 text-sm">
                  {String(choice.id).toUpperCase()}
                </td>
                <td className="px-3 py-2.5 text-center border-b border-r border-gray-200">
                  <CheckSymbol yes={expected} />
                </td>
                <td className="px-3 py-2.5 text-center border-b border-r border-gray-200">
                  <CheckSymbol yes={saisie} />
                </td>
                <td className="px-3 py-2.5 text-center border-b border-r border-gray-200">
                  {discord ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: '#f8d7da', color: '#721c24' }}>
                      Oui (+1)
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Non</span>
                  )}
                </td>
                <td className={`px-4 py-2.5 text-sm border-b border-gray-200 ${
                  expected ? 'font-semibold text-green-700' : 'text-gray-700'
                }`}>
                  {choice.text}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <td colSpan={5} className="px-4 py-2 border-t-2 border-gray-300">
              <span className="text-xs font-semibold" style={{ color: d.discordanceCount > 0 ? '#721c24' : '#155724' }}>
                {d.discordanceCount} discordance{d.discordanceCount > 1 ? 's' : ''}
              </span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-xs text-gray-600">
                Points obtenus :{' '}
                <span className={`font-bold ${
                  d.score >= d.maxScore ? 'text-green-700' :
                  d.score > 0 ? 'text-yellow-700' : 'text-red-700'
                }`}>{d.score}</span>
                <span className="text-gray-400"> / {d.maxScore}</span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const { isAdmin }   = useAuth()

  const [session,       setSession]       = useState(null)
  const [examQuestions, setExamQuestions] = useState([])
  const [violations,    setViolations]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState(null)

  // Chargement session + questions — ne dépend PAS de isAdmin pour éviter double exécution
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      console.log('RESULTS: chargement session', sessionId)

      // 1. Session seule, sans join
      const { data: sess, error: sessErr } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (cancelled) return

      if (sessErr || !sess) {
        console.error('RESULTS: erreur session', sessErr?.message, sessErr?.code)
        setLoadError(sessErr?.message ?? 'Session introuvable')
        setLoading(false)
        return
      }

      console.log('RESULTS: session OK, exam_id =', sess.exam_id, 'student_id =', sess.student_id)

      // 2. Examen complet (titre + questions)
      const { data: examData, error: examErr } = await supabase
        .from('exams')
        .select('id, title, description, questions')
        .eq('id', sess.exam_id)
        .single()

      if (cancelled) return
      if (examErr) console.warn('RESULTS: erreur exam', examErr.message)

      // 3. Profil étudiant (optionnel — pas bloquant)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', sess.student_id)
        .single()

      if (cancelled) return

      // Assembler manuellement ce que le join aurait fourni
      const assembled = {
        ...sess,
        exams:    examData    ?? null,
        profiles: profileData ?? null,
      }

      const qs = examData?.questions ?? []
      console.log('RESULTS: examQuestions =', qs.length,
        '| discordances[0].questionId =', (sess.discordances ?? [])[0]?.questionId)

      setSession(assembled)
      setExamQuestions(qs)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [sessionId]) // isAdmin exclu : charge violations séparément ci-dessous

  // Chargement violations (admin seulement) — effet séparé pour ne pas bloquer l'affichage
  useEffect(() => {
    if (!isAdmin || !session) return
    let cancelled = false

    supabase
      .from('anti_cheat_logs').select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setViolations(data ?? [])
      })

    return () => { cancelled = true }
  }, [isAdmin, session, sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-theia-gray flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-theia-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !session) {
    return (
      <div className="min-h-screen bg-theia-gray flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <p className="text-red-600 font-semibold mb-2">Impossible de charger le corrigé</p>
          <p className="text-sm text-gray-500 mb-4">{loadError ?? 'Session introuvable'}</p>
          <p className="text-xs text-gray-400 mb-6 font-mono break-all">ID: {sessionId}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.history.back()} className="btn-outline text-sm px-4">
              Retour
            </button>
            <Link to="/student/results" className="btn-primary text-sm px-4" style={{ backgroundColor: '#0a4a5a' }}>
              Mes résultats
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const {
    final_note, total_points, max_points,
    discordances = [], submitted_at, exam_id, answers = {},
  } = session

  const pct   = final_note ?? 0
  const grade = getNoteGrade(pct)
  const exam  = session.exams
  const studentName = session.profiles?.full_name ?? session.profiles?.email ?? '—'

  const correctCount  = discordances.filter((d) => d.status === 'correct').length
  const totalNonText  = discordances.filter((d) => d.type !== 'text').length

  // Index questions par id (robuste string/number)
  const questionById = {}
  for (const q of examQuestions) {
    questionById[q.id]        = q
    questionById[String(q.id)] = q
  }

  const currentScale = SCALE.find((s) => s.grade === grade)

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: '#f4f6f8' }}>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Bouton retour ──────────────────────────────── */}
        <Link
          to={isAdmin ? '/admin/results' : '/student/results'}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-theia-teal transition-colors"
        >
          <ArrowLeft size={15} />
          {isAdmin ? 'Résultats étudiants' : 'Mes résultats'}
        </Link>

        {/* ── HEADER PAGE : étudiant + échelle + titre ─── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Nom + date */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100">
            <p className="text-lg font-black text-gray-800">{studentName}</p>
            {submitted_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(submitted_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            )}
          </div>

          {/* Deux bandeaux côte à côte : échelle + note actuelle */}
          <div className="px-6 py-4 flex flex-wrap gap-4 items-start border-b border-gray-100">

            {/* Bandeau échelle d'évaluation */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Échelle d'évaluation standard
              </p>
              <div className="flex gap-1">
                {SCALE.map((s) => {
                  const active = s.grade === grade
                  return (
                    <div
                      key={s.grade}
                      className="flex-1 rounded-lg px-2 py-2 text-center transition-all"
                      style={{
                        backgroundColor: active ? s.bg : s.bg + '22',
                        color: active ? s.text : s.bg,
                        border: active ? `2px solid ${s.bg}` : `2px solid ${s.bg}44`,
                        fontWeight: active ? 800 : 500,
                      }}
                    >
                      <p className="text-lg font-black">{s.grade}</p>
                      <p className="text-xs mt-0.5 leading-tight">{s.range}</p>
                      <p className="text-xs mt-0.5 leading-tight opacity-80">{s.label}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Résultat étudiant */}
            <div
              className="rounded-xl px-6 py-3 text-center shrink-0"
              style={{ backgroundColor: currentScale?.bg + '15', border: `2px solid ${currentScale?.bg}44` }}
            >
              <p className="text-5xl font-black" style={{ color: currentScale?.bg }}>{grade}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: currentScale?.bg }}>{pct}%</p>
              <p className="text-xs text-gray-500 mt-1">{getNoteLabel(pct)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {correctCount} / {totalNonText} correctes
              </p>
            </div>
          </div>

          {/* Titre de l'examen */}
          <div className="px-6 py-4" style={{ backgroundColor: '#f8f9fa' }}>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Examen</p>
            <h1 className="text-xl font-black text-gray-800">{exam?.title}</h1>
            {exam?.description && (
              <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
            )}
          </div>
        </div>

        {/* ── QUESTIONS ──────────────────────────────────── */}
        {discordances.map((d, i) => {
          const question   = questionById[d.questionId] ?? questionById[String(d.questionId)]
          const studentAns = answers?.[d.questionId] ?? answers?.[String(d.questionId)]
          return (
            <QuestionBlock
              key={d.questionId}
              discordance={d}
              question={question}
              studentAnswers={studentAns}
              index={i}
            />
          )
        })}

        {/* ── NOTE FINALE ────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 text-white font-bold text-sm"
               style={{ backgroundColor: TEAL_HEADER }}>
            Résultat final
          </div>
          <div className="px-6 py-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {correctCount} question{correctCount > 1 ? 's' : ''} correcte{correctCount > 1 ? 's' : ''} sur {totalNonText}
              </p>
              <p className="text-sm text-gray-500">
                Score : <span className="font-bold text-gray-800">{total_points} / {max_points} pts</span>
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Pourcentage de réussite : <span className="font-bold" style={{ color: currentScale?.bg }}>{pct}%</span>
              </p>
            </div>
            <div className="text-center rounded-2xl px-10 py-4"
                 style={{ backgroundColor: currentScale?.bg + '15', border: `2px solid ${currentScale?.bg}` }}>
              <p className="text-7xl font-black leading-none" style={{ color: currentScale?.bg }}>{grade}</p>
              <p className="text-xl font-bold mt-1" style={{ color: currentScale?.bg }}>{pct}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{getNoteLabel(pct)}</p>
            </div>
          </div>
        </div>

        {/* ── Violations anti-triche (admin only) ────────── */}
        {isAdmin && violations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-red-500">
            <div className="px-5 py-3 flex items-center gap-2 border-b border-gray-100">
              <ShieldAlert size={16} className="text-red-500" />
              <span className="font-bold text-gray-800 text-sm">
                Violations anti-triche ({violations.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2 font-semibold">#</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Détail</th>
                    <th className="px-4 py-2 font-semibold">Horodatage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {violations.map((v, idx) => (
                    <tr key={v.id} className="text-xs">
                      <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">{v.event_type}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{v.detail ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-400">
                        {v.created_at ? format(new Date(v.created_at), 'dd/MM HH:mm:ss', { locale: fr }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-6">
          <Link
            to={isAdmin ? '/admin/results' : '/student/results'}
            className="btn-outline flex items-center gap-2 px-5"
          >
            <ArrowLeft size={15} />
            {isAdmin ? 'Retour aux résultats' : 'Mes résultats'}
          </Link>
          {!isAdmin && (
            <Link
              to={`/exam/${exam_id}`}
              className="btn-primary flex items-center gap-2 px-6"
              style={{ backgroundColor: '#0a4a5a' }}
            >
              <Play size={14} />
              Repasser l'examen
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
