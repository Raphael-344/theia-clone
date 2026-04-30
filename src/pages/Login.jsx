import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Connexion réussie !')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f0f4f8' }}>
      {/* Panneau gauche — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ backgroundColor: '#0a4a5a' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-theia-sidebar font-bold text-xl">T</span>
          </div>
          <div>
            <p className="font-bold text-xl">THEIA</p>
            <p className="text-white/60 text-xs">Plateforme d'examens</p>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Bienvenue sur<br />votre plateforme<br />d'examens.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Passez vos examens en ligne en toute sécurité, consultez vos résultats et suivez votre progression.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/10 rounded-xl p-4 flex-1">
            <p className="text-3xl font-bold">100%</p>
            <p className="text-white/60 text-sm mt-1">Sécurisé</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 flex-1">
            <p className="text-3xl font-bold">24/7</p>
            <p className="text-white/60 text-sm mt-1">Disponible</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 flex-1">
            <p className="text-3xl font-bold">A B C D</p>
            <p className="text-white/60 text-sm mt-1">Notation</p>
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#0a4a5a' }}
            >
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <p className="font-bold text-xl text-gray-800">THEIA</p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-8 border border-theia-border">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Connexion</h2>
            <p className="text-gray-500 text-sm mb-6">Accédez à votre espace personnel</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@cesi.fr"
                    className="input-field pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-9 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base font-semibold mt-2"
                style={{ backgroundColor: '#0a4a5a' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Connexion…
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-theia-border">
              <p className="text-xs text-gray-400 text-center">
                Plateforme réservée aux étudiants CESI.<br />
                Contact : <span className="text-theia-teal">raphael.gasparin.34@gmail.com</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
