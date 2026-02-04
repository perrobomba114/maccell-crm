"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export function VersionUpdater() {
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);

    useEffect(() => {
        // Function to check version
        const checkVersion = async () => {
            try {
                const res = await fetch("/api/system/version", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                const serverVersion = data.version;

                if (serverVersion === 'dev') return; // Don't auto-reload in dev

                if (!currentVersion) {
                    // First load, just set it
                    setCurrentVersion(serverVersion);
                } else if (currentVersion !== serverVersion) {
                    // Version Mismatch!
                    console.log(`[VersionUpdater] New version detected: ${serverVersion} (Current: ${currentVersion})`);

                    toast.info("Actualización disponible. Recargando sistema...", {
                        duration: 5000,
                        icon: "🔄"
                    });

                    // Give user 2 seconds to see the toast then reload
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            } catch (err) {
                console.error("Failed to check version", err);
            }
        };

        // Check immediately on mount
        checkVersion();

        // Check every 60 seconds
        const interval = setInterval(checkVersion, 60 * 1000);

        return () => clearInterval(interval);
    }, [currentVersion]);

    return null; // Invisible component
}
