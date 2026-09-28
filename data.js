/* Datos de la práctica — extraídos de POL-NGO-Guide-1-DorjeDrolo-v1 (Tergar) */

const PHASES = [
  {
    id: 'fase1',
    name: 'Fase 1',
    subtitle: 'Los Seis Pensamientos + Quietud, Movimiento y Consciencia',
    hoursTarget: 75, // 6 x 8.5 (51) + 25 (nat. mente) ≈ redondeo guía "50+25"
  },
  {
    id: 'fase2',
    name: 'Fase 2',
    subtitle: 'Bodhichitta + Todos los Fenómenos Surgen de la Mente',
    hoursTarget: 75, // 5 x 10 (50) + 25
  }
];

// group: 'seis' | 'bodhi' | 'mente'
// rotate: true → las etapas dentro de la categoría se pueden alternar libremente
// rotate: false → las etapas también se practican en sucesión (una a la vez, en orden)
const CATEGORIES = [
  { id:'s1', phase:'fase1', group:'seis', order:1, name:'Sufrimiento sin principio del samsara', target:8.5, rotate:true,
    etapas:[
      {id:'s1e1', name:'Insatisfacción', text:'Recuerda las actividades y posesiones que has perseguido en la vida: ¿te han dado alguna vez felicidad duradera? Contempla que mientras sigas en el samsara, nunca la encontrarás — es su naturaleza.'},
      {id:'s1e2', name:'Hay un camino', text:'Reconoce que sí existe un camino hacia la felicidad duradera: lo han seguido budas, bodhisattvas, los maestros de tu linaje y tus propios maestros. Aprecia lo raro y valioso que es haber encontrado esta oportunidad.'},
      {id:'s1e3', name:'Súplica a las Tres Joyas', text:'Contempla la bondad del Buda, el poder liberador del Dharma, y la existencia de quienes ya alcanzaron la libertad. Suplica su bendición al emprender tú también este camino.'}
    ]},
  { id:'s2', phase:'fase1', group:'seis', order:2, name:'La preciosa existencia humana', target:8.5, rotate:true,
    etapas:[
      {id:'s2e1', name:'Libertades y riquezas propias', text:'Aprecia uno por uno tu cuerpo y tus sentidos: ojos, oídos, lengua, nariz, tacto, tu respiración, tu capacidad de moverte. Cada uno es una libertad que no todos los seres tienen.'},
      {id:'s2e2', name:'Lo bueno en tu vida', text:'Aprecia lo que ya tienes: amigos, familia, tu maestro, tu práctica, tu comunidad, tu inteligencia, tu capacidad de amar, tu compasión, tu sabiduría, tus talentos.'},
      {id:'s2e3', name:'Intercambio con otros seres', text:'Reflexiona qué tan rara es esta oportunidad: en muchos otros reinos o circunstancias, un ser ni siquiera podría concebir practicar el dharma. Lo que das por sentado, para otros es casi imposible.'}
    ]},
  { id:'s3', phase:'fase1', group:'seis', order:3, name:'Impermanencia', target:8.5, rotate:true,
    etapas:[
      {id:'s3e1', name:'Impermanencia sutil', text:'Nota el cambio momento a momento en tu respiración y en tu latido. Nada permanece exactamente igual ni un solo instante.'},
      {id:'s3e2', name:'Impermanencia evidente', text:'Trae a la mente algo bueno o malo que te haya pasado y cómo se transformó con el tiempo. La vida sube y baja constantemente — por eso tiene color y textura.'},
      {id:'s3e3', name:'Envejecer y morir', text:'Momento a momento estás envejeciendo. Reconoce lo efímero de esta vida y resuelve enfocar tu tiempo y energía en lo que de verdad tiene significado.'}
    ]},
  { id:'s4', phase:'fase1', group:'seis', order:4, name:'Karma', target:8.5, rotate:true,
    etapas:[
      {id:'s4e1', name:'Interdependencia', text:'Contempla que todo está relacionado: el universo, tu entorno, tu conducta, tu mente. Nada existe de forma aislada.'},
      {id:'s4e2', name:'Interdependencia profunda', text:'Toma un aspecto de tu experiencia — tu cuerpo, una emoción — y nota de cuántas partes, causas y condiciones está compuesto. Nada es tan sólido como parece a primera vista.'},
      {id:'s4e3', name:'Karma y conducta', text:'Tu experiencia futura la moldea lo que haces hoy. Tienes más poder del que crees sobre tu situación futura, a través de tus acciones presentes.'}
    ]},
  { id:'s5', phase:'fase1', group:'seis', order:5, name:'El sufrimiento del samsara', target:8.5, rotate:true,
    etapas:[
      {id:'s5e1', name:'Sufrimiento del sufrimiento', text:'Contempla lo inevitable que todos evitamos: enfermedad, vejez, muerte. No importa cuánto lo evites, no puedes escapar de ello.'},
      {id:'s5e2', name:'Sufrimiento del cambio', text:'La felicidad ordinaria viene siempre acompañada de expectativa y apego. Como todo cambia, esas expectativas tarde o temprano producen sufrimiento.'},
      {id:'s5e3', name:'Sufrimiento omnipresente', text:'Aunque tengas todo lo que crees que te haría feliz — trabajo, casa, pareja — ¿sigue habiendo, debajo, una sensación sutil de incompletitud?'},
      {id:'s5e4', name:'Renuncia', text:'Reconoce que no hay felicidad verdaderamente duradera dentro del samsara. Conecta con el deseo genuino de ser libre de este patrón.'},
      {id:'s5e5', name:'Amor y compasión', text:'Así como tú deseas ser libre de sufrimiento, desea lo mismo para todos los seres: "Que seas feliz... que estés libre de sufrimiento."'}
    ]},
  { id:'s6', phase:'fase1', group:'seis', order:6, name:'Los beneficios de la liberación', target:8.5, rotate:true,
    etapas:[
      {id:'s6e1', name:'El estado despierto', text:'Imagina estar completamente libre de sufrimiento, habitando una felicidad duradera, siendo la encarnación de consciencia, compasión y sabiduría.'},
      {id:'s6e2', name:'Beneficio para otros', text:'Tu propia liberación te dará la capacidad real de ayudar a incontables seres en su propio camino hacia la libertad.'},
      {id:'s6e3', name:'Aprecio por el linaje', text:'Aprecia las herramientas que el linaje te ha entregado. Con esta práctica acumulas mérito y sabiduría rumbo al despertar.'}
    ]},

  { id:'n1', phase:'fase1', group:'mente', order:7, name:'Quietud, Movimiento y Consciencia', target:25, rotate:true,
    etapas:[
      {id:'n1e1', name:'Quietud o movimiento', text:'Nota si tu mente está quieta o en movimiento en este instante, sin intentar controlar ni provocar ninguno de los dos estados.'},
      {id:'n1e2', name:'Naturaleza de quietud y movimiento', text:'¿La naturaleza de la quietud es igual o diferente a la del movimiento? ¿Tiene ubicación, forma, color, límites?'},
      {id:'n1e3', name:'El que conoce', text:'Vuelve la atención hacia la consciencia misma: ¿el que conoce la quietud es el mismo que conoce el movimiento?'}
    ]},

  { id:'b1', phase:'fase2', group:'bodhi', order:8, name:'Bondad amorosa y compasión', target:10, rotate:false,
    etapas:[
      {id:'b1e1', name:'Reconocer el deseo de felicidad', text:'Nota cómo cada cosa que haces — parpadear, comer, trabajar, meditar — expresa, en el fondo, el deseo de ser feliz y de estar libre de sufrimiento.'}
    ]},
  { id:'b2', phase:'fase2', group:'bodhi', order:9, name:'Amor y compasión inmensurables', target:10, rotate:true,
    etapas:[
      {id:'b2e1', name:'Ser querido', text:'Piensa en alguien cercano a ti: "Que tengas felicidad y las causas de la felicidad. Que estés libre de sufrimiento y de sus causas."'},
      {id:'b2e2', name:'Persona neutral', text:'Repite el mismo deseo con alguien que no te importa particularmente — el cartero, quien te cobra en la tienda.'},
      {id:'b2e3', name:'Persona difícil', text:'Repite el deseo con alguien que te cae mal, reconociendo que su conducta también nace de un deseo de felicidad, aunque esté mal encausado.'},
      {id:'b2e4', name:'Uno mismo', text:'"Que yo tenga felicidad y las causas de la felicidad. Que yo esté libre de sufrimiento y de sus causas."'},
      {id:'b2e5', name:'Todos los seres', text:'Extiende el mismo deseo a todos los seres, humanos y no humanos, sin excepción.'}
    ]},
  { id:'b3', phase:'fase2', group:'bodhi', order:10, name:'Bodhichitta de aspiración', target:10, rotate:false,
    etapas:[
      {id:'b3e1', name:'Deseo de que todos despierten', text:'"Quiero ayudar a todos los seres a reconocer su naturaleza búdica y a convertirse en budas."'}
    ]},
  { id:'b4', phase:'fase2', group:'bodhi', order:11, name:'Bodhichitta de aplicación', target:10, rotate:false,
    etapas:[
      {id:'b4e1', name:'Dedicar cada actividad', text:'Extiende esta resolución a comer, ejercitarte, estudiar, dormir: "Que esto me ayude a convertirme en buda para poder beneficiar a todos los seres."'}
    ]},
  { id:'b5', phase:'fase2', group:'bodhi', order:12, name:'Bodhichitta absoluta', target:10, rotate:false,
    etapas:[
      {id:'b5e1', name:'Más allá de los conceptos', text:'Todo es impermanente, interdependiente, múltiple — y aun estas mismas ideas son conceptos. Suelta la reflexión y simplemente descansa en consciencia abierta.'}
    ]},

  { id:'n2', phase:'fase2', group:'mente', order:13, name:'Todos los Fenómenos Surgen de la Mente', target:25, rotate:false,
    etapas:[
      {id:'n2e1', name:'Objetos externos', text:'Examina un objeto que percibes: ¿existe separado de tu mente que lo percibe, o solo lo conoces a través de la experiencia mental de percibirlo?'},
      {id:'n2e2', name:'Pensamientos', text:'Examina un pensamiento: ¿de dónde surge, dónde permanece mientras está presente, y hacia dónde se va cuando cesa?'},
      {id:'n2e3', name:'Emociones', text:'Trae una emoción y obsérvala de la misma manera: origen, permanencia, disolución. ¿Es tan sólida como parecía?'},
      {id:'n2e4', name:'El cuerpo', text:'Examina la sensación de tener un cuerpo: ¿dónde exactamente está "tú" dentro de esa experiencia?'},
      {id:'n2e5', name:'La mente misma', text:'Busca directamente la mente que ha estado examinando todo lo anterior: ¿tiene forma, color, ubicación?'},
      {id:'n2e6', name:'Descansar', text:'Suelta la indagación analítica y simplemente descansa en consciencia abierta, sin buscar ni fabricar nada.'}
    ]}
];

