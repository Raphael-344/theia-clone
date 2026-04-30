import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children, title }) {
  return (
    <div className="min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)' }}>
      <Sidebar />
      <div className="flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
