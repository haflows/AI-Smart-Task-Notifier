
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TaskForm from '@/components/TaskForm'
import TaskList from '@/components/TaskList'
import DigestTest from '@/components/DigestTest'

export interface Task {
  id: string
  title: string
  detail: string | null
  due_date: string | null
  priority: 'High' | 'Medium' | 'Low'
  status: 'Todo' | 'Done'
  created_at: string
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data as Task[] || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center relative">
          <div className="absolute top-0 right-0">
            <a href="/settings" className="text-sm text-gray-500 hover:text-purple-600 flex items-center gap-1">
              ⚙️ 設定
            </a>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            AI Smart Task Notifier
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            シンプルで賢いタスク管理。AIが重要度を分析し、最適なタイミングで通知します。
          </p>
        </header>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">新しいタスクを追加</h2>
          <TaskForm onTaskAdded={fetchTasks} />
          <DigestTest />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">タスク一覧</h2>
            <button onClick={fetchTasks} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
              更新
            </button>
          </div>
          {loading ? (
            <div className="text-center py-10 text-gray-500">読み込み中...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">タスクがありません。上のフォームから追加してください。</div>
          ) : (
            <TaskList tasks={tasks} onTaskUpdated={fetchTasks} />
          )}
        </div>
      </div>
    </main>
  )
}
