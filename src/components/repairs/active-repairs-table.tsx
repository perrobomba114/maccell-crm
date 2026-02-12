"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { AddPartDialog } from "./add-part-dialog";

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
    indigo: "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700", // Tomado por Técnico - Stronger
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    slate: "bg-slate-800 text-white border-slate-900 hover:bg-slate-900", // Entregado - Stronger
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
    const [viewDetailsRepair, setViewDetailsRepair] = useState<any | null>(null);
    const [transferRepair, setTransferRepair] = useState<any | null>(null);
    const [addPartRepair, setAddPartRepair] = useState<any | null>(null);

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

    // Sort repairs by promisedAt (earliest first) so technicians prioritize urgent deliveries
    const sortedRepairs = useMemo(() => {
        return [...repairs].sort((a, b) => {
            const dateA = a.promisedAt ? new Date(a.promisedAt).getTime() : Infinity;
            const dateB = b.promisedAt ? new Date(b.promisedAt).getTime() : Infinity;
            return dateA - dateB;
        });
    }, [repairs]);

    const filteredRepairs = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
        return sortedRepairs.filter(repair => {
            const searchableFields = [
                repair.ticketNumber,
                repair.customer.name,
                repair.customer.phone || "",
                repair.deviceBrand,
                repair.deviceModel,
            ].map(f => f.toLowerCase());

            return searchWords.length === 0 || searchWords.every(word =>
                searchableFields.some(field => field.includes(word))
            );
        });
    }, [sortedRepairs, searchTerm]);

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
                    <Label htmlFor="active-repairs-search" className="sr-only">Buscar reparaciones activas</Label>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="active-repairs-search"
                        name="active-repairs-search"
                        aria-label="Buscar por Ticket, Cliente o Dispositivo"
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
                            <TableHead className="text-center w-[50px] px-1">Pos.</TableHead>
                            <TableHead className="text-center w-[90px] px-1">Ticket</TableHead>
                            <TableHead className="text-center w-[120px] px-1">Entrega</TableHead>
                            <TableHead className="text-center w-[90px] px-1 whitespace-nowrap">Est.</TableHead>
                            <TableHead className="text-center px-2">Cliente</TableHead>
                            <TableHead className="text-center px-2">Dispositivo</TableHead>
                            <TableHead className="text-center w-[100px] px-1">Técnico</TableHead>
                            <TableHead className="text-center w-[90px] px-1">Precio</TableHead>
                            <TableHead className="text-center w-[110px] px-1">Estado</TableHead>
                            {(enableTakeover || enableManagement || enableImageUpload) && <TableHead className="text-center w-[130px] px-1">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRepairs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={(enableTakeover || enableManagement || enableImageUpload) ? 10 : 9} className="h-24 text-center">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRepairs.map((repair, index) => {
                                const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";
                                const position = index + 1;
                                return (
                                    <TableRow key={repair.id} className="hover:bg-muted/10">
                                        <TableCell className="text-center px-1">
                                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs ${position <= 3
                                                ? "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
                                                : position <= 6
                                                    ? "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
                                                    : "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                                                }`}>
                                                {position}
                                            </span>
                                        </TableCell>
                                        <TableCell className={`text-center font-bold font-mono text-sm px-1 ${repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                                            {repair.ticketNumber}
                                        </TableCell>
                                        <TableCell className="text-center px-1">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                                                    {format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-1">
                                            <div className="flex items-center justify-center h-7">
                                                {repair.finishedAt && repair.startedAt ? (
                                                    (() => {
                                                        const start = new Date(repair.startedAt).getTime();
                                                        const end = new Date(repair.finishedAt).getTime();
                                                        const diff = end - start;
                                                        let duration = "-";
                                                        if (diff > 0) {
                                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                            duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                                                        }
                                                        return (
                                                            <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums">
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
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-2">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-sm whitespace-nowrap">{repair.customer.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{repair.customer.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-2 max-w-[180px]">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-sm whitespace-normal">{repair.deviceBrand} {repair.deviceModel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center w-[100px] px-1">
                                            <div className="flex flex-col items-center justify-center">
                                                {repair.assignedTo ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px] py-0">
                                                        {repair.assignedTo.name?.split(' ')[0]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-[10px] italic">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-sm px-1 whitespace-nowrap">
                                            {repair.estimatedPrice > 0 ? `$${repair.estimatedPrice.toLocaleString()}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-center px-1">
                                            <Badge variant="outline" className={`font-bold border text-[10px] py-0 uppercase ${colorClass}`}>
                                                {repair.status.name}
                                            </Badge>
                                        </TableCell>
                                        {(enableTakeover || enableManagement || enableImageUpload) && (
                                            <TableCell className="text-center px-1">
                                                <div className="flex items-center justify-start gap-1 h-7 pl-6">
                                                    <div className="w-8 flex justify-center shrink-0">
                                                        <Button
                                                            size="icon-xs"
                                                            variant="ghost"
                                                            onClick={() => setViewDetailsRepair(repair)}
                                                            className="text-muted-foreground hover:text-blue-500"
                                                            title="Ver Detalles"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>

                                                    {enableTakeover && (
                                                        <Button
                                                            size="xs"
                                                            onClick={() => setTakeoverRepair(repair)}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-[85px] justify-center px-2"
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                <span className="truncate">Retirar</span>
                                                            </div>
                                                        </Button>
                                                    )}

                                                    {enableImageUpload && (!repair.deviceImages || repair.deviceImages.length < 3) && (
                                                        <Button
                                                            size="icon-xs"
                                                            variant="ghost"
                                                            onClick={() => setImageUploadRepair(repair)}
                                                            className="text-muted-foreground hover:text-primary"
                                                            title="Fotos"
                                                        >
                                                            <Camera className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}

                                                    {!enableManagement && (
                                                        <Button
                                                            size="icon-xs"
                                                            variant="ghost"
                                                            onClick={() => handlePrint(repair)}
                                                            className="text-muted-foreground hover:text-primary"
                                                            title="Imprimir"
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}

                                                    {enableManagement && (
                                                        <>
                                                            <div className="flex gap-1">
                                                                <TechnicianActionButton
                                                                    repair={repair}
                                                                    currentUserId={currentUserId}
                                                                />
                                                                <Button
                                                                    size="icon-xs"
                                                                    variant="ghost"
                                                                    onClick={() => setTransferRepair(repair)}
                                                                    className="text-muted-foreground hover:text-blue-500"
                                                                    title="Transferir"
                                                                >
                                                                    <Share2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </>
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
                        // Switch to the dedicated Add Part dialog
                        setAddPartRepair(viewDetailsRepair);
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

            {addPartRepair && (
                <AddPartDialog
                    isOpen={!!addPartRepair}
                    onClose={() => setAddPartRepair(null)}
                    repair={addPartRepair}
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
}