// Refugio — no lleva horas propias objetivo (no es una de las 3 fases de horas), es la práctica que acompaña las postraciones
const REFUGIO = {
  name: 'Refugio (con postraciones)',
  etapas: [
    {id:'r1', name:'Visualiza el árbol de refugio', text:'Frente a ti, en el espacio, visualiza el árbol de refugio: Padmasambhava (Guru Rinpoché) al centro, rodeado de budas, del Dharma, de la Sangha, de tus maestros del linaje, de Dorje Drolo y los yidams debajo, y los protectores más abajo.'},
    {id:'r2', name:'El campo de méritos completo', text:'Reconoce que cada figura del árbol representa una fuente genuina de refugio: la sabiduría del Buda, la verdad del Dharma, el apoyo de la Sangha, y la bendición directa de tu linaje.'},
    {id:'r3', name:'Toma refugio con el cuerpo', text:'Al postrarte, tu cuerpo expresa físicamente la entrega: te inclinas ante estas fuentes de refugio como gesto de confianza y apertura.'},
    {id:'r4', name:'Recita el mantra de refugio', text:'Repite en voz alta o mental la estrofa de refugio (ver abajo) mientras te postras, sintiendo que te vuelves inseparable de las fuentes de refugio.'},
    {id:'r5', name:'Disuelve la visualización', text:'Al terminar tus postraciones, el árbol de refugio se disuelve en luz y se funde contigo — las fuentes de refugio y tú os volvéis inseparables.'}
  ]
};

