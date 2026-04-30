/**
 * Global lock to prevent multiple print dialogs from colliding/freezing
 */
let lastPrintTime = 0;

/**
 * Robust printing helper that uses a hidden iframe.
 * Handles timeouts and cleanup to prevent freezing.
 */
export const printHtml = (htmlContent: string) => {
    const now = Date.now();
    // Reduced from 2000 to 800 to allow sequential tickets (Sale -> Warranty)
    if (now - lastPrintTime < 800) {
        console.warn("Print ignored (spam protection).");
        return;
    }
    lastPrintTime = now;

    try {
        // 1. Create Iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.border = 'none';
        iframe.style.opacity = '0.01'; // Hidden but renderable
        iframe.style.pointerEvents = 'none';

        document.body.appendChild(iframe);

        // 2. Open Document and Write
        const doc = iframe.contentWindow?.document;
        if (!doc) {
            console.error("Iframe document not accessible");
            document.body.removeChild(iframe);
            return;
        }

        doc.open();
        doc.write(htmlContent);
        doc.close();

        // 3. Wait for Load (Images, QR)
        iframe.onload = () => {
            // 4. Trace focus and Print
            setTimeout(() => {
                try {
                    if (!iframe.contentWindow) return;

                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();

                    // Restore main focus
                    window.focus();
                } catch (e) {
                    console.error("Print error:", e);
                } finally {
                    // Cleanup after a delay to allow print dialog to finish
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 5000); // 5s wait to be safe
                }
            }, 500); // 500ms allows images to render layout
        };

        // Fallback cleanup
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 60000);

    } catch (e) {
        console.error("Print setup failed:", e);
    }
};

// --- Shared CSS for Receipts ---
export const SHARED_CSS = `
    body {
        font-family: 'Courier New', monospace;
        width: 80mm;
        margin: 0;
        padding: 2mm;
        font-size: 16px;
        color: black;
        font-weight: bold;
    }
    .header {
        text-align: center;
        margin-bottom: 10px;
        border-bottom: 2px dashed black;
        padding-bottom: 10px;
    }
    .logo {
        width: 40mm;
        height: auto;
        margin: 0 auto 5px auto;
        display: block;
        object-fit: contain;
    }
    .branch-name {
        font-size: 24px;
        font-weight: 900;
        margin: 5px 0;
        text-transform: uppercase;
    }
    .branch-info {
        font-size: 14px;
        margin-top: 2px;
        white-space: pre-wrap;
    }
    .date {
        font-size: 14px;
        margin-top: 5px;
    }
    .row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
    }
    .col-qty { width: 15%; text-align: left; }
    .col-desc { width: 55%; text-align: left; white-space: normal; }
    .col-price { width: 30%; text-align: right; }

    .total-section {
        margin-top: 15px;
        border-top: 2px dashed black;
        padding-top: 10px;
    }
    .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 24px;
        font-weight: 900;
    }
    .payment-method {
        font-size: 14px;
        text-align: right;
        margin-top: 5px;
        text-transform: uppercase;
    }
    .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 14px;
    }
    .qr-container {
        text-align: center;
        margin-top: 20px;
    }
    @media print {
        @page { margin: 0; size: 80mm auto; }
        body { width: 80mm; padding: 2mm; }
    }
`;

// --- Helper to wrap content ---
export const wrapHtml = (title: string, styles: string, bodyContent: string) => `
    <html>
        <head>
            <title>${title}</title>
            <style>
                ${styles}
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
    </html>
`;
