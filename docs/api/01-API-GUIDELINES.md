# API Guidelines

## Convenzioni

- prefisso `/api/v1`;
- JSON;
- date ISO 8601;
- paginazione cursor o page/size;
- filtri espliciti;
- ordinamento con `sort`;
- errori standardizzati;
- id UUID;
- optimistic locking per record critici;
- idempotency key per importazioni e azioni ripetibili.

## Error format

```json
{
  "error": {
    "code": "CUSTOMER_DUPLICATE",
    "message": "Possibile cliente duplicato",
    "details": {},
    "request_id": "uuid"
  }
}
```

## API principali

- `/customers`
- `/companies`
- `/contacts`
- `/contracts`
- `/contract-lines`
- `/services`
- `/practices`
- `/activities`
- `/documents`
- `/imports`
- `/campaigns`
- `/inventory`
- `/repairs`
- `/audit`
- `/search`
