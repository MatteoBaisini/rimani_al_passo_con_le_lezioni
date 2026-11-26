// Corsi, orario PoliMi e lezioni predefinite.
//
// Per aggiungere lezioni nuove ai dispositivi già in uso:
//   1. aggiungi le lezioni a DEFAULT_LESSONS con `since: N`, dove N = SEED_VERSION + 1;
//   2. porta SEED_VERSION a N.
// Al prossimo avvio ogni dispositivo aggiunge le lezioni con `since` > della sua versione
// (tranne quelle eliminate) e completa argomento/note se sono vuoti. Nessuna migrazione da scrivere.
// Le lezioni senza `since` fanno parte della versione 1.
export const SEED_VERSION = 1;

// Exact PoliMi weekly timetable: 2h slot -> 90m effective, 3h slot -> 135m effective
export const COURSES = [
  {
    id: 'ACSO',
    name: 'ACSO',
    fullName: 'Architettura dei Calcolatori e Sistemi Operativi',
    color: '#2563EB',
    tint: 'rgba(37, 99, 235, 0.10)',
    defaultDuration: 135,
    schedule: [
      { dow: 2, start: '08:15', end: '11:15', room: 'B.4.4', slotHours: 3, duration: 135, type: 'Lezione' },
      { dow: 4, start: '10:15', end: '13:15', room: '7.1.3', slotHours: 3, duration: 135, type: 'Lezione' },
      { dow: 5, start: '08:15', end: '11:15', room: '5.03',  slotHours: 3, duration: 135, type: 'Lezione' }
    ]
  },
  {
    id: 'ONDE',
    name: 'ONDE',
    fullName: 'Onde Elettromagnetiche e Mezzi Trasmissivi',
    color: '#EA580C',
    tint: 'rgba(234, 88, 12, 0.10)',
    defaultDuration: 90,
    schedule: [
      { dow: 3, start: '14:15', end: '16:15', room: '8.1.1', slotHours: 2, duration: 90, type: 'Lezione' },
      { dow: 4, start: '08:15', end: '10:15', room: 'B.2.4', slotHours: 2, duration: 90, type: 'Lezione' }
    ]
  },
  {
    id: 'LEA',
    name: 'LEA',
    fullName: 'Logica e Algebra',
    color: '#DB2777',
    tint: 'rgba(219, 39, 119, 0.10)',
    defaultDuration: 90,
    schedule: [
      { dow: 2, start: '14:15', end: '16:15', room: '25.S.3', slotHours: 2, duration: 90, type: 'Lezione' },
      { dow: 5, start: '14:15', end: '16:15', room: '9.0.1',  slotHours: 2, duration: 90, type: 'Esercitazione' }
    ]
  },
  {
    id: 'ANALISI2',
    name: 'ANALISI II',
    fullName: 'Analisi Matematica 2',
    color: '#7C3AED',
    tint: 'rgba(124, 58, 237, 0.10)',
    defaultDuration: 135,
    schedule: [
      { dow: 2, start: '11:15', end: '13:15', room: 'B.4.4', slotHours: 2, duration: 90,  type: 'Lezione' },
      { dow: 4, start: '14:15', end: '17:15', room: 'T.2.3', slotHours: 3, duration: 135, type: 'Lezione' },
      { dow: 5, start: '16:15', end: '19:15', room: '3.1.2', slotHours: 3, duration: 135, type: 'Lezione' }
    ]
  }
];

