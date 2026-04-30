import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      console.log('AUTH: fetchProfile pour userId =', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      console.log('AUTH: résultat query =', JSON.stringify(data), 'erreur =', JSON.stringify(error))
      if (!error && data) setProfile(data)
      return data
    } catch (err) {
      console.log('AUTH: fetchProfile exception =', err?.message)
      return null
    }
  }

  useEffect(() => {
    let active = true

    const fetchProfileWithTimeout = (userId) => {
      const timeout = new Promise((resolve) => setTimeout(() => {
        console.log('AUTH: fetchProfile timeout 3s')
        resolve(null)
      }, 3000))
      return Promise.race([fetchProfile(userId), timeout])
    }

    const init = async () => {
      try {
        console.log('AUTH: début getSession')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('AUTH: session = ' + (session?.user?.email ?? 'null'))
        if (!active) return

        if (session?.user) {
          setUser(session.user)
          await fetchProfileWithTimeout(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.log('AUTH: erreur getSession = ' + err?.message)
        if (active) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (active) {
          console.log('AUTH: setLoading(false) appelé')
          setLoading(false)
        }
      }
    }

    init()

    let subscription
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('AUTH: onAuthStateChange event = ' + event)
        if (event === 'INITIAL_SESSION') return
        if (!active) return
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      })
      subscription = data.subscription
    } catch (err) {
      console.log('AUTH: erreur onAuthStateChange setup = ' + err?.message)
    }

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    fetchProfile(data.user.id)
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.role === 'admin'
  const isStudent = profile?.role === 'student'

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, isAdmin, isStudent, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
