import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// A pure public client that does not use cookies or attempt to refresh sessions.
// Useful for API routes that just need to read public data without user context.
export const createPublicClient = () => {
    return createSupabaseClient(
        supabaseUrl!,
        supabaseKey!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );
};
