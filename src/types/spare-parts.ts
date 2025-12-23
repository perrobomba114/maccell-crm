
import { SparePart, Category } from "@prisma/client";

export interface SparePartWithCategory extends SparePart {
    category: Category | null;
}

export type SparePartCreateInput = {
    name: string;
    sku: string;
    brand: string;
    categoryId: string;
    stockLocal: number;
    stockDepot: number;
    maxStockLocal: number; // "Cantidad Maxima"
    priceUsd: number;
    pricePos: number;
};

export type SparePartUpdateInput = Partial<SparePartCreateInput> & {
    priceArg?: number;
    pricePos?: number;
};

export type StockUpdateInput = {
    stockLocal?: number;
    stockDepot?: number;
};
