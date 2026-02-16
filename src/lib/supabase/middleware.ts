
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    try {
        // DEBUG: Check for environment variables
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            return new NextResponse(
                JSON.stringify({
                    error: 'CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_URL is missing in runtime environment.',
                    env_check: {
                        has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                        has_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                        node_env: process.env.NODE_ENV
                    }
                }),
                { status: 500, headers: { 'content-type': 'application/json' } }
            );
        }

        let supabaseResponse = NextResponse.next({
            request,
        })

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            request.cookies.set(name, value)
                        )
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        // Do not run code between createServerClient and
        // supabase.auth.getUser().
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (
            !user &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        return supabaseResponse

    } catch (error) {
        return new NextResponse(
            JSON.stringify({
                error: 'Middleware Error',
                message: (error as Error).message,
                stack: (error as Error).stack,
            }),
            { status: 500, headers: { 'content-type': 'application/json' } }
        )
    }
}
