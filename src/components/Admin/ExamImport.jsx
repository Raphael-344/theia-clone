import React, { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, FileJson, X, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const EXAMPLE_JSON = {
  title: "Examen de démonstration",
  description: "Cet examen couvre les bases du module.",
  duration: 60,
  questions: [
    {
      id: 1,
      text: "Quelle est la complexité d'un tri fusion ?",
      type: "single",
      coefficient: 2,
      choices: [
        { id: "a", text: "O(n)", correct: false },
        { id: "b", text: "O(n log n)", correct: true },
        { id: "c", text: "O(n²)", correct: false },
        { id: "d", text: "O(log n)", correct: false }
      ]
    },
    {
      id: 2,
      text: "Parmi ces langages, lesquels sont compilés ?",
      type: "multiple",
      coefficient: 3,
      choices: [
        { id: "a", text: "C", correct: true },
        { id: "b", text: "Python", correct: false },
        { id: "c", text: "Rust", correct: true },
        { id: "d", text: "JavaScript", correct: false }
      ]
    }
  ]
}

function validateExamJSON(data) {
  const errors = []
  if (!data.title || typeof data.title !== 'string') errors.push('Champ "title" manquant ou invalide')
  if (!Array.isArray(data.questions)) errors.push('Champ "questions" doit être un tableau')
  else {
    data.questions.forEach((q, i) => {
      const prefix = `Question ${i + 1}`
      if (!q.text) errors.push(`${prefix}: champ "text" manquant`)
      if (!['single', 'multiple', 'text'].includes(q.type)) {
        errors.push(`${prefix}: "type" doit être "single", "multiple" ou "text"`)
      }
      if (q.type !== 'text' && !Array.isArray(q.choices)) {
        errors.push(`${prefix}: "choices" doit être un tableau`)
      }
      if (q.type !== 'text' && Array.isArray(q.choices)) {
        const hasCorrect = q.choices.some((c) => c.correct)
        if (!hasCorrect) errors.push(`${prefix}: aucune réponse correcte définie`)
      }
    })
  }
  return errors
}

export default function ExamImport() {
  const [dragActive, setDragActive] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef()
  const { user } = useAuth()

  const processFile = (file) => {
    if (!file || !file.name.endsWith('.json')) {
      toast.error('Veuillez sélectionner un fichier JSON')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        const errs = validateExamJSON(data)
        setErrors(errs)
        if (errs.length === 0) {
          setParsedData(data)
          toast.success(`"${data.title}" — ${data.questions.length} questions chargées`)
        } else {
          setParsedData(null)
        }
      } catch {
        setErrors(['Fichier JSON invalide ou malformé'])
        setParsedData(null)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    if (!parsedData) return
    setLoading(true)
    try {
      const { error } = await supabase.from('exams').insert({
        title: parsedData.title,
        description: parsedData.description ?? null,
        duration: parsedData.duration ?? 60,
        questions: parsedData.questions,
        created_by: user.id,
        is_active: true,
      })
      if (error) throw error
      toast.success('Examen importé avec succès !')
      setParsedData(null)
      setErrors([])
    } catch (err) {
      toast.error('Erreur lors de l\'import : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(EXAMPLE_JSON, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'examen-exemple.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Zone de dépôt */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
          ${dragActive ? 'border-theia-teal bg-theia-teal/5' : 'border-theia-border hover:border-theia-teal hover:bg-theia-gray'}
          ${parsedData ? 'border-theia-green bg-theia-green-light' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => processFile(e.target.files[0])}
        />

        {parsedData ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle size={40} className="text-theia-green" />
            <p className="text-lg font-semibold text-theia-green">{parsedData.title}</p>
            <p className="text-sm text-gray-500">
              {parsedData.questions.length} question{parsedData.questions.length > 1 ? 's' : ''} •{' '}
              {parsedData.duration ?? 60} min
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setParsedData(null); setErrors([]) }}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 mt-1"
            >
              <X size={12} /> Supprimer
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-theia-teal/10 rounded-2xl flex items-center justify-center">
              <FileJson size={32} className="text-theia-teal" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">
                Glissez votre fichier JSON ici
              </p>
              <p className="text-sm text-gray-400 mt-1">
                ou <span className="text-theia-teal font-medium">cliquez pour parcourir</span>
              </p>
            </div>
            <p className="text-xs text-gray-400">Format JSON — Examen THEIA</p>
          </div>
        )}
      </div>

      {/* Erreurs de validation */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-theia-red" />
            <p className="text-sm font-semibold text-theia-red">
              {errors.length} erreur{errors.length > 1 ? 's' : ''} de validation
            </p>
          </div>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {parsedData && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
            style={{ backgroundColor: '#0a4a5a' }}
          >
            <Upload size={16} />
            {loading ? 'Import en cours…' : 'Importer l\'examen'}
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-outline flex items-center gap-2"
          >
            <Eye size={16} />
            {showPreview ? 'Masquer' : 'Aperçu'}
          </button>
        </div>
      )}

      {/* Prévisualisation */}
      {showPreview && parsedData && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Eye size={16} className="text-theia-teal" />
            Aperçu — {parsedData.title}
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {parsedData.questions.map((q, i) => (
              <div key={q.id ?? i} className="border border-theia-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-medium text-gray-800">
                    <span className="text-theia-teal font-semibold mr-2">Q{i + 1}.</span>
                    {q.text}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {q.type}
                    </span>
                    <span className="text-xs bg-theia-teal/10 text-theia-teal px-2 py-0.5 rounded-full">
                      ×{q.coefficient ?? 1}
                    </span>
                  </div>
                </div>
                {q.choices && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.choices.map((c) => (
                      <div
                        key={c.id}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          c.correct
                            ? 'bg-theia-green-light border-theia-green text-green-700 font-medium'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <span className="font-semibold mr-1">{c.id.toUpperCase()}.</span>
                        {c.text}
                        {c.correct && ' ✓'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exemple de format */}
      <div className="card bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Format JSON attendu</h3>
          <button
            onClick={downloadExample}
            className="text-xs text-theia-teal hover:underline"
          >
            Télécharger l'exemple
          </button>
        </div>
        <pre className="text-xs text-gray-600 bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto">
          {JSON.stringify(EXAMPLE_JSON, null, 2)}
        </pre>
      </div>
    </div>
  )
}
