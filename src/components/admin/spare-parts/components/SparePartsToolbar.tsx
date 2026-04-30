"use client";

import { Search, Download, Upload, FileBarChart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SparePartForm } from "../spare-part-form";
import { BuyModal } from "../buy-modal";
import { Category } from "@prisma/client";
import React from "react";

interface SparePartsToolbarProps {
    searchTerm: string;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    handleImport: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleReport: () => void;
    onReplenishReport: () => void;
    categories: Category[];
    isCreateOpen: boolean;
    setIsCreateOpen: (open: boolean) => void;
}

export function SparePartsToolbar({
    searchTerm,
    handleSearchChange,
    onExport,
    handleImport,
    fileInputRef,
    onFileChange,
    handleReport,
    onReplenishReport,
    categories,
    isCreateOpen,
    setIsCreateOpen
}: SparePartsToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Input
                placeholder="Buscar por nombre, SKU o marca..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="max-w-md w-full"
            />

            <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" size="sm" onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={handleImport}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={onFileChange}
                />
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={handleReport}>
                    <FileBarChart className="mr-2 h-4 w-4" />
                    Informe
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={onReplenishReport}>
                    <FileBarChart className="mr-2 h-4 w-4" />
                    Reponer
                </Button>
                <BuyModal categories={categories} />

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Crear Nuevo Repuesto</DialogTitle>
                        </DialogHeader>
                        <SparePartForm
                            categories={categories}
                            onSuccess={() => setIsCreateOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
