import React from 'react'
import Layout from '../components/Layout/Layout'
import ExamList from '../components/Admin/ExamList'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'

export default function AdminExams() {
  return (
    <Layout title="Examens">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">Gérez vos examens importés</p>
        <Link
          to="/admin/import"
          className="btn-primary flex items-center gap-2"
          style={{ backgroundColor: '#0a4a5a' }}
        >
          <Upload size={15} />
          Importer un examen
        </Link>
      </div>
      <ExamList />
    </Layout>
  )
}
