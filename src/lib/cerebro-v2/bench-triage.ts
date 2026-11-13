import type { DiagnosticPlan } from './diagnostic-plan';
import type { DiagnosticState } from './diagnostic-state';

type Check = {
    symptom: RegExp;
    known: RegExp;
    question: string;
    reason: string;
    outcomes: [string, string][];
};

// These questions collect observations. They do not diagnose a component or specify board values.
const checks: Check[] = [
    {
        symptom: /queda en (?:el )?logo/i, known: /reinicia solo|logo fijo|vuelve a reiniciar/i,
        question: 'Cuando queda en el logo, ¿permanece fijo o el equipo vuelve a iniciar por sí solo?',
        reason: 'Se registró imagen de inicio. Falta distinguir una detención de un reinicio repetido.',
        outcomes: [['El logo permanece fijo', 'No se observó un nuevo intento.'], ['Vuelve a iniciar', 'El ciclo se repite.']],
    },
    {
        symptom: /sensor de proximidad|sensor de cercan[ií]a/i,
        known: /al (?:cubrir|tapar|destapar)|acercar.{0,15}alejar/i,
        question: 'Durante una llamada de prueba, ¿la pantalla se apaga al cubrir la zona del sensor y vuelve al descubrirla?',
        reason: 'Comprobar las dos transiciones permite registrar si falla la detección, la liberación o ambas antes de atribuir una causa.',
        outcomes: [['Responde en ambas transiciones', 'La falla no se reprodujo en esa condición.'], ['Falla una o ambas transiciones', 'Queda identificado el comportamiento que hay que reproducir.']],
    },
    {
        symptom: /(?:llega|lleg[aó]|muestra|queda|aparece).{0,16}logo.{0,28}(?:reinici|apag)|reinici.{0,25}logo/i,
        known: /intervalo (?:regular|variable)|cada \d+ (?:segundos|minutos)/i,
        question: 'Cuando aparece el logo, ¿el reinicio se repite con el mismo intervalo o cambia entre intentos?',
        reason: 'Recepción describe imagen y un inicio parcial. El momento del corte ayuda a reproducir la falla antes de atribuirla a alimentación o software.',
        outcomes: [['Se repite en el mismo momento', 'El fallo es reproducible en una etapa del arranque.'], ['El momento cambia', 'Conviene registrar las condiciones en que cambia.']],
    },
    {
        symptom: /(?:parte|zona|lado|mitad|franja|derech|izquierd).{0,35}(?:t[aá]ctil|touch)|(?:t[aá]ctil|touch).{0,35}(?:zona|lado|mitad|franja|derech|izquierd)/i, known: /rot[aéó].{0,20}pantalla|gir[aéó].{0,20}pantalla/i,
        question: 'En una aplicación que permite girar la pantalla, ¿la zona sin respuesta queda en el mismo lugar físico del vidrio?',
        reason: 'Seguir la zona al girar la interfaz distingue un patrón físico de uno asociado al contenido mostrado.',
        outcomes: [['Queda en el mismo lugar del vidrio', 'La falla sigue una zona física del equipo.'], ['Se desplaza con la interfaz', 'El patrón depende del contenido mostrado.']],
    },
    {
        symptom: /t[aá]ctil|touch/i, known: /toda la pantalla|zona fija|solo en una app/i,
        question: 'Al recorrer la pantalla con el dedo, ¿la falta de respuesta se concentra en una zona o afecta toda la superficie?',
        reason: 'Ubicar el patrón permite elegir la prueba siguiente y registrar si hay sectores que sí responden.',
        outcomes: [['Falla una zona', 'Hay respuesta táctil fuera del sector afectado.'], ['Falla toda la superficie', 'Falta distinguir respuesta táctil de un sistema detenido.']],
    },
    {
        symptom: /altavoz|parlante/i, known: /auriculares.{0,30}funcion|funciona.{0,25}auriculares/i,
        question: 'Con Bluetooth desactivado y sin auriculares, ¿se escucha un audio conocido por el altavoz del equipo?',
        reason: 'Una reproducción local permite separar una falla de salida de un problema exclusivo de llamadas o de enrutamiento de audio.',
        outcomes: [['El audio local se escucha', 'La salida reproduce audio en esa condición.'], ['El audio local tampoco se escucha', 'La falla también aparece fuera de llamadas.']],
    },
    {
        symptom: /no (?:enciende|prende|arranca)|sin imagen|pantalla negra|ingres[aoó] apagado|se encuentra apagado/i,
        known: /vibr[aó]|suena|lo reconoce|detectad[oa] por|signos de actividad|muestra el logo|queda en (?:el )?logo/i,
        question: '¿Observaste vibración, sonido o detección USB aunque no haya imagen?',
        reason: 'Una señal de actividad permite investigar la falta de imagen. Su ausencia todavía deja abierto el estado de arranque.',
        outcomes: [['Sí, observé signos de actividad', 'Hay actividad del equipo.'], ['No observé signos de actividad', 'El arranque sigue sin confirmarse.']],
    },
    {
        symptom: /falla en la carga|no carga|carga (?:lenta|intermitente)|sin carga/i,
        known: /otro (?:cable|cargador)|cable (?:bueno|verificado)|cargador (?:bueno|verificado)|conjunto de carga/i,
        question: '¿La falla de carga también se presentó con un cable y cargador que funcionan en otro equipo?',
        reason: 'Comparar el mismo síntoma con un conjunto conocido permite aislar los accesorios externos.',
        outcomes: [['También falló con el conjunto verificado', 'La falla persiste con esos accesorios.'], ['Cargó con el conjunto verificado', 'El comportamiento cambió al sustituir los accesorios.']],
    },
    {
        symptom: /(?:no lee|no reconoce|sin) (?:el |la )?(?:chip|sim)|(?:sin|problema de|falla de) se[ñn]al/i,
        known: /sin (?:tarjeta )?sim|solo emergencias|sim detectada|muestra el operador|pide (?:el )?pin/i,
        question: '¿Qué muestra el equipo con la SIM colocada?',
        reason: 'La detección de tarjeta y el registro en la red son etapas distintas.',
        outcomes: [['Indica que falta la SIM', 'Falta confirmar la lectura de la tarjeta.'], ['Detecta la SIM pero queda sin servicio', 'La lectura de la tarjeta funciona al menos parcialmente.']],
    },
    {
        symptom: /reinic|bootloop|bucle|queda en (?:el )?logo/i,
        known: /antes del logo|despu[eé]s del logo|llega al sistema|al desbloquear|al abrir/i,
        question: '¿En qué momento del arranque observaste el reinicio?',
        reason: 'La última etapa visible acota dónde se interrumpe el arranque.',
        outcomes: [['Reinicia antes de llegar al sistema', 'El arranque no llega a completarse.'], ['Llega al sistema antes de reiniciar', 'El sistema alcanza a iniciar.']],
    },
];

