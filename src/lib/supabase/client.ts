
import { createBrowserClient } from '@supabase/ssr'

// Fallback to dummy values during build to prevent crash if env vars are missing
// Cloudflare Pages build might not expose these to the Node process in the same way,
// but they should be inlined by Next.js if present.
export const createClient = () =>
    createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
    )
