import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const updateSession = async (request: NextRequest) => {
    // Create an unmodified response
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        supabaseUrl!,
        supabaseKey!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        },
    );

    // Refresh session if needed
    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // Protect staff routes
    if (path.startsWith('/staff') && !path.startsWith('/staff/login')) {
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = '/staff/login';
            return NextResponse.redirect(url);
        }

        // Check if user is active staff or admin (profiles table uses id directly)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_active) {
            const url = request.nextUrl.clone();
            url.pathname = '/staff/login';
            return NextResponse.redirect(url);
        }
    }

    // Protect admin routes
    if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            return NextResponse.redirect(url);
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_active || profile.role !== 'admin') {
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
};

