# Architettura di sistema

## Stack proposto

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- TanStack Table
- component library basata su shadcn/ui
- Tailwind CSS
- Recharts
- React Hook Form
- Zod

### Backend

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic
- Redis
- Celery o Dramatiq per elaborazioni asincrone

### Storage documentale

- storage compatibile S3;
- versioning;
- checksum;
- metadati nel database;
- anteprima PDF;
- antivirus in pipeline.

### Osservabilità

- structured logging;
- metriche;
- error tracking;
- audit applicativo;
- tracing futuro.

## Stile architetturale

Modular monolith iniziale, con confini di dominio chiari.

Questa scelta evita la complessità prematura dei microservizi mantenendo la
possibilità di separare in futuro parser, AI, documenti e notifiche.

## Moduli backend

- identity
- stores
- crm
- contracts
- services
- practices
- activities
- documents
- imports
- campaigns
- inventory
- repairs
- reporting
- audit
- ai_gateway
- notifications

## Flusso principale

Frontend SPA → API FastAPI → Service layer → Domain layer → Repository → PostgreSQL

Le elaborazioni lente passano da una coda:

Upload PDC → job asincrono → parser/OCR → risultato → revisione utente → importazione.
