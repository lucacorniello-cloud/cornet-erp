# Modello sicurezza

## Autenticazione

- login con password robusta;
- MFA opzionale inizialmente, obbligatoria per amministratori in futuro;
- sessioni revocabili;
- reset password sicuro;
- rate limiting;
- protezione brute force.

## Ruoli iniziali

- Super Admin
- Admin negozio
- Responsabile
- Commerciale
- Back office
- Tecnico
- Lettura sola

## Permessi

Permessi granulari per:

- lettura;
- creazione;
- modifica;
- cancellazione;
- esportazione;
- gestione documenti;
- gestione utenti;
- approvazione importazioni;
- accesso audit;
- dati economici.

## Multi-store

Ogni record deve avere ambito negozio o organizzazione.

## Audit

Registrare:

- utente;
- timestamp;
- IP e device quando opportuno;
- entità;
- azione;
- valori prima/dopo;
- motivazione;
- correlation id.
