// Configurazione Sync Cloud (Supabase Free Tier)
// URL e Anon Key possono stare qui: la anon key è pubblica per design e la tabella
// è protetta (accesso solo tramite RPC che richiedono la SYNC_KEY esatta).
//
// La SYNC_KEY NON si mette qui (e l'app non la legge da questo file): il file è pubblico
// su GitHub Pages. Va inserita (o generata) dall'app, pulsante "Sync", una volta per
// dispositivo. Un dispositivo che non si sincronizza da 30 giorni viene scollegato e
// richiede di reinserirla.
window.APP_CONFIG = {
  SUPABASE_URL: "",       // es. "https://xxxxxxxxxxxx.supabase.co"
  SUPABASE_ANON_KEY: ""   // es. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
