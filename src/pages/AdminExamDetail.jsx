import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Save, Trash2, Plus, X, CheckSquare, Square,
  ChevronUp, ChevronDown, AlertTriangle,
} from 'lucide-react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { scoreExam } from '../lib/scoring'
import toast from 'react-hot-toast'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

// ── Composants utilitaires ──────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function InlineInput({ value, onChange, className = '', ...props }) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-theia-border rounded-lg text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-theia-teal/30 focus:border-theia-teal
                  transition-colors ${className}`}
      {...props}
    />
  )
}

function InlineTextarea({ value, onChange, rows = 3, className = '' }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={`w-full px-3 py-2 border border-theia-border rounded-lg text-sm bg-white resize-none
                  focus:outline-none focus:ring-2 focus:ring-theia-teal/30 focus:border-theia-teal
                  transition-colors ${className}`}
    />
  )
}

// ── Éditeur d'une question ──────────────────────────────────────────────────

function QuestionEditor({ question, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const isText = question.type === 'text'

  const setField = (key, val) => onChange({ ...question, [key]: val })

  const setChoiceField = (choiceIdx, key, val) => {
    const choices = question.choices.map((c, i) => i === choiceIdx ? { ...c, [key]: val || undefined } : c)
    onChange({ ...question, choices })
  }

  const toggleCorrect = (choiceIdx) => {
    let choices
    if (question.type === 'single') {
      // Un seul correct à la fois
      choices = question.choices.map((c, i) => ({ ...c, correct: i === choiceIdx }))
    } else {
      choices = question.choices.map((c, i) =>
        i === choiceIdx ? { ...c, correct: !c.correct } : c
      )
    }
    onChange({ ...question, choices })
  }

  const addChoice = () => {
    const id = LETTERS[question.choices?.length ?? 0] ?? `c${Date.now()}`
    onChange({ ...question, choices: [...(question.choices ?? []), { id, text: '', correct: false }] })
  }

  const removeChoice = (choiceIdx) => {
    const choices = question.choices.filter((_, i) => i !== choiceIdx)
    onChange({ ...question, choices })
  }

  const TYPE_LABELS = { single: 'Réponse unique', multiple: 'Réponses multiples', text: 'Texte libre' }

  return (
    <div className={`card border ${question.annulee ? 'border-red-300 bg-red-50/30 opacity-70' : 'border-theia-border'}`}>
      {/* Header question */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white bg-theia-sidebar px-2.5 py-1 rounded-full">
            Q{index + 1}
          </span>
          <button
            onClick={() => setField('annulee', !question.annulee)}
            title={question.annulee ? 'Réactiver la question' : 'Annuler la question'}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              question.annulee
                ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            }`}
          >
            {question.annulee ? '✕ Annulée' : 'Annuler'}
          </button>
          <select
            value={question.type}
            onChange={(e) => setField('type', e.target.value)}
            className="text-xs border border-theia-border rounded-lg px-2 py-1 bg-white text-gray-600
                       focus:outline-none focus:ring-1 focus:ring-theia-teal"
          >
            <option value="single">Réponse unique</option>
            <option value="multiple">Réponses multiples</option>
            <option value="text">Texte libre</option>
          </select>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Coeff.</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={question.coefficient ?? 1}
              onChange={(e) => setField('coefficient', parseFloat(e.target.value) || 1)}
              className="w-14 px-2 py-1 border border-theia-border rounded-lg text-center
                         focus:outline-none focus:ring-1 focus:ring-theia-teal"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp}   disabled={index === 0}         title="Monter"
            className="p-1.5 rounded text-gray-400 hover:text-theia-teal hover:bg-theia-gray disabled:opacity-30">
            <ChevronUp size={15} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} title="Descendre"
            className="p-1.5 rounded text-gray-400 hover:text-theia-teal hover:bg-theia-gray disabled:opacity-30">
            <ChevronDown size={15} />
          </button>
          <button onClick={onDelete} title="Supprimer cette question"
            className="p-1.5 rounded text-gray-400 hover:text-theia-red hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Texte de la question */}
      <Field label="Texte de la question">
        <InlineTextarea
          value={question.text}
          onChange={(v) => setField('text', v)}
          rows={2}
        />
      </Field>

      {/* Image (optionnelle) */}
      <Field label="Image (URL optionnelle)">
        <InlineInput
          value={question.image_url ?? ''}
          onChange={(v) => setField('image_url', v || null)}
          placeholder="https://… (laisser vide pour aucune image)"
        />
      </Field>
      {question.image_url && (
        <div className="flex justify-center mt-2">
          <img
            src={question.image_url}
            alt="Aperçu"
            className="max-w-full rounded-xl border border-theia-border shadow-sm"
            style={{ maxHeight: 280 }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      )}

      {/* Choix (si pas text) */}
      {!isText && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Choix — {question.type === 'single' ? 'une seule bonne réponse' : 'plusieurs bonnes réponses possibles'}
          </p>
          <div className="space-y-2">
            {(question.choices ?? []).map((choice, ci) => (
              <div
                key={choice.id ?? ci}
                className={`rounded-lg border transition-colors ${
                  choice.correct
                    ? 'border-theia-green bg-theia-green-light'
                    : 'border-theia-border bg-white'
                }`}
              >
                {/* Ligne principale : toggle correct + lettre + texte + supprimer */}
                <div className="flex items-center gap-2 p-2">
                  <button
                    onClick={() => toggleCorrect(ci)}
                    title={choice.correct ? 'Désigner comme incorrecte' : 'Désigner comme correcte'}
                    className="shrink-0"
                  >
                    {choice.correct
                      ? <CheckSquare size={18} className="text-theia-green" />
                      : <Square      size={18} className="text-gray-300 hover:text-theia-teal" />
                    }
                  </button>
                  <span className="text-xs font-bold text-gray-500 w-5 shrink-0">
                    {String(choice.id ?? LETTERS[ci]).toUpperCase()}.
                  </span>
                  <input
                    value={choice.text ?? ''}
                    onChange={(e) => setChoiceField(ci, 'text', e.target.value)}
                    placeholder={choice.image_url ? '(optionnel si image)' : `Texte du choix ${String(choice.id ?? LETTERS[ci]).toUpperCase()}`}
                    className={`flex-1 text-sm bg-transparent border-0 outline-none focus:ring-0
                      ${choice.correct ? 'text-green-800 font-medium' : 'text-gray-700'}`}
                  />
                  {choice.correct && <span className="text-xs shrink-0">✅</span>}
                  <button
                    onClick={() => removeChoice(ci)}
                    className="shrink-0 p-1 rounded hover:bg-red-100 text-gray-300 hover:text-theia-red"
                  >
                    <X size={13} />
                  </button>
                </div>
                {/* Ligne image : URL + aperçu */}
                <div className="px-2 pb-2 flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">🖼</span>
                  <input
                    value={choice.image_url ?? ''}
                    onChange={(e) => setChoiceField(ci, 'image_url', e.target.value)}
                    placeholder="URL image (optionnel)"
                    className="flex-1 text-xs text-gray-500 bg-transparent border-0 outline-none focus:ring-0"
                  />
                </div>
                {choice.image_url && (
                  <div className="px-2 pb-2">
                    <img
                      src={choice.image_url}
                      alt="aperçu"
                      className="rounded-lg max-w-full"
                      style={{ maxHeight: 100 }}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addChoice}
            className="mt-2 flex items-center gap-1.5 text-xs text-theia-teal hover:text-theia-teal/80 font-medium py-1"
          >
            <Plus size={13} /> Ajouter un choix
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────

export default function AdminExamDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()

  const [exam,    setExam]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

  useEffect(() => {
    supabase.from('exams').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error('Examen introuvable'); navigate('/admin/exams'); return }
        setExam(data)
        setLoading(false)
      })
  }, [id, navigate])

  const update = useCallback((patch) => {
    setExam((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }, [])

  const setQuestion = useCallback((qi, q) => {
    setExam((prev) => {
      const questions = [...prev.questions]
      questions[qi] = q
      return { ...prev, questions }
    })
    setDirty(true)
  }, [])

  const deleteQuestion = useCallback((qi) => {
    setExam((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qi) }))
    setDirty(true)
  }, [])

  const moveQuestion = useCallback((qi, dir) => {
    setExam((prev) => {
      const qs = [...prev.questions]
      const target = qi + dir
      if (target < 0 || target >= qs.length) return prev
      ;[qs[qi], qs[target]] = [qs[target], qs[qi]]
      return { ...prev, questions: qs }
    })
    setDirty(true)
  }, [])

  const addQuestion = () => {
    const newQ = {
      id: Date.now(),
      text: '',
      type: 'single',
      coefficient: 1,
      choices: [
        { id: 'a', text: '', correct: false },
        { id: 'b', text: '', correct: false },
        { id: 'c', text: '', correct: false },
        { id: 'd', text: '', correct: false },
      ],
    }
    setExam((prev) => ({ ...prev, questions: [...prev.questions, newQ] }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)

    // 1. Sauvegarder l'examen
    const { error } = await supabase
      .from('exams')
      .update({
        title:       exam.title,
        description: exam.description ?? null,
        duration:    exam.duration,
        is_active:   exam.is_active,
        questions:   exam.questions,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', id)

    if (error) { toast.error('Erreur : ' + error.message); setSaving(false); return }

    // 2. Recalculer les scores de toutes les sessions soumises pour cet examen
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, answers')
      .eq('exam_id', id)
      .eq('status', 'submitted')

    if (sessions?.length > 0) {
      await Promise.all(
        sessions.map((session) => {
          const { totalPoints, maxPoints, finalNote, discordances } = scoreExam(
            exam.questions,
            session.answers ?? {}
          )
          return supabase
            .from('exam_sessions')
            .update({ final_note: finalNote, total_points: totalPoints, max_points: maxPoints, discordances })
            .eq('id', session.id)
        })
      )
      toast.success(`Sauvegardé — ${sessions.length} passage${sessions.length > 1 ? 's' : ''} recalculé${sessions.length > 1 ? 's' : ''} ✓`)
    } else {
      toast.success('Examen sauvegardé ✓')
    }

    setSaving(false)
    setDirty(false)
  }

  const deleteExam = async () => {
    if (!confirm(`Supprimer "${exam.title}" ? Cette action est irréversible et supprimera aussi toutes les sessions associées.`)) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) { toast.error('Erreur : ' + error.message); return }
    toast.success('Examen supprimé')
    navigate('/admin/exams')
  }

  if (loading) {
    return (
      <Layout title="Modifier l'examen">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Modifier l'examen">
      {/* Barre d'actions sticky */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 py-3 mb-6 bg-theia-gray/95 backdrop-blur border-b border-theia-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/exams" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-theia-teal">
            <ArrowLeft size={15} /> Retour
          </Link>
          {dirty && (
            <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
              <AlertTriangle size={12} /> Modifications non sauvegardées
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={deleteExam}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-theia-red
                       hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
          >
            <Trash2 size={14} /> Supprimer
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white
                       transition-all disabled:opacity-50"
            style={{ backgroundColor: dirty ? '#0a4a5a' : '#8fa8aa' }}
          >
            <Save size={14} />
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Informations générales */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">
            Informations générales
          </h2>

          <Field label="Titre de l'examen">
            <InlineInput
              value={exam.title}
              onChange={(v) => update({ title: v })}
              className="text-base font-semibold"
              placeholder="Titre de l'examen"
            />
          </Field>

          <Field label="Description (optionnelle)">
            <InlineTextarea
              value={exam.description ?? ''}
              onChange={(v) => update({ description: v })}
              rows={2}
              placeholder="Description de l'examen…"
            />
          </Field>

          <div className="flex gap-4 flex-wrap">
            <Field label="Durée (minutes)">
              <input
                type="number"
                min={5}
                step={5}
                value={exam.duration ?? 60}
                onChange={(e) => update({ duration: parseInt(e.target.value) || 60 })}
                className="w-28 px-3 py-2 border border-theia-border rounded-lg text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-theia-teal/30 focus:border-theia-teal"
              />
            </Field>
            <Field label="Statut">
              <button
                onClick={() => update({ is_active: !exam.is_active })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                  exam.is_active
                    ? 'bg-theia-green-light text-theia-green border-theia-green'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}
              >
                {exam.is_active ? '● Actif' : '○ Inactif'}
              </button>
            </Field>
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              Questions
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({exam.questions?.length ?? 0})
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {(exam.questions ?? []).map((q, qi) => (
              <QuestionEditor
                key={q.id ?? qi}
                question={q}
                index={qi}
                total={exam.questions.length}
                onChange={(updated) => setQuestion(qi, updated)}
                onDelete={() => deleteQuestion(qi)}
                onMoveUp={() => moveQuestion(qi, -1)}
                onMoveDown={() => moveQuestion(qi, 1)}
              />
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       border-2 border-dashed border-theia-border text-sm font-medium text-gray-500
                       hover:border-theia-teal hover:text-theia-teal hover:bg-theia-teal/5 transition-all"
          >
            <Plus size={16} /> Ajouter une question
          </button>
        </div>

        {/* Bouton sauvegarder bas de page */}
        <div className="flex justify-end pb-8">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white
                       transition-all disabled:opacity-50"
            style={{ backgroundColor: dirty ? '#0a4a5a' : '#8fa8aa' }}
          >
            <Save size={15} />
            {saving ? 'Sauvegarde en cours…' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
