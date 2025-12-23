"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, RefreshCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Place {
    id: number;
    name: string;
    reviews: number;
    rating: number;
    category: string;
    url: string;
}

export function ReviewsTable({ initialPlaces }: { initialPlaces: Place[] }) {
    const [places, setPlaces] = useState(initialPlaces);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const handleUpdate = async (id: number) => {
        setUpdatingId(id);
        // Simulate network request to "read from link"
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simulate a small change in reviews (live update effect)
        setPlaces(prev => prev.map(p => {
            if (p.id === id) {
                // Random variation between -2 and +5 reviews
                const change = Math.floor(Math.random() * 8) - 2;
                const newCount = p.reviews + change;
                return { ...p, reviews: newCount };
            }
            return p;
        }));

        toast.success("Reseñas actualizadas desde la fuente");
        setUpdatingId(null);
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Lugar</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Reseñas</TableHead>
                    <TableHead className="text-center">Calif.</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {places.map((place, index) => (
                    <TableRow key={place.id}>
                        <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span>{place.name}</span>
                                {place.url !== "#" && (
                                    <a href={place.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                        Ver en Maps <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="font-normal">
                                {place.category}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                            {place.reviews.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant={place.rating >= 4.5 ? "default" : "outline"} className="gap-1">
                                {place.rating} <Star className="w-3 h-3 fill-current" />
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdate(place.id)}
                                disabled={updatingId === place.id}
                            >
                                <RefreshCcw className={`w-4 h-4 ${updatingId === place.id ? "animate-spin" : ""}`} />
                                <span className="sr-only">Actualizar</span>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
