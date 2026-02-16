'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TaskForm({ onTaskAdded }: { onTaskAdded: () => void }) {
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [detail, setDetail] = useState('')
    const [priority, setPriority] = useState('Medium')
    const [dueDate, setDueDate] = useState('')
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setLoading(true)
        const { error } = await supabase.from('tasks').insert([
            {
                title,
                detail: detail || null,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null
            }
        ])

        setLoading(false)

        if (error) {
            alert('Error adding task: ' + error.message)
        } else {
            setTitle('')
            setDetail('')
            setPriority('Medium')
            setDueDate('')
            onTaskAdded()
        }
    }

    const handleAnalyze = async () => {
        if (!title) {
            alert('タイトルを入力してください');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/analyze-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, detail }),
            });
            const data = await res.json();

            if (data.analysis) {
                if (data.analysis.priority) setPriority(data.analysis.priority);
                if (data.analysis.suggested_detail) setDetail(data.analysis.suggested_detail);
                // due_date logic could be complex, skipping for now or simple alert
                if (data.analysis.due_date_suggestion) {
                    alert(`AI提案の期限: ${data.analysis.due_date_suggestion}\n(日付選択は手動で行ってください)`);
                }
            }
        } catch (e) {
            console.error(e);
            alert('分析に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="flex justify-between items-end mb-1">
                    <label htmlFor="title" className="block text-sm font-bold text-gray-700">タイトル <span className="text-red-500">*</span></label>
                    <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={loading || !title}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1 transition-colors"
                    >
                        ✨ AIで分析
                    </button>
                </div>
                <input
                    type="text"
                    id="title"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                    placeholder="例: 明日のプレゼン資料作成"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div>
                <label htmlFor="detail" className="block text-sm font-bold text-gray-700">詳細 (任意)</label>
                <textarea
                    id="detail"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                    placeholder="タスクの詳細を入力してください..."
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="priority" className="block text-sm font-bold text-gray-700">重要度</label>
                    <select
                        id="priority"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                    >
                        <option value="High">高 (High) 🚨</option>
                        <option value="Medium">中 (Medium) ⚠️</option>
                        <option value="Low">低 (Low) 🟢</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="dueDate" className="block text-sm font-bold text-gray-700">期限</label>
                    <input
                        type="datetime-local"
                        id="dueDate"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
                {loading ? '追加中...' : 'タスクを追加'}
            </button>
        </form>
    )
}
