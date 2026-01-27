"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Camera, Printer, Eye, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TechnicianActionButton } from "./technician-action-button";
import { TakeRepairDialog } from "./take-repair-dialog";
import { RepairTimer } from "./repair-timer";
import { AssignmentModal } from "./assignment-modal";
import { AddImagesDialog } from "./add-images-dialog";
import { RepairDetailsDialog } from "./repair-details-dialog"; // Import Dialog
import { TransferRepairDialog } from "./transfer-repair-dialog";
import { printRepairTicket, printWarrantyTicket, printWetReport } from "@/lib/print-utils";
import { Share2 } from "lucide-react";

interface ActiveRepairsTableProps {
    repairs: any[];
    emptyMessage?: string;
    enableTakeover?: boolean;
    enableManagement?: boolean;
    enableImageUpload?: boolean;
    currentUserId?: string;
}

const statusColorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    slate: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
};

export function ActiveRepairsTable({
    repairs,
    emptyMessage = "No hay reparaciones activas.",
    enableTakeover = false,
    enableManagement = false,
    enableImageUpload = false,
    currentUserId = ""
}: ActiveRepairsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [takeoverRepair, setTakeoverRepair] = useState<any | null>(null);
    const [assignmentRepair, setAssignmentRepair] = useState<any | null>(null);
    const [imageUploadRepair, setImageUploadRepair] = useState<any | null>(null);
    const [viewDetailsRepair, setViewDetailsRepair] = useState<any | null>(null); // State for Details Dialog
    const [transferRepair, setTransferRepair] = useState<any | null>(null);

    const router = useRouter();

    const handlePrint = (repair: any) => {
        // Always print the repair ticket
        printRepairTicket(repair);

        // If status is "Entregado" (ID 10), also print warranty and wet report (if applicable)
        if (repair.statusId === 10 || repair.status?.id === 10 || repair.status?.name === "Entregado") {
            const repairStub = {
                ticketNumber: repair.ticketNumber,
                deviceBrand: repair.deviceBrand,
                deviceModel: repair.deviceModel,
                customer: { name: repair.customer.name },
                isWet: repair.isWet,
                branch: repair.branch
            };

            setTimeout(() => {
                console.log("Printing extra docs for delivered repair:", repair.ticketNumber);
                printWarrantyTicket(repairStub);

                if (repair.isWet) {
                    setTimeout(() => {
                        printWetReport(repairStub);
                    }, 1200);
                }
            }, 1000);
        }
    };

    const filteredRepairs = repairs.filter(repair => {
        const term = searchTerm.toLowerCase();
        return (
            repair.ticketNumber.toLowerCase().includes(term) ||
            repair.customer.name.toLowerCase().includes(term) ||
            (repair.customer.phone && repair.customer.phone.includes(term)) ||
            repair.deviceModel.toLowerCase().includes(term) ||
            repair.deviceBrand.toLowerCase().includes(term)
        );
    });

    if (!repairs || repairs.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-muted/10">
                <p className="text-muted-foreground font-medium">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por Ticket, Cliente o Dispositivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-12 text-lg" // Larger search bar for ease
                    />
                </div>
                <Button
                    variant="outline"
                    className="h-12 w-12 shrink-0"
                    onClick={() => router.refresh()}
                    title="Actualizar lista"
                >
                    <RefreshCcw className="h-5 w-5 text-muted-foreground" />
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-center w-[100px]">Ticket</TableHead>
                            <TableHead className="text-center w-[140px]">Entrega</TableHead>
                            <TableHead className="text-center w-[100px]">Tiempo Est.</TableHead>
                            <TableHead className="text-center">Cliente</TableHead>
                            <TableHead className="text-center">Dispositivo</TableHead>
                            <TableHead className="text-center w-[120px]">Técnico</TableHead>
                            <TableHead className="text-center w-[100px]">Precio</TableHead>
                            <TableHead className="text-center w-[120px]">Estado</TableHead>
                            {(enableTakeover || enableManagement || enableImageUpload) && <TableHead className="text-center w-[100px]">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRepairs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={(enableTakeover || enableManagement || enableImageUpload) ? 9 : 8} className="h-24 text-center">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRepairs.map((repair) => {
                                const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";
                                return (
                                    <TableRow key={repair.id} className="hover:bg-muted/10">
                                        <TableCell className={`text-center font-bold font-mono text-lg ${repair.isWet ? "text-blue-500 font-extrabold" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                                            {repair.ticketNumber}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                    {format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {repair.finishedAt && repair.startedAt ? (
                                                (() => {
                                                    const start = new Date(repair.startedAt).getTime();
                                                    const end = new Date(repair.finishedAt).getTime();
                                                    const diff = end - start;
                                                    let duration = "-";
                                                    if (diff > 0) {
                                                        const hours = Math.floor(diff / (1000 * 60 * 60));
                                                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                        duration = `${hours}h ${minutes}m`;
                                                        if (hours === 0) duration = `${minutes} min`;
                                                    }
                                                    return (
                                                        <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
                                                            {duration}
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                <RepairTimer
                                                    startedAt={repair.startedAt}
                                                    estimatedMinutes={repair.estimatedTime}
                                                    statusId={repair.statusId}
                                                    onAdd={enableManagement ? () => setAssignmentRepair(repair) : undefined}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-base">{repair.customer.name}</span>
                                                <span className="text-xs text-muted-foreground">{repair.customer.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-medium text-sm">{repair.deviceBrand} {repair.deviceModel}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px] block" title={repair.problemDescription}>
                                                    {repair.problemDescription}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                {repair.assignedTo ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                        {repair.assignedTo.name.split(' ')[0]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-base">
                                            {repair.estimatedPrice > 0 ? `$${repair.estimatedPrice.toLocaleString()}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`font-bold border ${colorClass}`}>
                                                {repair.status.name}
                                            </Badge>
                                        </TableCell>
                                        {(enableTakeover || enableManagement || enableImageUpload) && (
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">

                                                    {/* Detail Button (For all Users if Actions Enabled) */}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setViewDetailsRepair(repair)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                                        title="Ver Detalles y Notas"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    {enableTakeover && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setTakeoverRepair(repair)}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                        >
                                                            Retirar
                                                        </Button>
                                                    )}

                                                    {/* Add Images Button (Only if enabled and < 3 images) */}
                                                    {enableImageUpload && (!repair.deviceImages || repair.deviceImages.length < 3) && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setImageUploadRepair(repair)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            title="Agregar fotos"
                                                        >
                                                            <Camera className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* Reprint Ticket Button - Hide for Technicians if management enabled */}
                                                    {!enableManagement && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handlePrint(repair)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            title="Reimprimir Ticket"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* Transfer Button - Only for Technicians in process or waiting */}
                                                    {(enableManagement && repair.assignedUserId === currentUserId && [3, 7, 8, 9].includes(repair.statusId)) && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setTransferRepair(repair)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                                            title="Transferir a otro técnico"
                                                        >
                                                            <Share2 className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {enableManagement && (
                                                        <TechnicianActionButton
                                                            repair={repair}
                                                            currentUserId={currentUserId}
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <TakeRepairDialog
                isOpen={!!takeoverRepair}
                onClose={() => setTakeoverRepair(null)}
                repair={takeoverRepair}
                currentUserId={currentUserId}
            />

            {assignmentRepair && (
                <AssignmentModal
                    isOpen={!!assignmentRepair}
                    onClose={() => setAssignmentRepair(null)}
                    repair={assignmentRepair}
                    currentUserId={currentUserId}
                />
            )}

            {imageUploadRepair && (
                <AddImagesDialog
                    isOpen={!!imageUploadRepair}
                    onClose={() => setImageUploadRepair(null)}
                    repair={imageUploadRepair}
                />
            )}

            {viewDetailsRepair && (
                <RepairDetailsDialog
                    isOpen={!!viewDetailsRepair}
                    onClose={() => setViewDetailsRepair(null)}
                    repair={viewDetailsRepair}
                    currentUserId={currentUserId}
                    onAddPart={() => {
                        // Close details and open assignment
                        // Or keep details underneath? Better to close details or layer them?
                        // AssignmentModal is a Dialog, simpler to switch.
                        setAssignmentRepair(viewDetailsRepair);
                        // Optional: setViewDetailsRepair(null); // Keep active if we want to return to it?
                        // Let's close details to avoid stacking issues unless AssignmentModal handles it well.
                        // Actually, user flow: Details -> Add Part -> AssignmentModal -> Close -> Details?
                        // Simpler: Details -> Add Part (AssignmentModal opens on top)
                        // If AssignmentModal is z-indexed higher, it's fine.
                        // But let's close details for clarity, or just let them coexist.
                        // Let's close details to avoid confusion.
                        setViewDetailsRepair(null);
                    }}
                />
            )}

            {transferRepair && (
                <TransferRepairDialog
                    isOpen={!!transferRepair}
                    onClose={() => setTransferRepair(null)}
                    repair={transferRepair}
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
}
