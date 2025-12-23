"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Role } from "@prisma/client";
import { Pencil, Trash2 } from "lucide-react";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    branchId: string | null;
    createdAt: Date;
    branch: {
        id: string;
        name: string;
        code: string;
    } | null;
}

interface UsersTableProps {
    users: User[];
    branches: Array<{ id: string; name: string; code: string }>;
}

export function UsersTable({ users, branches }: UsersTableProps) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const getRoleBadgeVariant = (role: Role) => {
        switch (role) {
            case "ADMIN":
                return "bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm";
            case "VENDOR":
                return "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-sm";
            case "TECHNICIAN":
                return "bg-amber-600 text-white hover:bg-amber-700 border-transparent shadow-sm";
            default:
                return "secondary";
        }
    };

    const getRoleLabel = (role: Role) => {
        switch (role) {
            case "ADMIN":
                return "Administrador";
            case "VENDOR":
                return "Vendedor";
            case "TECHNICIAN":
                return "Técnico";
            default:
                return role;
        }
    };

    const getBranchColor = (branchName: string) => {
        const name = branchName.toLowerCase();
        if (name.includes("maccell 1")) return "bg-blue-600 text-white hover:bg-blue-700 border-transparent shadow-sm";
        if (name.includes("maccell 2")) return "bg-violet-600 text-white hover:bg-violet-700 border-transparent shadow-sm";
        if (name.includes("maccell 3")) return "bg-orange-600 text-white hover:bg-orange-700 border-transparent shadow-sm";
        if (name.includes("8 bit")) return "bg-pink-600 text-white hover:bg-pink-700 border-transparent shadow-sm";
        return "bg-slate-600 text-white hover:bg-slate-700 border-transparent shadow-sm";
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Usuarios del Sistema</h3>
                        <p className="text-sm text-muted-foreground">
                            Gestiona los usuarios y sus permisos
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        Agregar Usuario
                    </Button>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Nombre</TableHead>
                                <TableHead className="hidden md:table-cell text-center">Email</TableHead>
                                <TableHead className="text-center">Rol</TableHead>
                                <TableHead className="text-center">Sucursal</TableHead>
                                <TableHead className="text-center">Fecha de Creación</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No hay usuarios registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                                    <AvatarFallback className={cn(
                                                        "text-xs font-bold text-white",
                                                        user.role === "ADMIN" ? "bg-indigo-600" :
                                                            user.role === "TECHNICIAN" ? "bg-amber-600" :
                                                                "bg-emerald-600"
                                                    )}>
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium">{user.name}</span>
                                                    <span className="text-xs text-muted-foreground hidden sm:inline-block md:hidden">{user.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-center">{user.email}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn("rounded-md shadow-sm font-medium", getRoleBadgeVariant(user.role))}>
                                                {getRoleLabel(user.role)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {user.branch ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn("rounded-md shadow-sm font-medium border-0", getBranchColor(user.branch.name))}
                                                >
                                                    {user.branch.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm italic">Sin Asignar</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-muted-foreground text-sm">
                                                {new Date(user.createdAt).toLocaleDateString("es-ES", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
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

            <CreateUserDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                branches={branches}
            />

            <EditUserDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                user={selectedUser}
                branches={branches}
            />

            <DeleteUserDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                user={selectedUser}
            />
        </>
    );
}
