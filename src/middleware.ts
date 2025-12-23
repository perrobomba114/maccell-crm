import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Exclude static files and Next.js internals
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".") // Exclude files with extensions
    ) {
        return NextResponse.next();
    }

    //  Get session role from cookie
    const sessionRole = request.cookies.get("session_role")?.value;

    // Public routes (login)
    if (pathname.startsWith("/login")) {
        // If already logged in, redirect to appropriate dashboard
        if (sessionRole) {
            return NextResponse.redirect(
                new URL(`/${sessionRole.toLowerCase()}/dashboard`, request.url)
            );
        }
        return NextResponse.next();
    }

    // Protected routes - require authentication
    if (
        pathname.startsWith("/admin") ||
        pathname.startsWith("/vendor") ||
        pathname.startsWith("/technician")
    ) {
        // Not logged in - redirect to login
        if (!sessionRole) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // ADMIN access control
        if (pathname.startsWith("/admin") && sessionRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // VENDOR access control (ADMIN can also access)
        // VENDOR access control (ADMIN can also access)
        if (
            pathname.startsWith("/vendor") &&
            sessionRole !== "VENDOR" &&
            sessionRole !== "ADMIN"
        ) {
            // Allow TECHNICIAN to access /vendor/stock
            if (sessionRole === "TECHNICIAN" && pathname.startsWith("/vendor/stock")) {
                // Allowed
            } else {
                return NextResponse.redirect(
                    new URL(`/${sessionRole.toLowerCase()}/dashboard`, request.url)
                );
            }
        }

        // TECHNICIAN access control (ADMIN can also access)
        if (
            pathname.startsWith("/technician") &&
            sessionRole !== "TECHNICIAN" &&
            sessionRole !== "ADMIN"
        ) {
            return NextResponse.redirect(
                new URL(`/${sessionRole.toLowerCase()}/dashboard`, request.url)
            );
        }

        return NextResponse.next();
    }

    // Root path - redirect based on role or to login
    if (pathname === "/") {
        if (sessionRole) {
            return NextResponse.redirect(
                new URL(`/${sessionRole.toLowerCase()}/dashboard`, request.url)
            );
        }
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