export function needsTechnicalDocuments(text: string): boolean {
    return /esquem[aá]tico|boardview|plano|manual|p[aá]gina|pinout|\bpin(?:es)?\b|\b(?:TP|[RCULFDJ])\d{2,6}\b|\b(?:VBUS|VBAT|VDD\w*|PMIC|MIPI|I2C)\b|tensi[oó]n|voltaje|mult[ií]metro|diodo|impedancia|bobina|placa|conector|esquema|diagrama/i.test(text);
}

export function benchTriage(state: DiagnosticState, latest: string, recoverFirstStep = false): DiagnosticPlan | null {
    const current = state.observations.filter(o => !o.superseded);
    const context = current.map(o => o.text).join('\n');
    if (/humedad|mojad|sulfat|bater[ií]a hinchada/i.test(context)) return null;
    const human = current.filter(o => o.origin === 'technician' && !/[¿?]/.test(o.text)).map(o => o.text).join(' ');
    const observation = [human, latest.split(/[¿?]/)[0]].join(' ');
    const swap = 'Con el cargador que funcionó, ¿qué ocurre al cambiar únicamente al cable original?';
    if (/carg[oó] con el conjunto verificado|(?:equipo )?carga con (?:el segundo|otro|el otro) (?:conjunto|cargador y cable|cable y cargador)/i.test(observation)
        && /accesorio|cable|cargador|conjunto/i.test(latest)
        && !/cable original|solo el cable|solamente el cable/i.test(observation)
        && !state.answeredQuestions.includes(swap) && !needsTechnicalDocuments(latest)) {
        return { id: crypto.randomUUID(), kind: 'functional', stage: 'Aislar el accesorio', question: swap,
            reason: 'Al cambiar ambos accesorios juntos se recuperó la carga. Esa prueba todavía no distingue cuál produjo el cambio.',
            conditions: 'Usá el mismo equipo y toma. Hacé la comparación solo con accesorios íntegros y compatibles.',
            instrument: '', point: '', expected: 'Registrar si la carga se mantiene al cambiar una sola variable.',
            evidenceIds: [], branches: [
                {result:'Deja de cargar', meaning:'La falla se reproduce con el cable original en esa combinación.'},
                {result:'Sigue cargando', meaning:'El cable original permite cargar con el cargador verificado.'}],
            options:['Deja de cargar con el cable original','Sigue cargando con el cable original','No pude comprobarlo'] };
    }
    if (needsTechnicalDocuments(latest) || /cu[aá]nto|por qu[eé]|qu[eé] significa/i.test(latest)
        || (latest.includes('?') && !recoverFirstStep && !/por d[oó]nde empiezo/i.test(latest)) || state.measurements.length) return null;
    const candidates = checks.filter(check => check.symptom.test(latest));
    const relevant = candidates.length ? candidates : checks.filter(check => check.symptom.test(state.sellerProblem));
    const check = relevant.find(item => !item.known.test(context) && !state.answeredQuestions.includes(item.question));
    if (!check || state.answeredQuestions.length) return null;
    const remaining = /t[aá]ctil|touch/i.test(state.sellerProblem) && /bot[oó]n.{0,12}volumen/i.test(state.sellerProblem)
        && /pantalla|vidrio/.test(check.question) ? ' El botón de volumen queda pendiente de una prueba independiente.' : '';
    return { id: crypto.randomUUID(), kind: 'clarification', stage: 'Aislar el síntoma',
        question: check.question, reason: check.reason + remaining,
        conditions: 'Respondé con lo que ya observaste. No conectes ni alimentes el equipo para contestar.',
        instrument: '', point: '', expected: '', evidenceIds: [],
        branches: check.outcomes.map(([result, meaning]) => ({result, meaning})),
        options: [...check.outcomes.map(([result]) => result), 'Todavía no lo comprobé'] };
}

