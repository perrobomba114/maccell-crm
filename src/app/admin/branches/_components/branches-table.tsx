"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Building2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateBranchDialog } from "./create-branch-dialog";
import { EditBranchDialog } from "./edit-branch-dialog";
import { DeleteBranchDialog } from "./delete-branch-dialog";

interface Branch {
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    imageUrl: string | null;
    createdAt: Date;
}

interface BranchesTableProps {
    branches: Branch[];
}

export function BranchesTable({ branches }: BranchesTableProps) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    const getBranchColor = (branchName: string) => {
        const name = branchName.toLowerCase();
        if (name.includes("maccell 1")) return "bg-blue-600 text-white hover:bg-blue-700 border-transparent shadow-sm";
        if (name.includes("maccell 2")) return "bg-violet-600 text-white hover:bg-violet-700 border-transparent shadow-sm";
        if (name.includes("maccell 3")) return "bg-orange-600 text-white hover:bg-orange-700 border-transparent shadow-sm";
        if (name.includes("8 bit")) return "bg-pink-600 text-white hover:bg-pink-700 border-transparent shadow-sm";
        return "bg-slate-600 text-white hover:bg-slate-700 border-transparent shadow-sm";
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Sucursales del Sistema</h3>
                        <p className="text-sm text-muted-foreground">
                            Gestiona las sucursales de la empresa
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Building2 className="h-4 w-4 mr-2" />
                        Agregar Sucursal
                    </Button>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Imagen</TableHead>
                                <TableHead className="text-center">Código</TableHead>
                                <TableHead className="text-center">Nombre</TableHead>
                                <TableHead className="text-center">Dirección</TableHead>
                                <TableHead className="text-center">Teléfono</TableHead>
                                <TableHead className="text-center">Fecha de Creación</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        No hay sucursales registradas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                branches.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {branch.imageUrl ? (
                                                    <img
                                                        src={branch.imageUrl}
                                                        alt={branch.name}
                                                        className="w-12 h-12 object-cover rounded-md border"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-md border flex items-center justify-center">
                                                        <Building2 className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-medium">
                                            {branch.code}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            <Badge className={cn("rounded-md shadow-sm font-medium border-0", getBranchColor(branch.name))}>
                                                {branch.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {branch.address || (
                                                <span className="text-muted-foreground italic">
                                                    Sin dirección
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {branch.phone ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    {branch.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic">
                                                    Sin teléfono
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {new Date(branch.createdAt).toLocaleDateString("es-ES")}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedBranch(branch);
                                                        setEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedBranch(branch);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CreateBranchDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />

            <EditBranchDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                branch={selectedBranch}
            />

            <DeleteBranchDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                branch={selectedBranch}
            />
        </>
    );
}
