"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintLabelProps {
    sku: string;
    name: string;
    price: number;
}

export const printLabel = (data: PrintLabelProps) => {
    const w = 55; // mm
    const h = 44; // mm

    // Create an iframe to print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Font path assumed in public/fonts/maccell.ttf
    // We use @font-face

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Maccell';
                    src: url('/fonts/maccell.ttf') format('truetype');
                }
                @page {
                    size: 55mm 44mm;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 2mm;
                    width: 55mm;
                    height: 44mm;
                    font-family: 'Maccell', sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    text-align: center;
                    overflow: hidden;
                }
                .sku {
                    font-size: 10px;
                    margin-bottom: 2px;
                }
                .name {
                    font-size: 14px;
                    font-weight: bold;
                    line-height: 1.1;
                    margin-bottom: 4px;
                    max-height: 22px; /* Limit lines */
                    overflow: hidden;
                }
                .price {
                    font-size: 20px;
                    font-weight: bold;
                    margin-top: 2px;
                }
                .logo {
                    font-size: 8px; /* Fallback if no image */
                    margin-top: auto;
                    opacity: 0.5;
                }
            </style>
        </head>
        <body>
            <div class="sku">SKU: ${data.sku}</div>
            <div class="name">${data.name}</div>
            <div class="price">$${data.price.toLocaleString("es-AR")}</div>
            <div class="logo">Maccell</div>
        </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
        iframe.contentWindow?.print();
        // Cleanup after print dialog usage (approximate, usually user actions block this)
        // We can remove it after a delay
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }, 500);
};
