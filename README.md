# Recupero Lezioni — Guida al Deploy Gratis (€0)

Questa cartella contiene tutto il necessario per mettere online la Web App gratis su **GitHub Pages** e sincronizzarla in tempo reale tra **PC, iPad e iPhone** tramite **Supabase Free Tier** (nessuna carta di credito richiesta).

---

## 1. Crea il database gratis su Supabase (2 minuti)
1. Vai su [supabase.com](https://supabase.com), accedi con GitHub e clicca **New Project**.
2. Scegli un nome (es. `recupero-lezioni`), regione **West EU (Ireland)** o **Central EU (Frankfurt)**, piano **Free ($0/mo)** e crea il progetto.
3. Appena pronto, apri **SQL Editor** nella barra a sinistra, clicca **New query**, incolla tutto il contenuto del file `supabase_setup.sql` e premi **Run**.
4. Vai in **Project Settings → API** e copia due valori:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Project API keys → `anon` `public`**

---

## 2. Inserisci le chiavi in `config.js` (30 secondi)
Apri `config.js` e incolla `SUPABASE_URL`, `SUPABASE_ANON_KEY` e una tua `SYNC_KEY` personale (es. una parola/codice che conosci solo tu, così nessuno può sovrascrivere i tuoi dati).

> **Nota privacy:** Se il repository GitHub è pubblico, chiunque può leggere `config.js`. Per un tracker personale di lezioni va benissimo se usi una `SYNC_KEY` lunga e casuale, oppure puoi lasciare `config.js` vuoto e inserire le credenziali una volta sola dentro l'app dal tasto **Cloud Sync** (vengono salvate in `localStorage` sul dispositivo).

---

## 3. Pubblica gratis su GitHub Pages (2 minuti)
1. Crea un nuovo repository su GitHub (es. `recupero-lezioni`).
2. Carica tutti i file di questa cartella (`index.html`, `config.js`, `manifest.json`, `icon.svg`) direttamente nella root del repository (o fai `git push`).
3. Nel repository vai su **Settings → Pages**.
4. Sotto **Build and deployment → Source**, scegli **Deploy from a branch**, seleziona **`main`** e cartella **`/ (root)`**, poi clicca **Save**.
5. Dopo ~60 secondi la tua app sarà online all'indirizzo:
   `https://<tuo-username>.github.io/recupero-lezioni/`

---

## 4. Installala su iPhone e iPad come app nativa
1. Apri il link di GitHub Pages su **Safari**.
2. Tocca il pulsante **Condividi** (quadrato con freccia in su) → **Aggiungi alla schermata Home**.
3. Si aprirà a schermo intero senza barra del browser e resterà sincronizzata automaticamente con il PC.

---

## Nota sul piano Free di Supabase
Supabase mette in pausa i progetti gratuiti solo dopo **7 giorni consecutivi di totale inattività**. Se usi l'app almeno una volta a settimana resta sempre attivo; se mai andasse in pausa (es. dopo le vacanze), basta cliccare **Restore project** dalla dashboard Supabase.
