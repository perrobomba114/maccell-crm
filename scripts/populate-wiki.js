require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function populateWiki() {
    console.log("Iniciando migración de historial a Wiki Técnica...");

    try {
        // Encontrar admin user id para usar como autor fallback
        const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
        const fallbackAuthorId = adminRes.rows[0]?.id;

        if (!fallbackAuthorId) {
            console.error("No se encontró usuario ADMIN.");
            return;
        }

        // Obtener reparaciones con diagnóstico que no existen aún en la Wiki 
        // (comparamos por título o content para evitar duplicados si ya se empezó a popular)
        const repairsRes = await pool.query(`
            SELECT id, "ticketNumber", "deviceBrand", "deviceModel", "problemDescription", "diagnosis", "assignedUserId", "userId"
            FROM repairs 
            WHERE diagnosis IS NOT NULL AND diagnosis != ''
        `);

        const repairs = repairsRes.rows;
        console.log(`Encontradas ${repairs.length} reparaciones con diagnóstico.`);

        let inserted = 0;

        for (const r of repairs) {
            // Generar título: "[Ticket] Falla breve"
            const shortProblem = r.problemDescription.substring(0, 60) + (r.problemDescription.length > 60 ? "..." : "");
            const title = `${r.deviceBrand} ${r.deviceModel} - ${shortProblem}`;

            // Chequear si ya existe (por ticket para evitar duplicación exacta)
            // No podemos hacer JOIN con ticket directamente si la tabla de knowledge no tiene la FK repairId
            // pero podemos comprobar si el title incluye el ticket o si content contiene el description.
            const exist = await pool.query(
                `SELECT id FROM repair_knowledge WHERE title = $1`,
                [title]
            );

            if (exist.rows.length === 0) {
                // Generar tags: Extraer palabras clave de diagnosis y problem
                const textForTags = (r.problemDescription + " " + r.diagnosis).toLowerCase();
                const tags = [];
                if (textForTags.includes("pin") || textForTags.includes("carga")) tags.push("Pin de Carga");
                if (textForTags.includes("pantalla") || textForTags.includes("modulo") || textForTags.includes("módulo")) tags.push("Pantalla");
                if (textForTags.includes("bateria") || textForTags.includes("batería")) tags.push("Batería");
                if (textForTags.includes("enciende") || textForTags.includes("prende")) tags.push("No Enciende");
                if (textForTags.includes("agua") || textForTags.includes("humedad")) tags.push("Humedad");
                if (textForTags.includes("software") || textForTags.includes("flasheo")) tags.push("Software");
                if (textForTags.includes("placa") || textForTags.includes("corto")) tags.push("Placa");

                // Generar ID unique (como cuid/uuid simplificado)
                const newId = 'ckw_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

                const content = `*Problema Reportado:*\n${r.problemDescription}\n\n*Diagnóstico/Solución:*\n${r.diagnosis}\n\n(Ticket Referencia: #${r.ticketNumber})`;
                const authorId = r.assignedUserId || r.userId || fallbackAuthorId;

                await pool.query(
                    `INSERT INTO repair_knowledge (id, "deviceBrand", "deviceModel", "problemTags", title, content, "mediaUrls", "authorId", "createdAt", "updatedAt")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
                    [newId, r.deviceBrand || "Desconocido", r.deviceModel || "", tags, title, content, [], authorId]
                );

                inserted++;
            }
        }

        console.log(`Migración completada. ${inserted} soluciones nuevas añadidas a la Wiki.`);
    } catch (error) {
        console.error("Error durante migración:", error);
    } finally {
        pool.end();
    }
}

populateWiki();
