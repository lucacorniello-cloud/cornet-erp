# Cornet ERP 0.2 — Importazioni WINDTRE Business SME

Moduli disponibili:

- autenticazione e dashboard;
- CRM Business SME;
- caricamento Excel DB Tool WINDTRE;
- storico delle estrazioni mensili;
- confronto clienti, asset, piani, canoni, servizi e campagne;
- collegamento automatico dei record importati alle anagrafiche cliente;
- migrazioni Alembic e volume PostgreSQL persistente.

Primo avvio su un database nuovo:

```bash
docker compose up --build
```

Apri `http://localhost:5173`.

Credenziali demo:

- email: `admin@cornet.local`
- password: `Cornet123!`

Per aggiornare una versione esistente senza perdere dati, segui
`AGGIORNAMENTO-SENZA-PERDERE-DATI.md`.
