# Struttura repository proposta

```text
cornet-erp/
├── docs/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── modules/
│   │   ├── services/
│   │   ├── jobs/
│   │   └── main.py
├── parser/
├── ai/
├── tests/
├── deploy/
└── README.md
```

## Convenzioni

- ogni dominio ha modelli, schema, service, repository, router e test;
- nessuna regola di business direttamente nel router;
- nessun accesso al database direttamente dal frontend;
- gli eventi audit sono obbligatori per tutte le modifiche sensibili;
- le API sono versionate.
