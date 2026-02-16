'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body className="p-10">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Critical Server Error</h2>
                <div className="bg-gray-100 p-4 rounded border border-gray-300 overflow-auto">
                    <p className="font-bold">Message:</p>
                    <pre className="text-red-500 whitespace-pre-wrap">{error.message}</pre>

                    <p className="font-bold mt-4">Digest:</p>
                    <pre className="text-gray-700">{error.digest}</pre>

                    <p className="font-bold mt-4">Stack:</p>
                    <pre className="text-gray-500 text-sm whitespace-pre-wrap">{error.stack}</pre>
                </div>
                <button
                    onClick={() => reset()}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Try again
                </button>
            </body>
        </html>
    )
}
