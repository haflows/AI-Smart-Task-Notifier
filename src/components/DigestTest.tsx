
'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

export default function DigestTest() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleSendDigest = async () => {
        if (!email) {
            setMessage('メールアドレスを入力してください')
            return
        }

        setLoading(true)
        setMessage('AIがタスクを分析して要約中...')

        try {
            const response = await fetch('/api/send-digest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (response.ok) {
                if (data.message === 'No pending tasks. No email sent.') {
                    setMessage('ℹ️ 未完了のタスクがありませんでした。')
                } else {
                    setMessage('✅ 要約メールを送信しました！確認してください。')
                }
            } else {
                setMessage(`❌ 送信失敗: ${data.error || '不明なエラー'}`)
            }
        } catch (error) {
            console.error(error)
            setMessage('❌ エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 bg-purple-50 rounded-lg mt-8 border border-purple-100">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5" />
                AI定時通知テスト (Daily Digest)
            </h3>
            <p className="text-sm text-purple-700 mb-3">
                現在の未完了タスクをAIが分析・要約して、日報メールを作成・送信します。
            </p>
            <div className="flex gap-2">
                <input
                    type="email"
                    placeholder="宛先メールアドレス"
                    className="flex-1 p-2 border rounded text-gray-900 bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button
                    onClick={handleSendDigest}
                    disabled={loading}
                    className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-purple-700 transition-colors font-bold"
                >
                    {loading ? 'AI生成中...' : 'メールで要約を送る'}
                </button>
            </div>

            <div className="mt-4 pt-4 border-t border-purple-200">
                <h4 className="text-sm font-bold text-purple-900 mb-2">LINE通知テスト</h4>
                <button
                    onClick={async () => {
                        setLoading(true);
                        setMessage('LINE送信中...');
                        try {
                            const res = await fetch('/api/send-line', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: 'これはLINE通知のテストです！\n正常に連携されています🎉' })
                            });
                            const data = await res.json();
                            if (res.ok) setMessage('✅ LINEにメッセージを送信しました！');
                            else setMessage(`❌ LINE送信失敗: ${data.error || JSON.stringify(data)}`);
                        } catch (e) {
                            console.error(e);
                            setMessage(`❌ エラーが発生しました: ${(e as Error).message}`);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="bg-[#06C755] text-white px-4 py-2 rounded disabled:opacity-50 hover:opacity-90 transition-colors font-bold w-full sm:w-auto"
                >
                    LINEにテスト送信
                </button>
            </div>


            <div className="mt-4 pt-4 border-t border-purple-200">
                <h4 className="text-sm font-bold text-purple-900 mb-2">自動実行 (Vercel Cron)</h4>
                <p className="text-xs text-gray-600 mb-2">
                    Vercelの本番環境にデプロイされている場合、毎日 <strong>15:00 (JST)</strong> に自動で通知が送信されます。
                    <br />
                    (ローカル環境やPCがスリープ中の場合は実行されません)
                    <br />
                    手動実行テスト: <a href="https://cron-job.org" target="_blank" className="underline text-blue-600">cron-job.org</a> 等から <code>/api/send-digest?mode=batch</code> を叩いてください
                </p>
                <button
                    onClick={async () => {
                        if (!confirm('全ユーザーに送信しますか？(Batch Mode)')) return;
                        setLoading(true);
                        setMessage('全ユーザーに送信中...');
                        try {
                            const res = await fetch('/api/send-digest?mode=batch', { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) setMessage(`✅ 送信完了: ${JSON.stringify(data.results)}`);
                            else setMessage(`❌ 送信失敗: ${data.error}`);
                        } catch (e) {
                            setMessage(`❌ エラー: ${(e as Error).message}`);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="mt-2 text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                >
                    🔄 全ユーザー送信テスト (管理者用)
                </button>
            </div>

            {message && <p className="mt-2 text-sm font-medium text-gray-800 break-all">{message}</p>}
        </div>
    )
}
