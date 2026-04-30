import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout/Layout'
import { supabase } from '../lib/supabase'
import { Users, UserPlus, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name')
    setStudents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createStudent = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      // Créer le compte via Supabase Admin (nécessite service role en prod)
      // Ici on utilise signUp puis update du profil
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
        user_metadata: { full_name: form.full_name },
      })
      if (error) throw error

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.full_name,
        role: 'student',
      })

      toast.success('Étudiant créé avec succès')
      setShowForm(false)
      setForm({ email: '', full_name: '', password: '' })
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout title="Étudiants">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{students.length} étudiant{students.length > 1 ? 's' : ''} enregistré{students.length > 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
          style={{ backgroundColor: '#0a4a5a' }}
        >
          <UserPlus size={15} />
          Ajouter un étudiant
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-theia-teal/30">
          <h3 className="font-semibold text-gray-800 mb-4">Créer un compte étudiant</h3>
          <form onSubmit={createStudent} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom complet</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field"
                placeholder="Prénom NOM"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="prenom.nom@cesi.fr"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary" style={{ backgroundColor: '#0a4a5a' }}>
                {creating ? 'Création…' : 'Créer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun étudiant enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-theia-border">
                  <th className="pb-3 font-semibold">Nom</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theia-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-theia-gray/50">
                    <td className="py-3 font-medium text-gray-800">
                      {s.full_name ?? '—'}
                    </td>
                    <td className="py-3 text-gray-500 flex items-center gap-1">
                      <Mail size={13} className="text-gray-400" />
                      {s.email}
                    </td>
                    <td className="py-3 text-gray-400 text-xs">
                      {s.created_at
                        ? format(new Date(s.created_at), 'dd/MM/yyyy', { locale: fr })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
