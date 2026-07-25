# Cornet ERP 0.2

## Funzioni integrate

- nuova area **Importazioni Business** nel menu;
- upload di file Excel `.xlsx` e `.xlsm`;
- mese di competenza obbligatorio;
- ricerca automatica della riga di intestazione;
- associazione dei record ai clienti tramite codice WINDTRE, P.IVA o codice fiscale;
- creazione e aggiornamento dei clienti Business SME;
- conservazione degli snapshot mensili;
- rilevazione di:
  - nuovi clienti;
  - clienti non più presenti;
  - nuovi asset;
  - asset non più presenti;
  - variazioni di piano, canone, stato, terminale e servizi;
  - ingresso, uscita e cambio livello delle campagne `V_`, `C_` e `I_`;
- storico importazioni e pannello delle differenze;
- ricerca clienti Business SME;
- volume PostgreSQL persistente;
- migrazioni Alembic automatiche.

## Controlli eseguiti

- compilazione Python;
- generazione SQL della migrazione Alembic;
- presenza delle API previste;
- controllo TypeScript senza errori;
- test del parser con un Excel generato contenente due SIM e campagne
  `V_SMARTPHONE` e `V_SIM_RINNOVABILI`.

## Limiti noti

- l'estrazione WINDTRE reale della conversazione precedente non era disponibile nel
  repository, quindi gli alias delle sue intestazioni dovranno essere verificati con il
  primo file reale;
- i file `.xls` precedenti a Excel 2007 non sono supportati: esportarli come `.xlsx`;
- i valori delle campagne sono conservati integralmente, ma la traduzione commerciale
  dei codici (`Y_PREMIUM`, `Y_11E`, ecc.) non è ancora configurabile;
- listini terminali e listini di rivincolo non sono ancora implementati;
- l'avvio Docker completo non è stato eseguibile nella sandbox Codex perché l'accesso al
  socket Docker Desktop è bloccato. Le componenti sono state controllate separatamente.
