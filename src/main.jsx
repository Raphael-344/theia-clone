import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Intercepte et ignore les messages d'extensions Chrome (ex: "No Listener: tabs:...")
window.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'string' && event.data.includes('tabs:')) {
    event.stopImmediatePropagation()
    return
  }
}, true)

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0a4a5a',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#2da44e', secondary: '#fff' } },
        error: { iconTheme: { primary: '#d93025', secondary: '#fff' } },
      }}
    />
  </BrowserRouter>
)