const MANTRA_REFUGIO = {
  title: 'Mantra de Refugio (postraciones)',
  lines: [
    { bo:'OM AH HUNG CHÖ KU LONG KU TRÜL KU TSOK', es:'En ustedes, asamblea de los tres kayas,' },
    { bo:'KYAP NÉ TAM PA KYÉ NAM LA', es:'genuinas fuentes de refugio,' },
    { bo:'TENG NÉ SANG GYÉ DRUP KYI BAR', es:'desde ahora y hasta alcanzar la budeidad,' },
    { bo:'YER MÉ NGANG DU KYAP SU CHI', es:'tomo refugio, inseparable de ustedes.' }
  ]
};

// Estructura sugerida de sesión (90 min, guía pág. de horarios de muestra)
const SESSION_TEMPLATE = [
  { key:'apertura', name:'Cantos de apertura y liturgia', pct:15/90 },
  { key:'contemplar', name:'Contemplación del tema del día (alternando con descanso en consciencia)', pct:20/90 },
  { key:'postraciones', name:'Postraciones recitando el mantra de refugio', pct:40/90 },
  { key:'mente', name:'Meditación de naturaleza de la mente', pct:10/90 },
  { key:'cierre', name:'Dedicación y cantos de cierre', pct:5/90 }
];

const RETREAT_SCHEDULES = [
  { hours:6, sessions:5, note:'Retiro corto de 6 horas — 5 sesiones repartidas en el día con descansos para comer.' },
  { hours:8, sessions:5, note:'Retiro medio de 8 horas — mismas 5 sesiones, con más tiempo de contemplación/postración por sesión.' },
  { hours:10, sessions:5, note:'Retiro completo de 10 horas — jornada tipo "día de retiro" según la guía.' }
];

const GROUP_LABEL = { seis:'Los Seis Pensamientos', bodhi:'Bodhichitta', mente:'Naturaleza de la Mente' };
const PROST_MIN = 27777, PROST_MAX = 111111;
const RETREAT_MIN_MIN = 360; // 6h mínimo para contar como día de retiro
