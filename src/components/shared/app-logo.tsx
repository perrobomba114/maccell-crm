"use client";

import { Smartphone } from "lucide-react";
import Link from "next/link";

export function AppLogo() {
    return (
        <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg group-hover:shadow-xl transition-shadow">
                <Smartphone className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                MacCell
            </span>
        </Link>
    );
}
