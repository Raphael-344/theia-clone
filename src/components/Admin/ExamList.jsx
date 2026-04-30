import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Trash2, ToggleLeft, ToggleRight, Clock, HelpCircle, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ExamList() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        id, title, description, duration, is_active, created_at,
        questions
      `)
      .order('created_at', { ascending: false })
    if (!error) setExams(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (exam) => {
    const { error } = await supabase
      .from('exams')
      .update({ is_active: !exam.is_active })
      .eq('id', exam.id)
    if (!error) {
      setExams((prev) =>
        prev.map((e) => e.id === exam.id ? { ...e, is_active: !e.is_active } : e)
      )
      toast.success(exam.is_active ? 'Examen désactivé' : 'Examen activé')
    }
  }

  const deleteExam = async (id) => {
    if (!confirm('Supprimer cet examen ? Cette action est irréversible.')) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (!error) {
      setExams((prev) => prev.filter((e) => e.id !== id))
      toast.success('Examen supprimé')
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (exams.length === 0) {
    return (
      <div className="card text-center py-16">
        <HelpCircle size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Aucun examen créé</p>
        <p className="text-sm text-gray-400 mt-1">
          Importez votre premier examen via <Link to="/admin/import" className="text-theia-teal hover:underline">l'outil d'import</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {exams.map((exam) => (
        <div
          key={exam.id}
          className="card flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800">{exam.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                exam.is_active
                  ? 'bg-theia-green-light text-theia-green'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {exam.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            {exam.description && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{exam.description}</p>
            )}
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <HelpCircle size={12} />
                {Array.isArray(exam.questions) ? exam.questions.length : 0} question{(exam.questions?.length ?? 0) > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {exam.duration} min
              </span>
              <span>
                {format(new Date(exam.created_at), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleActive(exam)}
              className={`p-2 rounded-lg transition-colors ${
                exam.is_active
                  ? 'text-theia-green hover:bg-theia-green-light'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={exam.is_active ? 'Désactiver' : 'Activer'}
            >
              {exam.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
            <Link
              to={`/admin/results?exam=${exam.id}`}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-theia-teal transition-colors"
              title="Voir les résultats"
            >
              <Users size={18} />
            </Link>
            <button
              onClick={() => deleteExam(exam.id)}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-theia-red transition-colors"
              title="Supprimer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
