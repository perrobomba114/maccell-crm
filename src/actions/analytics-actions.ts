"use server";

import { db } from "@/lib/db";

export async function getBestSellingProducts(branchId: string, limit: number = 8) {
    try {
        // Group by productId and count sales
        const bestSellers = await db.saleItem.groupBy({
            by: ["productId"],
            where: {
                sale: {
                    branchId: branchId
                },
                productId: {
                    not: null
                }
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: "desc"
                }
            },
            take: limit
        });

        if (bestSellers.length === 0) {
            return [];
        }

        // Fetch product details efficiently
        const productIds = bestSellers.filter(b => b.productId !== null).map(b => b.productId!);
        const products = await db.product.findMany({
            where: {
                id: {
                    in: productIds
                }
            },
            include: {
                stock: {
                    where: {
                        branchId: branchId
                    }
                }
            }
        });

        // Map and sort to preserve order from groupBy (which is lost in findMany)
        const sortedProducts = bestSellers.map(bs => {
            const product = products.find(p => p.id === bs.productId);
            if (!product) return null;

            return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                stock: product.stock[0]?.quantity || 0,
                soldCount: bs._sum.quantity || 0
            };
        }).filter(p => p !== null);

        return sortedProducts;
    } catch (error) {
        console.error("Error fetching best sellers:", error);
        return [];
    }
}