export const DEFAULT_LESSONS = [
  // ACSO (3h slot -> 135 min effective)
  { id: 'acso-2026-11-19', courseId: 'ACSO', date: '2026-11-19', type: 'Lezione', duration: 135, stage: 0, topic: '', url: '', notes: '', scheduled: '' },

  // ONDE (2h slot -> 90 min effective)
  { id: 'onde-2026-11-11', courseId: 'ONDE', date: '2026-11-11', type: 'Lezione', duration: 90, stage: 0, topic: '', url: '', notes: '', scheduled: '' },
  { id: 'onde-2026-11-12', courseId: 'ONDE', date: '2026-11-12', type: 'Lezione', duration: 90, stage: 0, topic: '', url: '', notes: '', scheduled: '' },
  { id: 'onde-2026-11-18', courseId: 'ONDE', date: '2026-11-18', type: 'Lezione', duration: 90, stage: 0, topic: '', url: '', notes: '', scheduled: '' },
  { id: 'onde-2026-11-19', courseId: 'ONDE', date: '2026-11-19', type: 'Lezione', duration: 90, stage: 0, topic: '', url: '', notes: '', scheduled: '' },

  // LEA (2h slot -> 90 min effective, verificato su Diario L&A 2026)
  { id: 'lea-2026-10-09', courseId: 'LEA', date: '2026-10-09', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 5 — Precedenze sui connettivi. Interpretazione di una f.b.f. Nozione di soddisfacibile, modello per una formula e di un insieme di formule. Tautologie. Cenno ai problemi NP-completi e 3SAT. Nozione di conseguenza semantica, esempio. Teorema di deduzione semantica e teorema che lega insoddisfacibilità e conseguenza semantica. Equivalenza semantica, classi di equivalenza e costruzioni di rappresentanti dalla tavola di verità: forma normale congiuntiva e disgiuntiva.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-10-16', courseId: 'LEA', date: '2026-10-16', type: 'Esercitazione', duration: 90, stage: 0, topic: 'Esercitazione 3 — Logica proposizionale: sintassi e semantica.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-10-23', courseId: 'LEA', date: '2026-10-23', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 7 — Idea di formula del primo ordine scrivendo una frase in linguaggio naturale. Sintassi logica del primo ordine. Alfabeto: variabili, costanti, lettere funzionali, lettere predicative, connettivi logici. Nozione di termine, nozione di formula atomica e definizione di formule ben formate. Sottoformule e albero delle sottoformule. Campi di azioni di quantificatori, variabili libere e vincolate, chiusura universale ed esistenziale. Variabile libera per un\'altra.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-10-27', courseId: 'LEA', date: '2026-10-27', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 8 — Semantica: interpretazione e nozione di assegnamento. Soddisfacibilità di una formula. Nozione di formula soddisfacibile, vera, non-vera, falsa. Esempi. Logicamente valida e insoddisfacibile. Esempi di tautologie.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-11-03', courseId: 'LEA', date: '2026-11-03', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 9 — Ripasso. Definizione di modello per un insieme di formule, conseguenza semantica e insoddisfacibile. Teorema che lega insoddisfacibilità e conseguenza semantica, teorema di deduzione semantica. Esempi. Forma normale prenessa, esempi ed algoritmo, preserva l\'equivalenza semantica.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-11-06', courseId: 'LEA', date: '2026-11-06', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 10 — Forma di Skolem, algoritmo e teorema di Skolem (preserva l\'insoddisfacibilità). Forma a clausole ed estrazioni di clausole da una f.b.f. Idea della risolvente e di unificatore. Sostituzione, unificatore, composizione di sostituzioni.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-11-10', courseId: 'LEA', date: '2026-11-10', type: 'Esercitazione', duration: 90, stage: 0, topic: 'Esercitazione 5 — Logica del I ordine: sintassi e semantica.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-11-13', courseId: 'LEA', date: '2026-11-13', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 11 — Unificatore più generale e algoritmo per il calcolo di un unificatore più generale. Risolvente tra due clausole. Derivazione di una clausola per risoluzione. Teorema di correttezza e completezza per refutazione. Corollario per verificare se una formula è conseguenza semantica di un insieme di formule. Osservazioni finali sulla decidibilità della risoluzione. Cenno alla Teoria K, assiomi, regole d\'inferenza e teorema di correttezza e completezza. Esempi.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-11-17', courseId: 'LEA', date: '2026-11-17', type: 'Esercitazione', duration: 90, stage: 0, topic: 'Esercitazione 6 — Risoluzione per la logica del primo ordine.', url: '', notes: '', scheduled: '' },
  { id: 'lea-2026-11-20', courseId: 'LEA', date: '2026-11-20', type: 'Lezione', duration: 90, stage: 0, topic: 'Lezione 12 — Unificatore più generale e algoritmo per il calcolo di un unificatore più generale. Risolvente tra due clausole. Derivazione di una clausola per risoluzione. Teorema di correttezza e completezza per refutazione. Corollario per verificare se una formula è conseguenza semantica di un insieme di formule. Osservazioni finali sulla decidibilità della risoluzione. Cenno alla Teoria K, assiomi, regole d\'inferenza e teorema di correttezza e completezza. Esempi.', url: '', notes: '', scheduled: '' },
  // ANALISI II — teoria prof.ssa Noris (registrazioni WeBeep, durate reali dei video)
  { id: 'analisi2-2026-10-06', courseId: 'ANALISI2', date: '2026-10-06', type: 'Lezione', duration: 91, stage: 0, topic: 'Lezione 7 — Serie di potenze reali. Definizione di serie di potenze centrata in x0 e insieme di convergenza. Raggio di convergenza: esistenza e calcolo con il criterio del rapporto e della radice. Studio del comportamento agli estremi dell\'intervallo di convergenza. Convergenza totale su ogni intervallo chiuso contenuto nell\'intervallo di convergenza.', url: '', notes: 'Video Noris: 91 min · Appunti: AM2-2026-10-06.pdf · Dispensa §2.2 Serie di potenze · Homework 2-2', scheduled: '' },
  { id: 'analisi2-2026-10-08', courseId: 'ANALISI2', date: '2026-10-08', type: 'Lezione', duration: 105, stage: 0, topic: 'Lezione 8 — Serie di potenze: integrabilità e derivabilità termine a termine (il raggio non cambia). Funzioni analitiche reali e serie di Taylor/Mac Laurin, sviluppi notevoli (e^x, sin, cos, ln(1+x), arctan). Cenni alle serie di potenze in campo complesso e dimostrazione della formula di Eulero.', url: '', notes: 'Video Noris: 105 min · Appunti: AM2-2026-10-08.pdf · Dispensa §2.2 Serie di potenze · Homework 2-2', scheduled: '' },
  { id: 'analisi2-2026-10-13', courseId: 'ANALISI2', date: '2026-10-13', type: 'Lezione', duration: 82, stage: 0, topic: 'Lezione 9 — Introduzione alle serie di Fourier. Funzioni periodiche e periodo, armoniche n-esime, polinomi trigonometrici e serie trigonometriche. Definizione dei coefficienti di Fourier (a0, an, bn) di una funzione periodica e serie di Fourier associata; semplificazioni per funzioni pari e dispari.', url: '', notes: 'Video Noris: 82 min · Appunti: AM2-2026-10-13.pdf · Dispensa §2.3 Serie di Fourier · slide "2-3-intro-Fourier" · Homework 2-3', scheduled: '' },
  { id: 'analisi2-2026-10-15', courseId: 'ANALISI2', date: '2026-10-15', type: 'Lezione', duration: 133, stage: 0, topic: 'Lezione 10 — Serie di Fourier: calcolo dei coefficienti per funzioni periodiche, funzioni regolari a tratti. Teoremi di convergenza: convergenza puntuale (alla media dei limiti destro e sinistro nei salti) e convergenza totale per funzioni continue e regolari a tratti. Convergenza in media quadratica e identità di Bessel-Parseval, con applicazione al calcolo di somme di serie numeriche.', url: '', notes: 'Video Noris: 133 min · Appunti: AM2-2026-10-15.pdf · Dispensa §2.3 Serie di Fourier · slide "2-3-funzioni-regolari-a-tratti" · Homework 2-3', scheduled: '' },
  { id: 'analisi2-2026-10-20', courseId: 'ANALISI2', date: '2026-10-20', type: 'Lezione', duration: 80, stage: 0, topic: 'Lezione 11 — Cenni alla forma esponenziale (complessa) della serie di Fourier e legame con i coefficienti reali. Inizio del capitolo 3: cenni di topologia in R^n — norma e distanza, intorni, punti interni, esterni e di frontiera, insiemi aperti, chiusi, limitati e connessi.', url: '', notes: 'Video Noris: 80 min · Appunti: AM2-2026-10-20.pdf · Dispensa §2.3 Serie di Fourier, §3.1 Topologia in R^n', scheduled: '' },
  { id: 'analisi2-2026-10-22', courseId: 'ANALISI2', date: '2026-10-22', type: 'Lezione', duration: 125, stage: 0, topic: 'Lezione 12 — Curve nel piano e nello spazio: curva parametrica e sostegno. Curve semplici, chiuse, regolari e regolari a tratti. Vettore e versore tangente. Lunghezza di una curva regolare (integrale della norma della derivata) e invarianza della lunghezza per riparametrizzazioni.', url: '', notes: 'Video Noris: 125 min · Appunti: AM2-2026-10-22.pdf · Dispensa §3.2 Curve nel piano e nello spazio · Homework 3-2', scheduled: '' },
  { id: 'analisi2-2026-11-03', courseId: 'ANALISI2', date: '2026-11-03', type: 'Lezione', duration: 88, stage: 0, topic: 'Lezione 13 — Integrale curvilineo (di prima specie) di una funzione lungo una curva regolare e sue proprietà. Introduzione alle funzioni di due variabili: dominio, grafico, insiemi (curve) di livello, restrizione a una curva. Definizione di limite per funzioni di due variabili.', url: '', notes: 'Video Noris: 88 min · Appunti: AM2-2026-11-03.pdf · Dispensa §3.2 Curve, §3.3 Limiti e continuità · slide "3-3-intro-funz2var"', scheduled: '' },
  { id: 'analisi2-2026-11-05', courseId: 'ANALISI2', date: '2026-11-05', type: 'Lezione', duration: 118, stage: 0, topic: 'Lezione 14 — Limiti di funzioni di due variabili: come dimostrare la non esistenza del limite (restrizioni a rette e curve) e calcolo dei limiti con le coordinate polari (stima uniforme in theta). Continuità. Inizio del capitolo 4: funzione derivabile, derivate parziali e gradiente.', url: '', notes: 'Video Noris: 118 min · Appunti: AM2-2026-11-05.pdf · Dispensa §3.3 Limiti e continuità, §4.1 Derivabilità · slide "3-3-limiti-funz2var", "4-1-derivabilita-funz2var" · Homework 3-3', scheduled: '' },
  { id: 'analisi2-2026-11-10', courseId: 'ANALISI2', date: '2026-11-10', type: 'Lezione', duration: 89, stage: 0, topic: 'Lezione 15 — Differenziabilità per funzioni di due variabili: definizione, differenziabile implica continua, piano tangente al grafico. Teorema del differenziale totale (derivate parziali continue implicano differenziabilità). Derivate direzionali.', url: '', notes: 'Video Noris: 89 min · Appunti: AM2-2026-11-10.pdf · Dispensa §4.1 Derivabilità e differenziabilità · Homework 4-1', scheduled: '' },
  { id: 'analisi2-2026-11-12', courseId: 'ANALISI2', date: '2026-11-12', type: 'Lezione', duration: 100, stage: 0, topic: 'Lezione 16 — Conseguenze della differenziabilità: formula del gradiente per le derivate direzionali, derivata della restrizione a una curva (regola della catena). Ortogonalità del gradiente alle curve di livello e direzione di massima crescita.', url: '', notes: 'Video Noris: 100 min · Appunti: AM2-2026-11-12.pdf · Dispensa §4.1 Derivabilità e differenziabilità · Homework 4-1', scheduled: '' },
  { id: 'analisi2-2026-11-17', courseId: 'ANALISI2', date: '2026-11-17', type: 'Lezione', duration: 86, stage: 0, topic: 'Lezione 17 — Introduzione all\'ottimizzazione per funzioni di due variabili: punti di estremo (massimo/minimo) locale e globale. Matrice Hessiana e sviluppo di Taylor al secondo ordine. Punti critici (stazionari).', url: '', notes: 'Video Noris: 86 min · Appunti: AM2-2026-11-17.pdf · Dispensa §4.2 Introduzione all\'ottimizzazione · slide "4-2-intro-ottimizzazione"', scheduled: '' },
  { id: 'analisi2-2026-11-19', courseId: 'ANALISI2', date: '2026-11-19', type: 'Lezione', duration: 117, stage: 0, topic: 'Lezione 18 — Ottimizzazione libera: teorema di Fermat, classificazione dei punti critici con il criterio della matrice Hessiana (massimo, minimo, sella) e indagine diretta del segno quando il test non decide. Cenni all\'ottimizzazione di funzioni convesse/concave. Teorema di Weierstrass.', url: '', notes: 'Video Noris: 117 min · Appunti: AM2-2026-11-19.pdf · Dispensa §4.3 Ottimizzazione libera', scheduled: '' },
  { id: 'analisi2-2026-11-24', courseId: 'ANALISI2', date: '2026-11-24', type: 'Lezione', duration: 83, stage: 0, topic: 'Lezione 19 — Ottimizzazione vincolata su una curva piana: metodo di sostituzione (esplicitando o parametrizzando il vincolo) e metodo dei moltiplicatori di Lagrange. Ricerca di massimi e minimi assoluti su domini chiusi e limitati.', url: '', notes: 'Video Noris: 83 min · Appunti: AM2-2026-11-24.pdf · Dispensa §4.4 Ottimizzazione vincolata · Homework 4-3', scheduled: '' },
  // ANALISI II — esercitazioni Migliavacca (slot 3h -> 135 min effettivi)
  { id: 'analisi2-es3-2026-10-09', courseId: 'ANALISI2', date: '2026-10-09', type: 'Esercitazione', duration: 135, stage: 0, topic: 'Esercitazione 3 — Sistemi differenziali lineari a coefficienti costanti: integrale generale con autovalori e autovettori, riduzione a un\'EDO del 2° ordine, matrice esponenziale e^{At}, autovalori complessi coniugati, sistema 3×3, problemi di Cauchy e matrice Wronskiana. EDO lineari del 2° ordine complete: metodo di somiglianza, principio di sovrapposizione, risonanza. (Teoria già fatta)', url: '', notes: 'Note Migliavacca: Esercitazione 3, 9 ottobre 2026.pdf · Verifica d\'esame: TdE 2025-01-20 Es.1 · TdE 2025-07-07 Es.1 · TdE 2024-08-28 Es.1 · TdE 2024-02-08 Es.3 · TdE 2026-08-27 Es.1 (soluzioni nei file -SOL) · Extra: Es2 (25/09) ed Es3 (02/10) lato Noris', scheduled: '' },
  { id: 'analisi2-es4-2026-10-16', courseId: 'ANALISI2', date: '2026-10-16', type: 'Esercitazione', duration: 135, stage: 0, topic: 'Esercitazione 4 — EDO del 2° ordine a coefficienti costanti: forzanti trigonometriche e polinomiali, risonanza, soluzioni infinitesime e periodiche al variare di un parametro, problemi di Cauchy, equazioni di ordine superiore (teoria già fatta). Domini di funzioni di più variabili e proprietà topologiche: aperto, chiuso, limitato, connesso (dopo Lez. 13).', url: '', notes: 'Note Migliavacca: Esercitazione 4, 17 ottobre 2026.pdf · Verifica d\'esame: TdE 2026-01-27 Es.1 · TdE 2025-06-06 Es.1 · TdE 2024-02-08 Es.2(i) · TdE 2026-07-13 Es.3(i) (soluzioni nei file -SOL)', scheduled: '' },
  { id: 'analisi2-es5-2026-10-23', courseId: 'ANALISI2', date: '2026-10-23', type: 'Esercitazione', duration: 135, stage: 0, topic: 'Esercitazione 5 — Domini, topologia e insiemi di livello: segno, insiemi di livello al variare di c, immagine di una funzione. Curve: semplici, chiuse, regolari e regolari a tratti, versore tangente, lunghezza di una curva e di un grafico, astroide; massa di un filo (integrale curvilineo). (Dopo Lez. 13)', url: '', notes: 'Note Migliavacca: Esercitazione 5, 23 ottobre2026.pdf · Verifica d\'esame: TdE 2025-09-10 Es.3(i) · TdE 2026-06-17 Es.3(i) · TdE 2025-07-07 Es.3 · TdE 2026-02-20 Es.2 (soluzioni nei file -SOL)', scheduled: '' },
  { id: 'analisi2-es6-2026-11-06', courseId: 'ANALISI2', date: '2026-11-06', type: 'Esercitazione', duration: 135, stage: 0, topic: 'Esercitazione 6 — Curve nello spazio e in forma polare, integrali curvilinei (dopo Lez. 13). Serie di funzioni e serie di potenze: convergenza puntuale, assoluta e totale, raggio e insieme di convergenza con studio degli estremi, integrazione termine a termine, sviluppo di Taylor di log(1+x) con resto di Lagrange (dopo Lez. 8).', url: '', notes: 'Note Migliavacca: Esercitazione 6, 6 novembre 2026.pdf · Verifica d\'esame: TdE 2024-01-19 Es.3(ii) · TdE 2024-02-08 Es.1 · TdE 2024-01-19 Es.2 (soluzioni nei file -SOL) · Extra: Es4 lato Noris (09/10, serie di potenze) · video Pregnolato 06/11', scheduled: '' },
  { id: 'analisi2-es7-2026-11-13', courseId: 'ANALISI2', date: '2026-11-13', type: 'Esercitazione', duration: 135, stage: 0, topic: 'Esercitazione 7 — Argomento da integrare (note non pubblicate, disponibile solo la registrazione).', url: '', notes: 'Registrazione Migliavacca del 13/11 · PDF delle note da integrare', scheduled: '' },
  { id: 'analisi2-es8-2026-11-20', courseId: 'ANALISI2', date: '2026-11-20', type: 'Esercitazione', duration: 135, stage: 0, topic: 'Esercitazione 8 — Serie di Fourier: estensione periodica, coefficienti per funzioni pari/dispari e periodo T≠2π, convergenza in media quadratica, puntuale e totale, Parseval per sommare serie numeriche (dopo Lez. 10). Funzioni di due variabili: limiti (non esistenza, stime, coordinate polari), continuità, derivabilità e differenziabilità (dopo Lez. 16).', url: '', notes: 'Note Migliavacca: Esercitazione 8, 20 novembre 2026.pdf · Verifica d\'esame: TdE 2026-02-20 Es.1 · TdE 2025-02-13 Es.2 · TdE 2025-09-10 Es.1 · TdE 2024-07-15 Es.1 · TdE 2026-08-27 Es.2 · TdE 2024-02-08 Es.2(ii) (soluzioni nei file -SOL) · Extra: Es5 lato Noris (16/10, Fourier) · video Pregnolato 13/11 e 20/11', scheduled: '' }
];
