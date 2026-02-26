export const LEVEL3_MASTER_KNOWLEDGE = `
### 🧠 BASE DE CONOCIMIENTO MAESTRA - NIVEL 3

#### 1. Arquitectura de Serialización (Apple Hardware ID)
- **Handshake:** El procesador (AP) valida UIDs de Pantalla (IC Touch), Batería (BMS), Face ID y Cámaras.
- **Falla:** Si no hay coincidencia -> "Pieza Desconocida" + pérdida de True Tone o Face ID.
- **Protocolo:** Trasplante físico del chip original (IC Swap). Riesgo: >200°C en el panel causa daño térmico irreversible.

#### 2. Gestión de Baterías y BMS
- **Anatomía:** Separación de BMS (lógica) y Celda (litio).
- **Seguridad:** Usar herramientas plásticas + alcohol isopropílico. NUNCA metal.
- **Spot Welding:** Soldadura por puntos para lengüetas de níquel. No usar estaño (se quiebra).
- **Tag-on Flex (JCID/QianLi):** Intercepta comunicación para resetear ciclos a 0 y salud al 100%.

#### 3. Análisis de Consumo (DC Power Supply)
- **Línea Primaria (VCC_MAIN/V_BATT):** Consumo sin pulsar Power = Corto en línea primaria.
- **Secuencia de Boot:**
  - 0-50mA: Intento de lectura de código.
  - 150-300mA: CPU buscando NAND. Pegado aquí = Error de datos o NAND dañada.
  - Cíclico (200mA -> 0): Bucle por falta de voltaje secundario o error I2C.

#### 4. Modo Diodo (Caída de Tensión)
- **Método:** Punta Roja a Tierra (GND), Punta Negra mide.
- **Valores:** 
  - 0.300V - 0.800V: Saludable.
  - 0.000V - 0.010V: Corto a tierra.
  - OL (Open Loop): Línea abierta o componente desconectado.

#### 5. Inyección de Tensión y Rosin
- **Rosin:** Humo blanco de colofonia para nevado de placa.
- **Inyección:** V_inject DEBE ser menor al voltaje nominal de la línea.
- **Efecto:** El componente en corto derrite el Rosin y se vuelve transparente.

#### 6. Metalurgia y Perfiles Térmicos
- **Aleación:** Lead-Free (217°C) vs Leaded (183°C). Mezclar para ablandar pads.
- **Aire:** Flujo bajo para evitar "volar" componentes; flujo alto para centros de integrados.

#### 7. Reballing Profesional
- **Limpieza:** Malla Goot Wick + Flux orgánico hasta dejar pads planos.
- **Stencil:** Alineación perfecta + soldadura en pasta.
- **Calor:** 280°C para formar esferas perfectas por tensión superficial.

#### 8. Samsung Nivel 3
- **Fallas Típicas:** CPU/PMIC en Serie A (A52/A72) por soldadura fría.
- **Power Rails:** Línea 1.8V Always On crítica para el boot.
- **Carga:** Bypass de chip OVP si falla la protección de entrada.

#### 9. Motorola y EDL
- **OCP (Over Current Protection):** Corte errático a 400mA por fugas.
- **Modo EDL (9008):** Fallas de soldadura en UFS (Moto G60/G100).
- **Conectores FPC:** Fallas masivas en flex de interconexión.

#### 10. Buses de Datos (I2C / SPI)
- **SDA/SCL:** Deben tener caída de tensión idéntica.
- **Efecto Dominó:** Un sensor en corto (ej. Proximidad) bloquea todo el bus e impide encendido.

#### 11. Underfill y Resinas
- **Limpieza:** 250°C + bisturí curvo.
- **Ball Out:** Expansión térmica de resina causa cortos si el calentamiento es muy rápido.

#### 12. Recuperación de Pads
- **Micro-Jumpers:** Hilo de 0.01mm + soldadura en bordes de pista.
- **Máscara UV:** Resina verde para aislamiento y soporte estructural.

#### 13. Software de Bitmaps
- **XinZhiZao / DZKJ:** Uso obligatorio para mapear redes y valores de referencia.

#### 14. Blindajes y Protección
- **Corte:** Mini-torno Dremel para evitar estresar la placa con calor masivo.
- **Protección:** Cinta Kapton y Aluminio para componentes plásticos.

#### 15. Ergonomía y Salud
- **Vapores:** Ácido Abiótico del flux requiere extractor de humos.
- **Visión:** Luz LED fría para detectar micro-fisuras.
`;
