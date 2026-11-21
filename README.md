# Recupero Lezioni

Webapp personale per tenere traccia delle lezioni universitarie (PoliMi) da recuperare e organizzare lo studio tra PC, iPad e iPhone.

## Obiettivi
- Tenere una lista ordinata delle lezioni ed esercitazioni perse, divise per materia e settimana.
- Stimare il tempo reale di recupero in base alle durate effettive (slot 2h = 1h 30m, slot 3h = 2h 15m), alla velocità di riproduzione e all'obiettivo giornaliero.
- Segnare lo stato di avanzamento di ogni lezione (`Da vedere`, `Vista`, `Appunti OK`, `Completata`) con argomento e note.
- Pianificare le sessioni su Google Calendar o tramite file `.ics`.
- Sincronizzare i dati tra più dispositivi usando Supabase (con fallback locale + backup JSON).

## Struttura
- `index.html` — interfaccia e logica della webapp (HTML + Tailwind CDN + Vanilla JS, nessun build step).
- `config.js` — configurazione opzionale per Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SYNC_KEY`).
- `supabase_setup.sql` — tabella `study_state`, blocco RLS e funzioni RPC per il sync.
- `manifest.json` / `icon.svg` — supporto PWA per aggiungerla alla schermata Home su iOS/iPadOS.

## Setup

### 1. Database su Supabase
1. Crea un progetto su [supabase.com](https://supabase.com) (piano Free).
2. Apri **SQL Editor** ed esegui il contenuto di `supabase_setup.sql`.
3. In **Project Settings → API** recupera `Project URL` e la chiave `anon public`.

### 2. Configurazione Sync
Puoi inserire `SUPABASE_URL`, `SUPABASE_ANON_KEY` e una `SYNC_KEY` personale direttamente in `config.js`, oppure lasciare `config.js` vuoto e inserirli una volta sola dall'app tramite il pulsante **Sync** (restano salvati in `localStorage` sul dispositivo).

### 3. Pubblicazione su GitHub Pages
1. Carica i file nella root del repository (`index.html`, `config.js`, `manifest.json`, `icon.svg`).
2. Vai su **Settings → Pages**, seleziona il branch `main` e la cartella `/ (root)`.

Su iPhone/iPad basta aprire la pagina in Safari e usare **Condividi → Aggiungi alla schermata Home**.

> Nota: sul piano gratuito Supabase mette in pausa il progetto dopo 7 giorni di inattività (si riattiva con un clic dalla dashboard).
