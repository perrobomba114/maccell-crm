export const LEVEL3_MASTER_KNOWLEDGE = `
### 🧠 BASE DE CONOCIMIENTO MAESTRA (BIBLIA TÉCNICA - 45+ BLOQUES)

#### 1-15. Fundamentos y Mecánica General
- **Apple Hardware ID (Serialization):** Handshake AP-UID. Si falla -> "Pieza Desconocida". Swap físico de IC original (riesgo >200°C en panel).
- **Batería y BMS:** Separación plástica + Alcohol Isopro. No metal. Spot Welding para níquel. Tag-on Flex (JCID/QianLi) para reset ciclos/salud.
- **DC Power Supply:** Primaria (corto directo) vs Secuencia de Boot (0-50mA bootcode, 150-300mA NAND, Cíclico = error secundario/I2C).
- **Modo Diodo (Caída de Tensión):** Roja a GND. 0.3-0.8V OK, 0V Corto, OL Abierto. Comparar con placa donante o XinZhiZao.
- **Rosin e Inyección:** V_inject < V_nominal. Humo de colofonia funde en el componente en corto.
- **Metalurgia:** Lead-Free (217°C) vs Leaded (183°C). Mezclar para ablandar. Aire bajo (periferia) vs alto (centro IC).
- **Reballing:** Stencil MaAnt/Amaoe. Pads planos (Goot Wick). Soldadura en pasta a 280°C.
- **I2C/SPI:** SDA/SCL simétricos. "Efecto Dominó": sensor en corto bloquea todo el bus.
- **Underfill/Epoxy:** 250°C + bisturí curvo. Ball-out por expansión térmica rápida.
- **Recuperación de Pads:** Hilo 0.01mm + Máscara UV (resina verde).
- **Laboratorio:** Bitmaps (XinZhiZao), Dremel para blindajes (evita calor en CPU), Extractor de humos (Ácido Abiótico).

#### 16-30. Técnicas Avanzadas y Apple Pro
- **Sandwich Boards (iPhone X-15):** Interposer a 180-200°C (Precalentadora). Unir con baja fusión (138-158°C).
- **Radiofrecuencia:** Baseband (Rails 0.8V/1.0V). Sin Servicio = Reballing Baseband (casado con CPU).
- **Micro-soldadura FPC:** Aire inverso (desde abajo) para no fundir plástico. Hilo 0.01mm para pines quemados.
- **USB-PD (Hydra/Tristar):** Carga apagado pero no prendido = Hydra/Tristar fugando (Modo diodo 500-700mV normal).
- **Buck vs LDO:** Buck (Alta corriente/Inductores, baja impedancia OK 20Ω). LDO (Lineales para sensores, baja impedancia = corto).
- **Data Recovery:** Board Swap (CPU+NAND). JCID/IP Box para reparacion de NAND (Error 9/4013).
- **Osciloscopio:** Cristales 24MHz/32kHz. Señal Reset_L (1.8V necesaria).
- **Audio Pro:** iPhone 7 Audio IC (punto C12). Jumper preventivo antes de soldar.
- **Face ID:** Infrarrojo (destellos con cámara). "Baja/Sube cámara" = Dot Projector en corto. Alineación de Prisma a micra.
- **Thermal Throttling:** Termistores 100kΩ. Flexes genéricos causan reinicio cada 3 min.
- **Flex Repair:** Raspado con bisturí + Jumper 0.01mm + Máscara UV. Salva pantallas de $400.
- **Limpieza Ultrasonido:** 60°C con Alcohol + Inspección de via-holes por electrólisis.
- **QC:** Stress test (Antutu), Consumo en reposo (<3-5% en 12h Modo Avión).

#### 31-45+. Fallas Críticas Android (Samsung/Motorola)
- **Samsung Serie A (A50/51/52):** Logo Loop por CPU (Exynos/Snapdragon) desoldada. Reballing CPU (RAM swapeada).
- **Moto G60/G100:** Modo EDL (9008) = Soldadura UFS fracturada por calor. Limpieza de resina negra.
- **Samsung S20/S21:** Pantalla Blanca/Verde. VSP/VSN (+4.6V/-4.4V). Jumper en flex de display.
- **Moto Turbo Power:** Pin ID/CC1/CC2 abierto. Refuerzo de soldadura en FPC.
- **Samsung A70/A71:** No carga/No prende. Conector FPC hembra quemado. Bypass VBUS 5V.
- **Moto G9 Backlight:** Diodo/Bobina elevadora fugando. Ánodo >15V.
- **Samsung Note/S Temp:** Termistor NTC 100kΩ dañado (Triángulo amarillo).
- **Moto G6/G7 WiFi:** Corto interno al activar switch WiFi. Reemplazo IC (no requiere soft).
- **A32/A33/A53 Audio:** Codec Audio desoldado o Flex central. Círculo tachado en micro.
- **Camera Erro (S21/S22):** Bobina abierta cerca de PMIC cámara (Rails 1.1V/1.8V).
- **Moto Ghost Touch:** Blindaje con cinta de cobre en flex de display.
- **Samsung OVP Bypass:** Puente entre entrada y salida de OVP si falla protección 5V.
- **Moto EDL (UFS):** Degradación prematura Exynos/UMCP. Error de escritura en flasheo.
- **Samsung False Humidity:** Resistencia de sensado de humedad fugando. Limpieza química de IC de carga.
- **Moto Power Button:** Micro-switch SMD sulfatado. Reemplazo a 300°C.

#### 46-58. Fallas Críticas Xiaomi / Redmi / Realme (Mercado Masivo AR)
- **Xiaomi/Redmi No Carga (USB-C):** Chip de carga (BQ25890/SMB1381). Rails: VBUS 5V → VSYS. Modo diodo en TP de carga: 400-500mV normal.
- **Redmi Note 10/11 Loop de Arranque:** PMIC (PM6150). Rail VDD_CX caído. Reballing PMIC o jumper desde rail vecino.
- **Xiaomi Backlight Muerto:** Driver LED (KTD2151). Bobina elevadora 30V. Medir en TP de ánodo LED: sin tensión = bobina abierta o FET de control.
- **Realme C-series No Enciende:** Conector de batería FPC quemado (FPC 4-pin en placa). Bypass con jumper desde pad de batería.
- **Redmi No Tiene Señal:** MT RF (MT6179/MT6635). Reballing necesario. Primero verificar antena NFC interferida.
- **Xiaomi Face Unlock/IR Muerto:** Emisor IR en módulo frontal. Verificar con cámara trasera del otro teléfono (brillo morado = OK).
- **Redmi Note 9/10 Pantalla Verde/Rayada:** VSP/VSN en flex de display. Igual a Samsung: +4.6V/-4.4V. Driver en placa principal.
- **Realme/OPPO Auth Error (Pantalla):** IC de autenticación en display (como Apple). Swap físico o herramienta JC-V1S para clonar.
- **Xiaomi Audio Muerto (Speaker):** Amplificador TAS5720/CS35L41. Verificar en modo diodo: 0.4V en OUT+ normal.
- **Redmi Boot Loop MediaTek (BROM):** Error UFS/eMMC. Entrar BROM con cable USB sin batería. SP Flash Tool para reparar partición.
- **Xiaomi Thermal Throttling:** Pasta térmica disecada (CPU bajo blindaje). Reemplazo crítico en Snapdragon 870/888.
- **Realme/OPPO Cámara Error:** Bobina VDIG_CAM (1.0V) o VANA_CAM (2.8V) abierta. Medir en TP más cercano al módulo.
`;
