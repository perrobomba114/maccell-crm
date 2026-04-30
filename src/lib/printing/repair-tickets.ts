import { format } from "date-fns";
import { es } from "date-fns/locale";
import { printHtml, SHARED_CSS, wrapHtml } from "./core";

type RepairTicketData = {
    ticketNumber: string;
    branch?: {
        name?: string | null;
        address?: string | null;
        phone?: string | null;
        imageUrl?: string | null;
    } | null;
    customer?: { name?: string | null } | null;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    problemDescription?: string | null;
    isWet?: boolean | null;
    estimatedPrice?: number | null;
    promisedAt?: Date | string | null;
    parts?: {
        quantity: number;
        sparePart?: { name?: string | null } | null;
    }[];
};

export const printRepairTicket = (repair: RepairTicketData | null | undefined) => {
    if (!repair) return;
    const logoUrl = repair.branch?.imageUrl || "/logo.jpg";

    const content = `
        <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
            <div class="branch-name">${repair.branch?.name || "MACCELL"}</div>
            ${repair.branch?.address ? `<div class="branch-info">${repair.branch.address}</div>` : ''}
            ${repair.branch?.phone ? `<div class="branch-info">Tel: ${repair.branch.phone}</div>` : ''}

            <div style="margin-top: 10px; text-transform: uppercase; border-top: 1px solid black; border-bottom: 1px solid black; padding: 5px 0; display: inline-block;">
                Comprobante de Reparación
            </div>

            <div style="font-size: 24px; font-weight: 900; margin: 5px 0;">#${repair.ticketNumber}</div>
            <div class="date">${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</div>
        </div>

        <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 900;">CLIENTE</div>
            <div style="font-size: 16px; font-weight: bold;">${repair.customer?.name || "Consumidor Final"}</div>
        </div>

        <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 900;">DISPOSITIVO</div>
            <div style="font-size: 16px; font-weight: bold;">${repair.deviceBrand} ${repair.deviceModel}</div>
        </div>

         <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: 900;">PROBLEMA / DIAGNÓSTICO</div>
            <div style="font-style: italic; font-size: 14px;">"${repair.problemDescription}"</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 5px;">* No se pudieron comprobar sus funciones.</div>
            ${repair.isWet ? `
                <div style="margin-top: 5px; border: 2px solid black; padding: 2px; text-align: center; font-weight: 900; background: #eee;">
                    ⚠️ EQUIPO MOJADO
                </div>
            ` : ''}
        </div>

        ${repair.parts && repair.parts.length > 0 ? `
            <div style="margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px;">
                <div style="font-size: 12px; font-weight: 900;">REPUESTOS</div>
                ${repair.parts.map((p) => `
                    <div style="font-size: 14px; margin-bottom: 2px;">
                        <span>${p.quantity}x ${p.sparePart?.name || "Repuesto"}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div style="border-bottom: 3px solid black; padding-bottom: 10px;">
            <div class="row">
                <span style="font-size: 18px; font-weight: 900;">TOTAL ESTIMADO</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; text-align: right;">$${repair.estimatedPrice?.toLocaleString() || "0"}</div>
            <div class="row" style="margin-top: 10px; justify-content: flex-end;">
                <span class="label" style="margin-right: 5px;">PROMETIDO:</span>
                <span class="value" style="margin-bottom: 0;">${repair.promisedAt ? format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es }) : ""}</span>
            </div>
            <div style="font-size: 16px; font-weight: 900; text-align: center; margin-top: 5px; text-transform: uppercase;">
                PARA RETIRAR EL EQUIPO SI O SI NECESITA ESTE COMPROBANTE
            </div>
        </div>

        <div style="font-family: sans-serif; font-size: 11px; text-align: left; margin-top: 15px; font-weight: bold; line-height: 1.1;">
            <div style="text-decoration: underline; margin-bottom: 2px;">TÉRMINOS Y CONDICIONES:</div>
            1. ACEPTACIÓN: La entrega del equipo implica la conformidad total con el presupuesto y estas condiciones.<br/>
            2. GARANTÍA LIMITADA: Validez de 30 días corridos. Cubre exclusivamente la mano de obra realizada y los repuestos reemplazados en esta orden.<br/>
            3. EXCLUSIONES: La garantía se anula automáticamente por: Golpes, trizaduras o presión en pantalla. Signos de humedad, sulfatación o mojaduras. Fajas de garantía rotas o manipulación ajena.<br/>
            4. ABANDONO: El cliente dispone de 90 días corridos para retirar el equipo tras el aviso. Pasado este plazo, el equipo se considerará abandonado, pasando a disposición de la empresa para cubrir costos, sin derecho a reclamo posterior.<br/>
            5. RESPONSABILIDAD DE DATOS: La empresa no se responsabiliza por la pérdida de información (fotos, contactos, etc.). Se sugiere backup previo.
        </div>

        <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/estado/' + repair.ticketNumber)}" style="width: 100px; height: 100px; margin: 0 auto; display: block;" alt="QR Ticket" />
            <div style="font-size: 10px; margin-top: 5px;">Escaneá para saber el estado de tu equipo</div>
            <div style="font-size: 10px; font-weight: bold;">Ticket #${repair.ticketNumber}</div>
        </div>

        <div style="margin-top: 200px; border-top: 2px solid black; text-align: center; padding-top: 5px; font-size: 14px; font-weight: bold;">
            Firma del Cliente / Aceptación
        </div>
    `;

    printHtml(wrapHtml(`Ticket #${repair.ticketNumber}`, SHARED_CSS, content));
};

export const printWetReport = (repair: RepairTicketData | null | undefined) => {
    if (!repair) return;
    const logoUrl = repair.branch?.imageUrl || "/logo.jpg";

    const content = `
        <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
            <div class="branch-name">Maccell</div>
            <div style="text-align: center; font-weight: 900; margin-top: 10px; font-size: 16px; line-height: 1.2;">📱 INFORME TÉCNICO:<br/>IMPACTO DE LA HUMEDAD</div>
            <div style="text-align: center; font-size: 12px;">Ticket #${repair.ticketNumber}</div>
        </div>

        <div style="font-size: 11px; line-height: 1.3; text-align: justify; font-family: sans-serif;">
            <p><strong>Estimado cliente</strong>, cuando un dispositivo entra en contacto con líquidos, se inicia un proceso químico que afecta la integridad del hardware. Este documento detalla por qué un equipo mojado requiere un tratamiento especial y cuáles son los riesgos a corto y largo plazo.</p>

            <div style="margin-bottom: 8px;">
                <div style="font-weight: 900; font-size: 13px; text-decoration: underline; margin-bottom: 2px;">1. El Deterioro Progresivo de la Placa Base</div>
                El daño no es causado únicamente por el líquido, sino por los minerales y la electricidad. Al combinarse, generan sulfatación (corrosión).<br/><br/>

                <strong>• Oxidación Silenciosa:</strong> La corrosión puede seguir avanzando de forma microscópica incluso después de que el equipo parezca seco, afectando pistas de cobre y soldaduras internas.<br/>
                <strong>• Cortocircuitos:</strong> Una mínima gota de humedad puede unir dos canales de voltajes distintos, quemando componentes vitales (procesador o memoria) de manera irreversible.
            </div>

            <div style="margin-bottom: 8px;">
                <div style="font-weight: 900; font-size: 13px; text-decoration: underline; margin-bottom: 2px;">2. El Proceso de Baño Químico</div>
                Realizamos una limpieza profunda mediante tecnología de ultrasonido y químicos de alta pureza para remover el sulfato acumulado.<br/><br/>

                <strong>Es una Limpieza, no una Reparación:</strong> Este proceso busca restablecer el flujo eléctrico. Si la humedad ya destruyó un componente o cortó un circuito, el baño químico por sí solo no lo reparará; en esos casos, se requerirá una intervención de micro-soldadura adicional.
            </div>

            <div style="margin-bottom: 8px;">
                <div style="font-weight: 900; font-size: 13px; text-decoration: underline; margin-bottom: 2px;">3. Fallas Comunes y Secuelas Post-Humedad</div>
                Incluso si el equipo enciende tras el proceso, la humedad suele dejar daños permanentes en piezas selladas o delicadas:<br/><br/>

                <strong>• Sistema de Audio (Parlantes y Micrófonos):</strong> Las membranas pierden flexibilidad y se endurecen, resultando en sonido "gangoso" o bajo.<br/>
                <strong>• Botones Erráticos:</strong> El sulfato crea "puentes" que activan funciones solos (volumen, encendido).<br/>
                <strong>• Pérdida de Señal:</strong> La corrosión en antenas provoca desconexiones.<br/>
                <strong>• Lector SIM/Memoria:</strong> Puede dejar de reconocer el chip intermitentemente.<br/>
                <strong>• Pantalla/Táctil:</strong> "Toques fantasma" o zonas muertas por agua bajo el vidrio.<br/>
                <strong>• Sensores:</strong> La pantalla no se apaga en llamadas si falla el sensor de proximidad.<br/>
                <strong>• Sobrecalentamiento:</strong> Residuos microscópicos generan consumo constante y agotan la batería.
            </div>

            <div style="border: 2px solid black; padding: 5px; margin: 8px 0; background-color: #f0f0f0;">
                <div style="font-weight: 900; font-size: 13px; text-decoration: underline; margin-bottom: 2px;">4. Términos del Servicio y Garantía</div>
                Debido a que el daño por líquido es un proceso químico degenerativo, <strong>Maccell no puede otorgar garantía de funcionamiento a largo plazo en equipos mojados</strong>. Nuestra labor garantiza la aplicación del protocolo de limpieza profesional, pero no puede revertir daños estructurales preexistentes.
            </div>

            <div style="font-weight: bold; margin: 10px 0; font-size: 12px; text-align: center;">
                ⚠️ RECOMENDACIÓN PROFESIONAL:<br/>
                Si su equipo enciende tras el servicio, es de carácter URGENTE realizar una copia de seguridad (Backup). La estabilidad futura es impredecible.
            </div>
        </div>

        <div style="margin-top: 20px; font-size: 11px;">
            He recibido y comprendido la información técnica sobre los riesgos de mi equipo:
            <br/><br/><br/><br/>
            <div style="border-top: 1px solid black; display: flex; justify-content: space-between; padding-top: 5px;">
                <span>Firma Cliente: __________________</span>
                <span>Fecha: ${format(new Date(), "dd/MM/yyyy", { locale: es })}</span>
            </div>
        </div>

        <div class="qr-container" style="margin-top: 15px;">
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/estado/' + repair.ticketNumber)}" style="width: 90px; height: 90px; margin: 0 auto; display: block;" alt="QR Ticket" />
             <div style="font-size: 10px; margin-top: 2px;">Ver estado online</div>
        </div>
    `;

    printHtml(wrapHtml(`Informe Humedad #${repair.ticketNumber}`, SHARED_CSS, content));
};

export const printWarrantyTicket = (repair: RepairTicketData | null | undefined) => {
    if (!repair) return;
    const logoUrl = repair.branch?.imageUrl || "/logo.jpg";

    const content = `
        <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
            <div class="branch-name">Maccell</div>
            <div style="text-align: center; font-weight: 900; margin-top: 10px; font-size: 16px; line-height: 1.2; text-transform: uppercase;">
                Certificado de Garantía
            </div>
            <div style="text-align: center; font-size: 12px;">Ticket #${repair.ticketNumber}</div>
        </div>

        <div style="margin-bottom: 5px;">
             <div style="font-size: 12px; font-weight: 900;">EQUIPO:</div>
             <div style="font-size: 14px; font-weight: bold;">${repair.deviceBrand} ${repair.deviceModel}</div>
             <div style="font-size: 11px; margin-top: 2px;">Cliente: ${repair.customer?.name}</div>
        </div>

        ${repair.isWet ? `
            <div style="margin: 10px 0; border: 4px solid black; padding: 5px; text-align: center; background: #eee;">
                <div style="font-size: 20px; font-weight: 900; text-transform: uppercase;">
                    ⚠️ EQUIPO MOJADO
                </div>
                <div style="font-size: 11px; font-weight: bold;">
                    GARANTÍA LIMITADA / REVISAR INFORME
                </div>
            </div>
        ` : ''}

        <div style="margin: 15px 0; border: 3px solid black; padding: 10px; text-align: center;">
            <div style="font-size: 24px; font-weight: 900; line-height: 1.1; text-transform: uppercase;">
                GARANTÍA 30 DÍAS
            </div>
            <div style="margin-top: 5px; font-size: 14px; font-weight: bold;">
                NO CUBRE GOLPES
                <br/>NI TRIZADURAS
            </div>
        </div>

        <div style="font-size: 11px; text-align: justify; font-family: sans-serif; line-height: 1.2;">
            Esta garantía cubre exclusivamente defectos en los repuestos instalados o fallas relacionadas con la mano de obra realizada en esta orden.<br/><br/>
            <strong>LA GARANTÍA SE ANULA AUTOMÁTICAMENTE SI:</strong><br/>
            - El equipo presenta nuevos golpes o marcas.<br/>
            - El equipo fue mojado o expuesto a humedad.<br/>
            - Las fajas de seguridad fueron removidas.<br/>
            - El equipo fue manipulado por terceros.
        </div>

        <div style="margin-top: 180px; font-size: 11px;">
             <br/><br/>
             <div style="border-top: 1px solid black; display: flex; justify-content: space-between; padding-top: 5px;">
                <span>Firma Cliente: __________________</span>
                <span>Fecha: ${format(new Date(), "dd/MM/yyyy", { locale: es })}</span>
            </div>
        </div>
    `;

    printHtml(wrapHtml(`Garantía #${repair.ticketNumber}`, SHARED_CSS, content));
};
