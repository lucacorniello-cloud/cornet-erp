# Aggiornamento alla versione 0.2

Questa procedura conserva il database della versione attuale e introduce un volume
persistente PostgreSQL. Non usare `docker compose down -v`: l'opzione `-v` elimina i dati.

## 1. Backup della versione in uso

Apri il Terminale nella cartella della versione attualmente funzionante ed esegui:

```bash
mkdir -p backups
docker compose exec -T db pg_dump --clean --if-exists -U cornet -d cornet_erp > backups/cornet-erp-prima-v0.2.sql
```

Verifica che il file non sia vuoto:

```bash
ls -lh backups/cornet-erp-prima-v0.2.sql
```

## 2. Ferma la vecchia versione

```bash
docker compose down
```

Non aggiungere `-v`.

## 3. Installa la nuova versione

Estrai lo ZIP in una cartella nuova, per esempio `cornet-erp-0.2`, e copia nella nuova
cartella il file:

```text
backups/cornet-erp-prima-v0.2.sql
```

Avvia la nuova versione:

```bash
docker compose up --build -d
```

Attendi circa un minuto, quindi controlla:

```bash
docker compose ps
```

## 4. Ripristina il database precedente

Solo al primo avvio della nuova cartella:

```bash
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U cornet -d cornet_erp < backups/cornet-erp-prima-v0.2.sql
docker compose restart backend
```

Le migrazioni del modulo WINDTRE vengono applicate automaticamente all'avvio del backend.

## 5. Apri Cornet ERP

```text
http://localhost:5173
```

Credenziali demo:

```text
admin@cornet.local
Cornet123!
```

## Ripristino di emergenza

Se il nuovo progetto non parte, fermalo con `docker compose down`, riapri la vecchia
cartella e avviala con `docker compose up`. Conserva sempre il file SQL di backup.
