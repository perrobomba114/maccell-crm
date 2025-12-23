"use strict";
"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReturnRequest {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    technicianNote: string | null;
    createdAt: Date;
    repair: {
        ticketNumber: string;
        customer: {
            name: string;
            phone: string;
        };
        status: {
            name: string;
        };
    };
}

export default function TechnicianReturnsClient({ returns }: { returns: ReturnRequest[] }) {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Mis Solicitudes de Devolución</h1>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="p-4 font-medium">Ticket</th>
                            <th className="p-4 font-medium">Cliente</th>
                            <th className="p-4 font-medium">Teléfono</th>
                            <th className="p-4 font-medium">Estado Reparación</th>
                            <th className="p-4 font-medium">Observación</th>
                            <th className="p-4 font-medium">Estado Solicitud</th>
                            <th className="p-4 font-medium">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {returns.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    No tienes solicitudes de devolución.
                                </td>
                            </tr>
                        ) : (
                            returns.map((req) => (
                                <tr key={req.id} className="hover:bg-muted/30">
                                    <td className="p-4 font-semibold">#{req.repair.ticketNumber}</td>
                                    <td className="p-4">{req.repair.customer.name}</td>
                                    <td className="p-4">{req.repair.customer.phone}</td>
                                    <td className="p-4">
                                        <Badge variant="outline">{req.repair.status.name}</Badge>
                                    </td>
                                    <td className="p-4 max-w-[200px] truncate" title={req.technicianNote || ""}>
                                        {req.technicianNote || "-"}
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {format(new Date(req.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDING":
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pendiente</Badge>;
        case "ACCEPTED":
            return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Aceptada</Badge>;
        case "REJECTED":
            return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Rechazada</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}
