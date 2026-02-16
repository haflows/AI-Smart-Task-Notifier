
'use client'

import { useState } from 'react'

export default function EmailTest() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleSendEmail = async () => {
        if (!email) {
            setMessage('メールアドレスを入力してください')
            return
        }

        setLoading(true)
        setMessage('送信中...')

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: email,
                    subject: 'Test Notification from Task Notifier',
                    html: '<p>This is a test notification from your <strong>Task Notifier</strong> app!</p><p>通知テスト成功です🎉</p>',
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setMessage('✅ 送信成功！メールを確認してください。')
            } else {
                setMessage(`❌ 送信失敗: ${data.error?.message || JSON.stringify(data)}`)
            }
        } catch (error) {
            console.error(error)
            setMessage(`❌ エラーが発生しました: ${(error as Error).message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 bg-gray-100 rounded-lg mt-8">
            <h3 className="font-bold mb-2">📩 通知テスト</h3>
            <div className="flex gap-2">
                <input
                    type="email"
                    placeholder="宛先メールアドレス (あなたのメド)"
                    className="flex-1 p-2 border rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button
                    onClick={handleSendEmail}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                    {loading ? '送信中...' : 'テスト送信'}
                </button>
            </div>
            {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
    )
}
