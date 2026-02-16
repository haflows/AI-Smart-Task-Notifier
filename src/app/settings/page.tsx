
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [lineUserId, setLineUserId] = useState('')
    const [message, setMessage] = useState('')
    const supabase = createClient()

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('line_user_id')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setLineUserId(data.line_user_id || '')
                }
            }
            setLoading(false)
        }
        fetchProfile()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            setMessage('エラー: ログインしていません')
            setSaving(false)
            return
        }

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                line_user_id: lineUserId,
                updated_at: new Date().toISOString(),
            })

        if (error) {
            setMessage(`エラー: ${error.message}`)
        } else {
            setMessage('✅ 設定を保存しました')
        }
        setSaving(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        タスク一覧に戻る
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-600 hover:text-red-800 hover:underline"
                    >
                        ログアウト
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">ユーザー設定</h1>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                LINE User ID
                            </label>
                            <div className="text-xs text-gray-500 mb-2">
                                <p>自分のUser IDを確認する方法:</p>
                                <ul className="list-disc list-inside ml-2 space-y-1">
                                    <li>公式アカウントを友だち追加</li>
                                    <li>リッチメニューまたは適当なメッセージを送ると、Webhook経由でログにIDが表示されます(開発者向け)</li>
                                    <li>または、ID確認用のボットなどを使用してください</li>
                                </ul>
                            </div>
                            <input
                                type="text"
                                value={lineUserId}
                                onChange={(e) => setLineUserId(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-3 border text-gray-900"
                                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.includes('エラー')
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-green-50 text-green-600'
                                }`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            {saving ? '保存中...' : '設定を保存'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
