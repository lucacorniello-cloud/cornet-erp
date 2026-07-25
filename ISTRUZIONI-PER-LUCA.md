# Istruzioni rapide

## Se non hai dati da conservare

1. Estrai lo ZIP in una cartella nuova.
2. Apri la cartella in Visual Studio Code.
3. Apri **Terminale → Nuovo terminale**.
4. Esegui:

```bash
docker compose up --build
```

5. Apri `http://localhost:5173`.

Accesso:

- `admin@cornet.local`
- `Cornet123!`

## Se la versione attuale contiene dati

Non copiare i file sopra la versione esistente e non usare `docker compose down -v`.
Segui integralmente:

```text
AGGIORNAMENTO-SENZA-PERDERE-DATI.md
```

La procedura crea prima un backup SQL, avvia la nuova versione con archivio persistente
e ripristina i dati della versione precedente.
