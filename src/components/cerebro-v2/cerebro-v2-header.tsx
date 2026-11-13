"use client";

import { Button } from "@/components/ui/button";

import { Activity, BrainCircuit, ClipboardCheck, History, Plus } from "lucide-react";
import type { ChatSession } from "@/lib/cerebro-v2/chat-repository";
import type { CerebroRepairSummary } from "@/lib/cerebro-v2/repair-context";

type HeaderProps = {
    selectedRepair: CerebroRepairSummary | null;
    activeSession: ChatSession | null;
    health: "loading" | "healthy" | "degraded";
    healthDetails: string[];
    onCloseRepair: () => void;
    onChooseRepair: () => void;
    onHistory: () => void;
    onNewChat: () => void;
};

export function CerebroV2Header(props: HeaderProps) {
    return <header className="bench-bar">
        <div className="bench-wordmark"><BrainCircuit aria-hidden="true" size={30}/> Cerebro</div>
        <nav aria-label="Herramientas del banco">
            <Button variant="outline" size="sm" onClick={props.onHistory}><History size={16}/>Historial</Button>
            {props.selectedRepair && <Button variant="outline" size="sm" onClick={props.onNewChat}><Plus size={16}/>Nueva consulta</Button>}
            {(props.selectedRepair || props.activeSession?.repairId) && <Button variant="outline" size="sm" onClick={props.onCloseRepair}><ClipboardCheck size={16}/>Registrar cierre técnico</Button>}
            <details><summary aria-label="Estado del servicio"><Activity size={17}/></summary>
                <div><strong>{props.health === "healthy" ? "Disponible" : props.health === "loading" ? "Verificando" : "Disponibilidad parcial"}</strong>{props.healthDetails.map(detail => <p key={detail}>{detail}</p>)}</div>
            </details>
        </nav>
    </header>;
}
