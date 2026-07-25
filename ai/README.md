# Modulo AI

L'AI non accede direttamente al database.

Architettura prevista:

Richiesta utente → intent parser → query autorizzata → dati filtrati → risposta.

## Vincoli

- rispetto permessi;
- nessuna modifica senza conferma;
- audit delle richieste sensibili;
- minimizzazione dati;
- prompt e output controllati;
- citazione delle entità usate.