/** Interpret successive bench observations without inferring the failed component. */
export function followBenchReading(state: DiagnosticState, latest: string): DiagnosticPlan | null {
    const reads = state.measurements;
    const last = reads.at(-1);
    if (!last || /[¿?]|esquem[aá]tico|boardview/i.test(latest)) return null;
    const current = state.observations.at(-1);
    const newReading = last.observationId === current?.id;
    const noUsb = /no (?:se )?conecta a (?:la )?(?:pc|computadora)|no entra en modo download/i.test(latest);
    const logo = /logo/i.test(latest) && /reinici/i.test(latest);
    const shutdown = /^(?:y |luego |despu[eé]s )?(?:el equipo )?se apag(?:a|ó)\b/i.test(latest);
    const unitlessDrop = latest.match(/^(?:luego |despu[eé]s )?(?:cae|cay[oó]|baja|baj[oó]|descendi[oó]) a (\d+(?:[.,]\d+)?)[.! ]*$/i);
    if (!newReading && !noUsb && !logo && !shutdown && !unitlessDrop) return null;

    const voltage = /^(?:mV|V)$/i.test(last.unit);
    const currentReading = /^(?:mA|A)$/i.test(last.unit);
    if (!voltage && !currentReading) return null;
    const human = state.observations.filter(o => o.origin === 'technician' && !o.superseded);
    const context = human.map(o => o.text).join(' ');
    const sequence = reads.map(m => m.value + ' ' + m.unit).join(' → ');
    const questions: string[] = [];
    let pending = 'Queda pendiente identificar qué etapa del equipo se interrumpe.';
    let reason = 'Lecturas informadas, en orden: ' + sequence + '. ';
    if (unitlessDrop) {
        reason += 'La lectura siguiente bajó a ' + unitlessDrop[1] + ' y se informó sin unidad.';
        questions.push('¿Fue la misma medición, con el mismo instrumento y unidad que la lectura anterior?');
    } else if (voltage && reads.some(m => /^(?:mV|V)$/i.test(m.unit) && /consumo|corriente|amperaje/i.test(m.context))) {
        reason += 'El registro llama consumo a una lectura en unidades de tensión. La corriente queda sin determinar.';
        pending = 'Queda pendiente verificar la unidad en el registro original del instrumento antes de interpretar la serie.';
        questions.push('¿El instrumento mostraba voltaje entre dos puntos o corriente en la fuente? Conservá la unidad que figuraba en pantalla.');
    } else if (voltage) {
        reason += 'La tensión solo se puede interpretar con el punto medido y su referencia.';
        questions.push('¿Entre qué dos puntos tomaste la tensión?', '¿La lectura cambió al pulsar encendido o también sin pulsarlo?');
    } else if (logo) {
        reason += 'El equipo llega al logo y vuelve a iniciar. Esa observación ubica la interrupción después del comienzo del arranque.';
        questions.push('¿La caída registrada coincide con el instante en que desaparece el logo?');
    } else if (shutdown) {
        reason += 'El apagado quedó registrado después de esa lectura.';
        questions.push('¿El equipo volvió a intentar arrancar por sí solo después del apagado?');
    } else if (noUsb) {
        reason += /download/i.test(latest) ? 'También quedó registrado que no entró en modo download.' : 'Quedó registrada la falta de conexión con la computadora.';
        pending = 'La falta de conexión deja pendiente distinguir el camino de datos de una interrupción del arranque.';
        questions.push('¿Ese cable y ese puerto de la computadora detectan otro equipo en transferencia de datos?');
    } else if (/carga/i.test(last.context) && /orientaci[oó]n|invertir el conector/i.test(last.context)) {
        const opposite = /invertir el conector/i.test(last.context) && reads.slice(0,-1).some(m => /orientaci[oó]n/i.test(m.context));
        reason += opposite ? 'Hay corriente de carga registrada en las dos orientaciones.' : 'Se registró corriente en una orientación del conector.';
        questions.push(opposite ? '¿Se verificó también que el nivel de batería aumenta durante la carga?' : '¿Qué lectura se observó con el mismo cable en la otra orientación?');
    } else if (/carga/i.test(last.context) && reads.some(m => m !== last && /consumo|encendido/i.test(m.context))) {
        reason += 'La corriente de carga y el consumo previo corresponden a pruebas diferentes. Esas lecturas por sí solas no localizan la avería.';
        questions.push('Durante la prueba de carga, ¿se observó aumento del nivel de batería o solo corriente en la entrada?');
    } else {
        reason += 'La corriente por sí sola no identifica el componente averiado.';
        if (!/al iniciar|al pulsar|al presionar|antes de pulsar/i.test(context))
            questions.push('¿La corriente apareció al conectar la alimentación o recién al pedir encendido?');
        questions.push('¿La lectura se mantiene, vuelve a cero o repite el ciclo mientras observás el equipo?');
        if (reads.length > 1 && /cay[oó]|baj[oó]|descendi[oó]/i.test(latest))
            questions.unshift('Después de la caída, ¿el equipo vuelve a intentar arrancar por sí solo o permanece en ese estado?');
    }
    const question = questions.find(q => !state.answeredQuestions.includes(q));
    return {id:crypto.randomUUID(),kind:question ? 'clarification' : 'verification',stage:'Interpretar la prueba de banco',
        reason,question:question ?? pending,
        conditions:'Usá lo observado durante esta prueba. Si ese dato no quedó registrado, dejalo pendiente.',
        instrument:'',point:'',expected:'',branches:[],options:[],evidenceIds:[]};
}
