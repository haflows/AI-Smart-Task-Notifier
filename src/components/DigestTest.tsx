
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

export default function DigestTest() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [lineUserId, setLineUserId] = useState('')

    // Fetch LINE ID on load (if using Supabase client in this component, or just rely on user input if we had one)
    // Since this is a test component, let's try to fetch it if we can, or just send valid message.
    // For simplicity, we are inside a client component. Let's create a client.
    const supabase = createClient()

    useEffect(() => {
        const getLineId = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from('profiles').select('line_user_id').eq('id', user.id).single()
                if (data?.line_user_id) setLineUserId(data.line_user_id)
            }
        }
        getLineId()
    }, [])

    // ... handleSendDigest ...

    return (
        <div className="p-4 bg-purple-50 rounded-lg mt-8 border border-purple-100">
            {/* ... Digest Section ... */}

            <div className="mt-4 pt-4 border-t border-purple-200">
                <h4 className="text-sm font-bold text-purple-900 mb-2">LINE通知テスト</h4>
                <div className="text-xs text-purple-800 mb-2">
                    宛先: {lineUserId ? lineUserId : '(未設定: /settings で設定してください)'}
                </div>
                <button
                    onClick={async () => {
                        if (!lineUserId) {
                            setMessage('❌ LINE IDが設定されていません。設定画面で保存してください。');
                            return;
                        }
                        setLoading(true);
                        setMessage('LINE送信中...');
                        try {
                            const res = await fetch('/api/send-line', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    message: 'これはLINE通知のテストです！\n正常に連携されています🎉',
                                    to: lineUserId // Send the ID explicitly
                                })
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
                    Vercelの本番環境にデプロイされている場合、毎日 <strong>18:30 (JST)</strong> に自動で通知が送信されます。
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
