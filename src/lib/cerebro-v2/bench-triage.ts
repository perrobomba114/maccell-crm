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
        symptom: /no (?:enciende|prende|arranca)|sin imagen|pantalla negra|ingres[aoó] apagado/i,
        known: /vibr[aó]|suena|lo reconoce|detectad[oa] por|signos de actividad|muestra el logo/i,
        question: '¿Observaste vibración, sonido o detección USB aunque no haya imagen?',
        reason: 'Una señal de actividad permite investigar la falta de imagen. Su ausencia todavía deja abierto el estado de arranque.',
        outcomes: [['Sí, observé signos de actividad', 'Hay actividad del equipo.'], ['No observé signos de actividad', 'El arranque sigue sin confirmarse.']],
    },
    {
        symptom: /no carga|carga (?:lenta|intermitente)|sin carga/i,
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
