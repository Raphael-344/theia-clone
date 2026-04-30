import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export function useAntiCheat({ sessionId, enabled = true, onViolation }) {
  const violationsRef = useRef(0)
  const toastIdRef = useRef(null)

  const logViolation = useCallback(async (type, detail = '') => {
    violationsRef.current += 1
    const count = violationsRef.current

    // Enregistrer en base
    if (sessionId) {
      await supabase.from('anti_cheat_logs').insert({
        session_id: sessionId,
        event_type: type,
        detail,
        violation_count: count,
      })
    }

    // Alerte visuelle
    if (toastIdRef.current) toast.dismiss(toastIdRef.current)
    toastIdRef.current = toast.error(
      `⚠️ Attention ! Comportement suspect détecté (${type}). Violation #${count}`,
      {
        duration: 6000,
        style: {
          background: '#d93025',
          color: '#fff',
          fontWeight: '600',
          fontSize: '15px',
          padding: '14px 20px',
          border: '2px solid #ff4444',
        },
      }
    )

    if (onViolation) onViolation({ type, count })
  }, [sessionId, onViolation])

  useEffect(() => {
    if (!enabled) return

    // Détecter quitter la page / changer d'onglet
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logViolation('tab_switch', 'Changement d\'onglet ou fenêtre masquée')
      }
    }

    // Détecter quitter la page
    const handleBeforeUnload = (e) => {
      logViolation('page_leave', 'Tentative de quitter la page')
      e.preventDefault()
      e.returnValue = 'Votre examen est en cours. Êtes-vous sûr de vouloir quitter ?'
      return e.returnValue
    }

    // Bloquer copier-coller
    const handleCopy = (e) => {
      e.preventDefault()
      logViolation('copy_attempt', 'Tentative de copie détectée')
    }
    const handlePaste = (e) => {
      e.preventDefault()
      logViolation('paste_attempt', 'Tentative de collage détectée')
    }

    // Bloquer clic droit
    const handleContextMenu = (e) => {
      e.preventDefault()
      logViolation('right_click', 'Clic droit bloqué')
    }

    // Détecter sortie du fullscreen
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('fullscreen_exit', 'Sortie du mode plein écran')
      }
    }

    // Bloquer F12, Ctrl+U, Ctrl+Shift+I
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'Tab')
      ) {
        e.preventDefault()
        logViolation('devtools_attempt', `Raccourci bloqué: ${e.key}`)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, logViolation])

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch (err) {
      console.warn('Fullscreen non disponible:', err)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch (err) {
      console.warn('Exit fullscreen error:', err)
    }
  }, [])

  return { violations: violationsRef.current, requestFullscreen, exitFullscreen }
}
