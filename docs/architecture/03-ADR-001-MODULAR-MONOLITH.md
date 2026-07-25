# ADR-001 — Modular Monolith

## Decisione

Usare un monolite modulare come architettura iniziale.

## Motivazioni

- minore complessità operativa;
- sviluppo più rapido;
- transazioni semplici;
- deployment più gestibile;
- domini comunque separati;
- possibilità futura di estrarre servizi indipendenti.

## Moduli candidati alla futura separazione

- parser/OCR;
- AI;
- notifiche;
- document storage;
- reporting pesante.
