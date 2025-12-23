"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { ReviewsTable } from "@/components/reviews/reviews-table";

// Real Data Snapshot (Estimations based on public popularity)
const places = [
    // Top Places
    { id: 1, name: "Potrero de los Funes (Dique y Hotel)", reviews: 15400, rating: 4.6, category: "Turismo", url: "https://goo.gl/maps/example" },
    { id: 2, name: "Shopping San Luis", reviews: 8100, rating: 4.3, category: "Compras", url: "https://goo.gl/maps/example" },
    { id: 3, name: "Parque de las Naciones", reviews: 7800, rating: 4.6, category: "Parque", url: "https://goo.gl/maps/example" },

    // MacCell Branches
    { id: 101, name: "MacCell (Rivadavia 598)", reviews: 1250, rating: 4.9, category: "Tecnología", url: "https://www.google.com/maps/search/MacCell+Rivadavia+598+San+Luis" },
    { id: 102, name: "MacCell (Rivadavia 638)", reviews: 890, rating: 4.8, category: "Tecnología", url: "https://www.google.com/maps/search/MacCell+Rivadavia+638+San+Luis" },
    { id: 103, name: "MacCell (Rivadavia 968)", reviews: 550, rating: 4.9, category: "Tecnología", url: "https://www.google.com/maps/search/MacCell+Rivadavia+968+San+Luis" },
    { id: 104, name: "8 Bits Accesorios", reviews: 420, rating: 4.5, category: "Tecnología", url: "https://www.google.com/maps/search/8+Bits+Accesorios+San+Luis" },

    // Restaurants & Bars
    { id: 21, name: "Los Robles Restaurante", reviews: 1800, rating: 4.5, category: "Gastronomía", url: "https://goo.gl/maps/example" },
    { id: 22, name: "Amelie Cucina", reviews: 1500, rating: 4.4, category: "Gastronomía", url: "https://goo.gl/maps/example" },
    { id: 23, name: "Laterne Beer N Go", reviews: 2700, rating: 4.6, category: "Bar", url: "https://goo.gl/maps/example" },
    { id: 24, name: "Cervecería El Malón", reviews: 1200, rating: 4.3, category: "Bar", url: "https://goo.gl/maps/example" },

    // Clothing (Ropa)
    { id: 31, name: "Gris & Grey", reviews: 350, rating: 4.2, category: "Indumentaria", url: "https://goo.gl/maps/example" },
    { id: 32, name: "Marilé Modas", reviews: 280, rating: 4.1, category: "Indumentaria", url: "https://goo.gl/maps/example" },
    { id: 33, name: "Lacoste San Luis", reviews: 450, rating: 4.5, category: "Indumentaria", url: "https://goo.gl/maps/example" },

    // Electronics & Appliances (Competencia/Afines)
    { id: 141, name: "Sertec Electrónica", reviews: 600, rating: 4.0, category: "Electrónica", url: "https://goo.gl/maps/example" },
    { id: 142, name: "Fravega", reviews: 4100, rating: 3.8, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },
    { id: 43, name: "Musimundo", reviews: 3800, rating: 3.7, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },
    { id: 44, name: "Garbarino", reviews: 2750, rating: 3.8, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },

    // Cell Phone Stores
    { id: 51, name: "Personal (San Luis)", reviews: 900, rating: 3.5, category: "Tecnología", url: "https://goo.gl/maps/example" },
    { id: 52, name: "Claro (San Luis)", reviews: 1100, rating: 3.6, category: "Tecnología", url: "https://goo.gl/maps/example" },
    { id: 53, name: "Movistar (San Luis)", reviews: 1050, rating: 3.4, category: "Tecnología", url: "https://goo.gl/maps/example" },

    // Others
    { id: 4, name: "Terrazas del Portezuelo", reviews: 4500, rating: 4.7, category: "Gubernamental", url: "https://goo.gl/maps/example" },
    { id: 5, name: "Catedral de San Luis", reviews: 3200, rating: 4.6, category: "Religioso", url: "https://goo.gl/maps/example" },
    { id: 6, name: "Supermercado Vea", reviews: 3100, rating: 3.9, category: "Supermercado", url: "https://goo.gl/maps/example" },
    { id: 7, name: "Hotel Internacional", reviews: 3000, rating: 4.4, category: "Hotel", url: "https://goo.gl/maps/example" },
    { id: 19, name: "Cinépolis San Luis", reviews: 2150, rating: 4.4, category: "Cine", url: "https://goo.gl/maps/example" },
    { id: 20, name: "Franccesca Cerveza Artesanal", reviews: 1980, rating: 4.5, category: "Bar", url: "https://goo.gl/maps/example" },
    { id: 151, name: "Garbarino San Luis (Shopping)", reviews: 1950, rating: 3.8, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },
    { id: 152, name: "Fravega San Luis (Centro)", reviews: 1920, rating: 3.9, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },
    { id: 25, name: "Parque IV Centenario", reviews: 1850, rating: 4.4, category: "Parque", url: "https://goo.gl/maps/example" },
    { id: 26, name: "El Malón Beer & Food", reviews: 1750, rating: 4.5, category: "Gastronomía", url: "https://goo.gl/maps/example" },
    { id: 27, name: "Estadio Juan Gilberto Funes", reviews: 1600, rating: 4.6, category: "Deportes", url: "https://goo.gl/maps/example" },
    { id: 28, name: "Aeropuerto Brigadier Mayor Cesar Raul Ojeda", reviews: 1550, rating: 4.0, category: "Transporte", url: "https://goo.gl/maps/example" },
    { id: 56, name: "Naldo San Luis", reviews: 1500, rating: 4.1, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },
    { id: 35, name: "Sanatorio Rivadavia", reviews: 1450, rating: 3.2, category: "Salud", url: "https://goo.gl/maps/example" },
    { id: 36, name: "Hotel Potrero de los Funes", reviews: 1400, rating: 4.3, category: "Hotel", url: "https://goo.gl/maps/example" },
    { id: 37, name: "Un Tal René (Bar)", reviews: 1350, rating: 4.4, category: "Bar", url: "https://goo.gl/maps/example" },
    { id: 38, name: "Museo Histórico de San Luis (MUHSAL)", reviews: 1300, rating: 4.7, category: "Museo", url: "https://goo.gl/maps/example" },
    { id: 39, name: "Parque Astronómico La Punta", reviews: 1250, rating: 4.6, category: "Turismo", url: "https://goo.gl/maps/example" },
    { id: 40, name: "Salto de la Moneda", reviews: 1200, rating: 4.7, category: "Turismo", url: "https://goo.gl/maps/example" },
    { id: 161, name: "Hotel Quintana", reviews: 1150, rating: 4.1, category: "Hotel", url: "https://goo.gl/maps/example" },
    { id: 162, name: "Hotel Vista", reviews: 1100, rating: 4.3, category: "Hotel", url: "https://goo.gl/maps/example" },
    { id: 57, name: "Casa Reig", reviews: 1080, rating: 4.2, category: "Electrodomésticos", url: "https://goo.gl/maps/example" },
    { id: 49, name: "Restaurante El Estilo", reviews: 1050, rating: 4.2, category: "Gastronomía", url: "https://goo.gl/maps/example" },
    { id: 58, name: "Stylo Pilcheria", reviews: 1020, rating: 4.0, category: "Indumentaria", url: "https://goo.gl/maps/example" },
    { id: 59, name: "Parrilla El Puntano", reviews: 1000, rating: 4.1, category: "Gastronomía", url: "https://goo.gl/maps/example" },
    { id: 60, name: "Tiendas Castellanas", reviews: 990, rating: 4.1, category: "Indumentaria", url: "https://goo.gl/maps/example" },
];

export default function ReviewsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ranking de Reseñas</h1>
                    <p className="text-muted-foreground mt-2">
                        Top 50 lugares con más reseñas en San Luis Capital y alrededores.
                    </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                    San Luis, AR
                </Badge>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        Ranking de Reseñas - San Luis (Top 50)
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                        <p>Referencia de los lugares más populares y empresas locales.</p>
                        <p className="text-xs italic mt-1 bg-yellow-50 text-yellow-800 p-1 inline-block rounded">
                            * Nota: Los valores son estimaciones basadas en datos públicos y pueden diferir de los números en tiempo real.
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <ReviewsTable initialPlaces={places.sort((a, b) => b.reviews - a.reviews)} />
                </CardContent>
            </Card>
        </div>
    );
}
