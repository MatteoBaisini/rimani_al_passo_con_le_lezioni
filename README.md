# Recupero Lezioni

Webapp personale per tenere traccia delle lezioni universitarie (PoliMi) da recuperare e organizzare lo studio tra PC, iPad e iPhone.

## Obiettivi
- Tenere una lista ordinata delle lezioni ed esercitazioni perse, divise per materia e settimana.
- Stimare il tempo reale di recupero in base alle durate effettive (slot 2h = 1h 30m, slot 3h = 2h 15m), alla velocità di riproduzione e all'obiettivo giornaliero.
- Segnare lo stato di avanzamento di ogni lezione (`Da vedere`, `Iniziata`, `Completata`) con argomento e note.
- Pianificare le sessioni su Google Calendar o tramite file `.ics`.
- Sincronizzare i dati tra più dispositivi usando Supabase (con fallback locale + backup JSON).

## Struttura
Nessun build step: HTML + Tailwind CDN + moduli JavaScript nativi.

- `index.html` — solo il markup dell'interfaccia; carica `js/app.js`.
- `js/data.js` — corsi, orario PoliMi e lezioni predefinite (`DEFAULT_LESSONS`, `SEED_VERSION`).
- `js/state.js` — costanti, validazione, migrazioni e merge tra dispositivi (logica pura, testata).
- `js/store.js` — stato condiviso, salvataggio su `localStorage`.
- `js/sync.js` — sincronizzazione Supabase (controllo dei conflitti, scadenza dei dispositivi).
- `js/render.js` — disegno di sidebar, KPI, materie e lista lezioni.
- `js/ui.js` — gestori di click, modali, Calendar, backup.
- `js/helpers.js` — formattazione e piccoli helper.
- `js/app.js` — avvio.
- `tests.html` — test della logica di `state.js` (si aprono nel browser).
- `serve.ps1` — server statico per provare l'app in locale.
- `config.js` — configurazione opzionale per Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- `supabase_setup.sql` — tabella `study_state`, blocco RLS e funzioni RPC per il sync.
- `manifest.json`, `icon.svg`, `icons/` — supporto PWA e icona per la schermata Home su iOS/iPadOS.

## Sviluppo locale
I moduli JS non si caricano aprendo `index.html` con doppio clic (`file://`): serve un server.

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Poi apri `http://localhost:8080/` per l'app e `http://localhost:8080/tests.html` per i test.

## Aggiungere lezioni predefinite
In `js/data.js`:
1. aggiungi le lezioni a `DEFAULT_LESSONS` con `since: N`, dove `N = SEED_VERSION + 1`;
2. porta `SEED_VERSION` a `N`.

Al prossimo avvio ogni dispositivo aggiunge le lezioni nuove (tranne quelle che hai eliminato) e completa argomento e note se sono vuoti. Non serve scrivere migrazioni.

## Setup

### 1. Database su Supabase
1. Crea un progetto su [supabase.com](https://supabase.com) (piano Free).
2. Apri **SQL Editor** ed esegui il contenuto di `supabase_setup.sql`.
3. In **Project Settings → API** recupera `Project URL` e la chiave `anon public`.

### 2. Configurazione Sync
Puoi inserire `SUPABASE_URL` e `SUPABASE_ANON_KEY` direttamente in `config.js` (la anon key è pubblica per design), oppure inserirli dall'app tramite il pulsante **Sync**.

La `SYNC_KEY` è l'unico segreto che protegge i tuoi dati: **non metterla mai in `config.js`**, che su GitHub Pages è leggibile da chiunque. Inseriscila dall'app (pulsante **Sync** → **Genera chiave**) su un dispositivo, poi copia la stessa chiave sugli altri. Deve avere almeno 24 caratteri e resta salvata solo nel `localStorage` del dispositivo.

**Dispositivi inattivi:** un dispositivo che non si sincronizza da più di 30 giorni viene scollegato (la `SYNC_KEY` locale viene cancellata) e va ricollegato reinserendola. Al ricollegamento i dati locali vengono uniti a quelli del cloud, scartando le lezioni eliminate dagli altri dispositivi nel frattempo.

**Salvataggi contemporanei:** se due dispositivi salvano nello stesso momento, il server accetta solo il primo; l'altro riscarica i dati, li unisce e riprova, quindi nessuna modifica va persa. Dopo aver aggiornato l'app riesegui `supabase_setup.sql` (si può rieseguire senza perdere dati).

### 3. Pubblicazione su GitHub Pages
1. Carica i file nella root del repository (`index.html`, `config.js`, `manifest.json`, `icon.svg`, le cartelle `js/` e `icons/`).
2. Vai su **Settings → Pages**, seleziona il branch `main` e la cartella `/ (root)`.

Su iPhone/iPad basta aprire la pagina in Safari e usare **Condividi → Aggiungi alla schermata Home**.

> Nota: sul piano gratuito Supabase mette in pausa il progetto dopo 7 giorni di inattività (si riattiva con un clic dalla dashboard).
