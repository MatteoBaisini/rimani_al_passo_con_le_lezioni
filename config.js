// Configurazione Sync Cloud (Supabase Free Tier)
// URL e Anon Key possono stare qui: la anon key è pubblica per design e la tabella
// è protetta (accesso solo tramite RPC che richiedono la SYNC_KEY esatta).
//
// NON inserire qui la SYNC_KEY: questo file è pubblico su GitHub Pages e chiunque
// lo legga potrebbe leggere e sovrascrivere i tuoi dati. La SYNC_KEY va inserita
// (o generata) dall'app, pulsante "Sync", una volta per dispositivo.
window.APP_CONFIG = {
  SUPABASE_URL: "",       // es. "https://xxxxxxxxxxxx.supabase.co"
  SUPABASE_ANON_KEY: "",  // es. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  SYNC_KEY: ""            // lascia vuoto (vedi sopra)
};
