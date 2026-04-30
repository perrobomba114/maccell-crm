import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Upload, FileBarChart, Plus } from "lucide-react";
import { Category } from "@prisma/client";

interface ProductsToolbarProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    selectedCategory: string;
    categories: Category[];
    handleCategoryChange: (val: string) => void;
    handleExport: () => void;
    handleImport: () => void;
    handleReport: () => void;
    handleCreate: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProductsToolbar({
    searchTerm, setSearchTerm, selectedCategory, categories, handleCategoryChange,
    handleExport, handleImport, handleReport, handleCreate, fileInputRef, handleFileChange
}: ProductsToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-2 w-full sm:w-auto flex-1">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" size="sm" onClick={handleExport}>
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
                    onChange={handleFileChange}
                />
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={handleReport}>
                    <FileBarChart className="mr-2 h-4 w-4" />
                    Informe
                </Button>
                <Button onClick={handleCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo
                </Button>
            </div>
        </div>
    );
}
