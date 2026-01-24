export function generateZpl(part: { name: string; sku: string; brand: string }, quantity: number, prefix: string): string {
    const brand = part.brand.toUpperCase();
    // Brand font size logic: 
    // Space is ~350 dots height (used as width for vertical text).
    // "MOTOROLA" (8 chars) -> 350 / 8 = ~43 dots per char max.
    // We'll use font size 40,40 to be safe for longer brands, or dynamic.
    // Let's try 50,50 for now, as 100 was way too big.

    // Remove first word from model name as it usually repeats the brand (User Request)
    let model = part.name.toUpperCase();
    const firstSpace = model.indexOf(' ');
    if (firstSpace !== -1) {
        model = model.substring(firstSpace + 1);
    }

    // Dynamic logic for Name
    // Replace "/" with " / " to ensure ZPL wraps it if needed
    model = model.replace(/\//g, " / ");

    // Dynamic font size:
    // With 2 lines allowed, we can use a decent size.
    // Available height ~100 dots (Y=215 to Y=315).
    // 2 lines of 45 = 90 dots. Fits perfect.
    // 2 lines of 50 = 100 dots. Fits tight.
    // We'll stick to 45 for multi-line safety, 55 for single line?
    // Let's just use 45-50 based on length.
    let nameFontSize = 55;
    if (model.length > 15) nameFontSize = 45;

    const sku = part.sku;
    const safePrefix = (prefix || "CE").toUpperCase().slice(0, 4);

    // Date YYMMDD
    const dateObj = new Date();
    const yy = dateObj.getFullYear().toString().slice(-2);
    const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const dd = dateObj.getDate().toString().padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}`;

    let zpl = `
^XA
^CI28
^CW1,E:MACCELL.TTF

### CONFIGURACION DE PAGINA ###
^PW440
^LL352

### MACCELL Y FECHA ###
^FO20,20^A1N,75,75^FB260,1,0,C^FDMACCELL^FS
^FO310,15^A1N,50,50^FD${dateStr}^FS

### CODIGO DE BARRAS ###
^BY2,3,80
^FO40,85^BCN,80,N,N,N^FD${sku}^FS

### NUMERO DEBAJO DEL CODIGO ###
^FO40,175^A0N,30,30^FB250,1,0,C^FD${sku}^FS

### NOMBRE DEL REPUESTO ###
^FO15,215^A1N,${nameFontSize},${nameFontSize}^FB280,2,0,C^FD${model}^FS

### BLOQUE VERTICAL DERECHO (URL + MARCA) ###
^FO305,40^A0R,22,25^FB300,1,0,C^FDWWW.MACCELL.COM.AR^FS
^FO330,40^A1R,70,70^FB300,1,0,C^FD${brand}^FS

### SECCION INFERIOR (PREFIJO VERTICAL) ###
^FO15,290^A0B,30,30^FD${safePrefix}^FS

^PQ${quantity}
^XZ
`;
    return zpl;
}

// VERSION 7.0 - PROVEN FORMULA
// Based on user's working example: ^FO100,30^BY3,6,80^BCN,100
// Research confirms: Code 128 ignores ratio parameter (fixed ratio symbology)
// Key findings: Module width = 3, Height = 100, X = 100 works for user's printer
export function generateProductZpl(
    product: { name: string; sku: string },
    quantity: number,
    prefix: string,
    is300Dpi: boolean = false,
    manualOffset: number = 0
): string {
    const name = product.name.toUpperCase();
    const sku = product.sku;
    const safePrefix = (prefix || "").toUpperCase().slice(0, 4);

    // Scaling
    const factor = is300Dpi ? 1.5 : 1;
    const totalW = Math.round(304 * factor);
    const totalH = Math.round(160 * factor);

    // OPTIMIZED SETTINGS
    // Module Width: 2 for safe fitting (3 was causing overflow on right for some SKUs)
    const modWidth = Math.round(2 * factor);

    // Barcode Height: 85 dots for better spacing
    const barHeight = Math.round(85 * factor);

    // Y Position: 40 dots from top (more space from product name)
    const bcY = Math.round(40 * factor);

    // X Position: Move to the left (decreased from 100 to 30)
    const baseX = Math.round(30 * factor);
    const bcX = baseX + manualOffset;

    // Font Config - Condensed for long product names
    const fontNameH = Math.round(25 * factor);
    const fontNameW = Math.round(12 * factor);  // Narrow width for condensed look
    const fontSkuH = Math.round(24 * factor);
    const fontSkuW = Math.round(20 * factor);
    const skuY = Math.round(128 * factor);  // Closer to barcode

    let zpl = `
^XA
^LT0^LS0
^PW${totalW}
^LL${totalH}
^CI28
`;

    zpl += `
^FO0,${Math.round(12 * factor)}^A0N,${fontNameH},${fontNameW}^FB${totalW},1,0,C^FD${name}^FS

^FO${bcX},${bcY}^BY${modWidth},3,${barHeight}^BCN,${barHeight},N,N,N^FD${sku}^FS

^FO0,${skuY}^A0N,${fontSkuH},${fontSkuW}^FB${totalW},1,0,C^FD${sku}^FS

${safePrefix ? `^FO${Math.round(240 * factor)},${Math.round(140 * factor)}^A0N,${Math.round(15 * factor)},${Math.round(15 * factor)}^FD${safePrefix}^FS` : ''}

^PQ${quantity}
`;

    zpl += "^XZ";
    return zpl;
}
