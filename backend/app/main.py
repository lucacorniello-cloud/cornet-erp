from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from io import BytesIO
import json
import os
import re
import uuid
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from openpyxl import load_workbook
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine, func, or_, select
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://cornet:cornet_dev_password@db:5432/cornet_erp",
)
SECRET_KEY = os.getenv("SECRET_KEY", "local-development-secret")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(50), default="admin")


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    segment: Mapped[str] = mapped_column(String(40), default="BUSINESS_SME")
    business_name: Mapped[str] = mapped_column(String(255), index=True)
    tax_id: Mapped[str | None] = mapped_column(String(32), unique=True)
    fiscal_code: Mapped[str | None] = mapped_column(String(32))
    windtre_customer_code: Mapped[str | None] = mapped_column(String(80), index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(80))
    portfolio_status: Mapped[str] = mapped_column(String(40), default="ACTIVE")
    first_seen_month: Mapped[str | None] = mapped_column(String(7))
    last_seen_month: Mapped[str | None] = mapped_column(String(7))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class WindTreImport(Base):
    __tablename__ = "windtre_imports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competence_month: Mapped[str] = mapped_column(String(7), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_sha256: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED")
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    customer_count: Mapped[int] = mapped_column(Integer, default=0)
    new_customers: Mapped[int] = mapped_column(Integer, default=0)
    missing_customers: Mapped[int] = mapped_column(Integer, default=0)
    new_assets: Mapped[int] = mapped_column(Integer, default=0)
    removed_assets: Mapped[int] = mapped_column(Integer, default=0)
    field_changes: Mapped[int] = mapped_column(Integer, default=0)
    campaign_changes: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    rows: Mapped[list["WindTreImportRow"]] = relationship(cascade="all, delete-orphan")
    changes: Mapped[list["WindTreChange"]] = relationship(cascade="all, delete-orphan")


class WindTreImportRow(Base):
    __tablename__ = "windtre_import_rows"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("windtre_imports.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"))
    row_number: Mapped[int] = mapped_column(Integer)
    customer_key: Mapped[str] = mapped_column(String(255), index=True)
    asset_key: Mapped[str] = mapped_column(String(255), index=True)
    business_name: Mapped[str] = mapped_column(String(255))
    asset_type: Mapped[str | None] = mapped_column(String(80))
    asset_number: Mapped[str | None] = mapped_column(String(120))
    current_plan: Mapped[str | None] = mapped_column(String(255))
    current_status: Mapped[str | None] = mapped_column(String(80))
    monthly_fee: Mapped[str | None] = mapped_column(String(80))
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    campaigns: Mapped[dict[str, Any]] = mapped_column(JSONB)


class WindTreChange(Base):
    __tablename__ = "windtre_changes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("windtre_imports.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"))
    change_type: Mapped[str] = mapped_column(String(50), index=True)
    customer_key: Mapped[str] = mapped_column(String(255))
    asset_key: Mapped[str | None] = mapped_column(String(255))
    field_name: Mapped[str | None] = mapped_column(String(255))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    email: str
    password: str


def seed():
    # Conservato per compatibilità con il database Milestone 0.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.email == "admin@cornet.local")):
            db.add(
                User(
                    email="admin@cornet.local",
                    full_name="Luca Corniello",
                    hashed_password=pwd.hash("Cornet123!"),
                    role="Amministratore",
                )
            )
            db.commit()


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return re.sub(r"\s+", " ", str(value)).strip()


def normalize_header(value: Any) -> str:
    text = clean(value).upper()
    text = re.sub(r"[^A-Z0-9]+", "_", text)
    return text.strip("_")


ALIASES = {
    "business_name": ["RAGIONE_SOCIALE", "DENOMINAZIONE", "NOME_CLIENTE", "CLIENTE"],
    "customer_code": ["CODICE_CLIENTE", "COD_CLIENTE", "COD_CLIE", "CUSTOMER_CODE"],
    "tax_id": ["PARTITA_IVA", "P_IVA", "PIVA"],
    "fiscal_code": ["CODICE_FISCALE", "COD_FISCALE", "CF"],
    "email": ["EMAIL", "E_MAIL", "MAIL"],
    "phone": ["TELEFONO", "RECAPITO", "CELLULARE"],
    "asset_number": ["MSISDN", "NUMERO_LINEA", "NUMERO_TELEFONO", "NUMERO", "ASSET"],
    "asset_type": ["TIPO_ASSET", "TIPO_SERVIZIO", "CATEGORIA_SERVIZIO", "CATEGORIA"],
    "plan": ["PIANO_TARIFFARIO_ATTUALE", "PIANO_TARIFFARIO", "OFFERTA", "PIANO"],
    "status": ["STATO_MSISDN_MESE_0", "STATO_LINEA", "STATO_ASSET", "STATO"],
    "monthly_fee": ["CANONE_ATTUALIZZATO", "CANONE_SIM", "CANONE_LINEA", "CANONE_ACCESSO", "CANONE"],
    "iccid": ["ICCID", "SERIALE_SIM"],
    "activation_date": [
        "DATA_ATTIVAZIONE",
        "DATA_ATTIVAZIONE_LINEA",
        "DATA_ATTIVAZIONE_MSISDN",
        "DATA_ATTIVAZIONE_ASSET",
        "DATA_INIZIO",
        "DATA_INIZIO_VALIDITA",
        "DATA_DECORRENZA",
    ],
}
SIGNIFICANT_FIELDS = {
    "DATA_ATTIVAZIONE",
    "DATA_ATTIVAZIONE_LINEA",
    "PIANO_TARIFFARIO_ATTUALE",
    "OPZIONE_ATTIVA",
    "TIPO_PACCHETTO_DATI",
    "DESCRIZIONE_TERMINALE",
    "NUM_LICENZE_MKP",
    "DES_LICENZA_MKP",
    "DES_PRODOTTO_MKP",
    "CANONE_SIM",
    "CANONE_LINEA",
    "CANONE_ACCESSO",
    "CANONE_ATTUALIZZATO",
    "STATO_MSISDN_MESE_0",
    "FLAG_OPZIONE_CONVERGENZA",
    "OPZIONE_ITZ",
    "FLAG_OFFICE_SMART",
    "COPERTURA_ACCESSO",
    "CLUSTER_VALORE_CLIENTE",
    "I_CREDIT_SCORE",
}
ASSET_DETAIL_FIELDS = {
    "DATA_ATTIVAZIONE": "Data attivazione",
    "DATA_ATTIVAZIONE_LINEA": "Data attivazione linea",
    "ICCID": "ICCID",
    "OPZIONE_ATTIVA": "Opzione attiva",
    "TIPO_PACCHETTO_DATI": "Pacchetto dati",
    "DESCRIZIONE_TERMINALE": "Terminale",
    "NUM_LICENZE_MKP": "Numero licenze",
    "DES_LICENZA_MKP": "Licenza Marketplace",
    "DES_PRODOTTO_MKP": "Prodotto Marketplace",
    "FLAG_OPZIONE_CONVERGENZA": "Convergenza",
    "OPZIONE_ITZ": "Opzione internazionale",
    "FLAG_OFFICE_SMART": "Office Smart",
    "COPERTURA_ACCESSO": "Copertura accesso",
    "CLUSTER_VALORE_CLIENTE": "Cluster cliente",
    "I_CREDIT_SCORE": "Credit score",
}


def pick(row: dict[str, str], field: str) -> str:
    for name in ALIASES[field]:
        if row.get(name):
            return row[name]
    return ""


def parse_monthly_fee(value: Any) -> float:
    normalized = clean(value).replace("€", "").replace(" ", "")
    if not normalized:
        return 0.0
    if "," in normalized and "." in normalized:
        normalized = normalized.replace(".", "").replace(",", ".")
    elif "," in normalized:
        normalized = normalized.replace(",", ".")
    normalized = re.sub(r"[^0-9.\-]", "", normalized)
    try:
        return round(float(normalized), 2)
    except (TypeError, ValueError):
        return 0.0


def readable_field_name(key: str) -> str:
    return key.replace("_", " ").strip().title()


def find_activation_date(raw_data: dict[str, Any] | None) -> str:
    raw_data = raw_data or {}
    direct = pick(raw_data, "activation_date")
    if direct:
        return direct
    for key, value in raw_data.items():
        tokens = set(key.upper().split("_"))
        is_date = "DATA" in tokens or key.upper().startswith("DT_")
        is_activation = bool(tokens & {"ATTIVAZIONE", "ATTIV", "DECORRENZA"}) or (
            "INIZIO" in tokens and bool(tokens & {"VALIDITA", "SERVIZIO", "LINEA", "CONTRATTO"})
        )
        if is_date and is_activation and clean(value):
            return clean(value)
    return ""


def asset_details(raw_data: dict[str, Any] | None) -> list[dict[str, str]]:
    raw_data = raw_data or {}
    details = [
        {"key": key, "label": label, "value": clean(raw_data.get(key))}
        for key, label in ASSET_DETAIL_FIELDS.items()
        if clean(raw_data.get(key))
    ]
    known_keys = {detail["key"] for detail in details}
    for key, value in raw_data.items():
        upper = key.upper()
        if key in known_keys or not clean(value):
            continue
        if ("DATA" in upper or upper.startswith("DT_")) and any(
            token in upper for token in ("ATTIV", "DECORRENZA", "INIZIO_VALIDITA")
        ):
            details.append({"key": key, "label": readable_field_name(key), "value": clean(value)})
    return details


def find_header(sheet) -> tuple[int, list[str]]:
    best: tuple[int, int, list[str]] | None = None
    known = {item for values in ALIASES.values() for item in values}
    for number, values in enumerate(sheet.iter_rows(min_row=1, max_row=min(sheet.max_row, 20), values_only=True), 1):
        headers = [normalize_header(v) for v in values]
        score = sum(bool(h) for h in headers) + 5 * sum(h in known or h.startswith(("V_", "C_", "I_")) for h in headers)
        if best is None or score > best[0]:
            best = (score, number, headers)
    if not best or best[0] < 5:
        raise ValueError("Intestazioni Excel non riconosciute")
    return best[1], best[2]


def parse_workbook(contents: bytes) -> list[dict[str, Any]]:
    workbook = load_workbook(BytesIO(contents), read_only=True, data_only=True)
    sheet = workbook.active
    header_row, headers = find_header(sheet)
    parsed: list[dict[str, Any]] = []
    for row_number, values in enumerate(sheet.iter_rows(min_row=header_row + 1, values_only=True), header_row + 1):
        raw = {headers[index]: clean(value) for index, value in enumerate(values) if index < len(headers) and headers[index] and clean(value)}
        if not raw:
            continue
        business_name = pick(raw, "business_name")
        customer_code = pick(raw, "customer_code")
        tax_id = pick(raw, "tax_id")
        fiscal_code = pick(raw, "fiscal_code")
        asset_number = pick(raw, "asset_number")
        iccid = pick(raw, "iccid")
        if not any((business_name, customer_code, tax_id, fiscal_code, asset_number)):
            continue
        customer_key = customer_code or tax_id or fiscal_code or normalize_header(business_name)
        asset_key = asset_number or iccid or f"{customer_key}:ROW:{row_number}"
        campaigns = {key: value for key, value in raw.items() if key.startswith(("V_", "C_", "I_")) and value}
        parsed.append(
            {
                "row_number": row_number,
                "customer_key": customer_key,
                "asset_key": asset_key,
                "business_name": business_name or f"Cliente {customer_key}",
                "customer_code": customer_code,
                "tax_id": tax_id,
                "fiscal_code": fiscal_code,
                "email": pick(raw, "email"),
                "phone": pick(raw, "phone"),
                "asset_type": pick(raw, "asset_type"),
                "asset_number": asset_number,
                "plan": pick(raw, "plan"),
                "status": pick(raw, "status"),
                "monthly_fee": pick(raw, "monthly_fee"),
                "activation_date": find_activation_date(raw),
                "raw": raw,
                "campaigns": campaigns,
            }
        )
    return parsed


def validate_excel_upload(filename: str | None, contents: bytes) -> None:
    if not filename or not filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(422, "Carica un file Excel .xlsx o .xlsm")
    if len(contents) > 40 * 1024 * 1024:
        raise HTTPException(413, "Il file supera il limite di 40 MB")


def build_preview(filename: str, contents: bytes, parsed: list[dict[str, Any]]) -> dict[str, Any]:
    customer_keys = {row["customer_key"] for row in parsed}
    asset_keys = [row["asset_key"] for row in parsed]
    campaign_names = sorted({name for row in parsed for name in row["campaigns"]})
    duplicate_assets = len(asset_keys) - len(set(asset_keys))
    rows_without_tax_id = sum(not (row["tax_id"] or row["fiscal_code"]) for row in parsed)
    rows_without_customer_code = sum(not row["customer_code"] for row in parsed)
    return {
        "file_name": filename,
        "file_sha256": sha256(contents).hexdigest(),
        "row_count": len(parsed),
        "customer_count": len(customer_keys),
        "asset_count": len(set(asset_keys)),
        "campaign_count": len(campaign_names),
        "campaign_names": campaign_names,
        "quality": {
            "duplicate_asset_rows": duplicate_assets,
            "rows_without_tax_id": rows_without_tax_id,
            "rows_without_customer_code": rows_without_customer_code,
        },
        "sample_rows": [
            {
                "row_number": row["row_number"],
                "business_name": row["business_name"],
                "customer_code": row["customer_code"],
                "tax_id": row["tax_id"],
                "asset_type": row["asset_type"],
                "asset_number": row["asset_number"],
                "plan": row["plan"],
                "status": row["status"],
                "monthly_fee": row["monthly_fee"],
                "campaigns": row["campaigns"],
            }
            for row in parsed[:20]
        ],
    }


def text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def serialize_import(item: WindTreImport) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "competence_month": item.competence_month,
        "file_name": item.file_name,
        "status": item.status,
        "row_count": item.row_count,
        "customer_count": item.customer_count,
        "new_customers": item.new_customers,
        "missing_customers": item.missing_customers,
        "new_assets": item.new_assets,
        "removed_assets": item.removed_assets,
        "field_changes": item.field_changes,
        "campaign_changes": item.campaign_changes,
        "uploaded_at": item.uploaded_at.isoformat(),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed()
    yield


app = FastAPI(title="Cornet ERP API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


@app.post("/api/v1/auth/login")
def login(data: LoginRequest):
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == data.email))
        if not user or not pwd.verify(data.password, user.hashed_password):
            raise HTTPException(401, "Credenziali non valide")
        token = jwt.encode(
            {"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
            SECRET_KEY,
            algorithm="HS256",
        )
        return {
            "access_token": token,
            "user": {"id": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role},
        }


@app.get("/api/v1/dashboard/summary")
def summary():
    with SessionLocal() as db:
        customer_count = db.scalar(select(func.count()).select_from(Customer)) or 0
        last_import = db.scalar(select(WindTreImport).order_by(WindTreImport.uploaded_at.desc()).limit(1))
        return {
            "customers": customer_count,
            "active_contracts": 0,
            "open_practices": (last_import.field_changes + last_import.campaign_changes) if last_import else 0,
            "monthly_value": 0,
            "last_import": serialize_import(last_import) if last_import else None,
        }


@app.get("/api/v1/customers")
def customers(search: str = "", segment: str | None = None, limit: int = Query(100, ge=1, le=500)):
    with SessionLocal() as db:
        query = select(Customer).order_by(Customer.business_name).limit(limit)
        if segment:
            query = query.where(Customer.segment == segment)
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Customer.business_name.ilike(pattern),
                    Customer.tax_id.ilike(pattern),
                    Customer.fiscal_code.ilike(pattern),
                    Customer.windtre_customer_code.ilike(pattern),
                )
            )
        items = db.scalars(query).all()
        latest_import = db.scalar(
            select(WindTreImport)
            .order_by(WindTreImport.competence_month.desc(), WindTreImport.uploaded_at.desc())
            .limit(1)
        )
        monthly_spend_by_customer: dict[uuid.UUID, float] = {}
        if latest_import and items:
            current_rows = db.scalars(
                select(WindTreImportRow).where(
                    WindTreImportRow.import_id == latest_import.id,
                    WindTreImportRow.customer_id.in_([item.id for item in items]),
                )
            ).all()
            for row in current_rows:
                if row.customer_id:
                    monthly_spend_by_customer[row.customer_id] = round(
                        monthly_spend_by_customer.get(row.customer_id, 0) + parse_monthly_fee(row.monthly_fee),
                        2,
                    )
        return [
            {
                "id": str(item.id),
                "business_name": item.business_name,
                "segment": item.segment,
                "tax_id": item.tax_id,
                "fiscal_code": item.fiscal_code,
                "windtre_customer_code": item.windtre_customer_code,
                "portfolio_status": item.portfolio_status,
                "first_seen_month": item.first_seen_month,
                "last_seen_month": item.last_seen_month,
                "monthly_spend": monthly_spend_by_customer.get(item.id, 0),
            }
            for item in items
        ]


@app.get("/api/v1/customers/{customer_id}")
def customer_detail(customer_id: uuid.UUID):
    with SessionLocal() as db:
        customer = db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(404, "Cliente non trovato")
        latest_import = db.scalar(
            select(WindTreImport)
            .order_by(WindTreImport.competence_month.desc(), WindTreImport.uploaded_at.desc())
            .limit(1)
        )
        latest_rows = (
            db.scalars(
                select(WindTreImportRow)
                .where(
                    WindTreImportRow.customer_id == customer_id,
                    WindTreImportRow.import_id == latest_import.id,
                )
                .order_by(WindTreImportRow.row_number)
            ).all()
            if latest_import
            else []
        )
        monthly_spend = round(sum(parse_monthly_fee(row.monthly_fee) for row in latest_rows), 2)
        return {
            "id": str(customer.id),
            "business_name": customer.business_name,
            "segment": customer.segment,
            "tax_id": customer.tax_id,
            "fiscal_code": customer.fiscal_code,
            "windtre_customer_code": customer.windtre_customer_code,
            "portfolio_status": customer.portfolio_status,
            "first_seen_month": customer.first_seen_month,
            "last_seen_month": customer.last_seen_month,
            "snapshot_month": latest_import.competence_month if latest_import else None,
            "monthly_spend": monthly_spend,
            "assets": [
                {
                    "asset_key": row.asset_key,
                    "asset_type": row.asset_type,
                    "asset_number": row.asset_number,
                    "plan": row.current_plan,
                    "status": row.current_status,
                    "monthly_fee": row.monthly_fee,
                    "activation_date": find_activation_date(row.raw_data),
                    "details": asset_details(row.raw_data),
                    "campaigns": row.campaigns,
                }
                for row in latest_rows[-100:]
            ],
        }


@app.get("/api/v1/windtre-imports")
def import_history():
    with SessionLocal() as db:
        return [serialize_import(item) for item in db.scalars(select(WindTreImport).order_by(WindTreImport.competence_month.desc())).all()]


@app.get("/api/v1/windtre-imports/{import_id}")
def import_detail(import_id: uuid.UUID):
    with SessionLocal() as db:
        item = db.get(WindTreImport, import_id)
        if not item:
            raise HTTPException(404, "Importazione non trovata")
        changes = db.scalars(
            select(WindTreChange).where(WindTreChange.import_id == import_id).order_by(WindTreChange.change_type, WindTreChange.customer_key)
        ).all()
        result = serialize_import(item)
        result["changes"] = [
            {
                "id": str(change.id),
                "change_type": change.change_type,
                "customer_id": str(change.customer_id) if change.customer_id else None,
                "customer_key": change.customer_key,
                "asset_key": change.asset_key,
                "field_name": change.field_name,
                "old_value": change.old_value,
                "new_value": change.new_value,
            }
            for change in changes
        ]
        return result


@app.post("/api/v1/windtre-imports/preview")
async def preview_windtre_file(file: UploadFile = File(...)):
    contents = await file.read()
    validate_excel_upload(file.filename, contents)
    try:
        parsed = parse_workbook(contents)
    except Exception as exc:
        raise HTTPException(422, f"Impossibile leggere il file Excel: {exc}") from exc
    if not parsed:
        raise HTTPException(422, "Il file non contiene righe cliente riconoscibili")
    return build_preview(file.filename or "estrazione.xlsx", contents, parsed)


@app.post("/api/v1/windtre-imports")
async def import_windtre_file(competence_month: str = Form(...), file: UploadFile = File(...)):
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", competence_month):
        raise HTTPException(422, "Il mese deve essere nel formato AAAA-MM")
    contents = await file.read()
    validate_excel_upload(file.filename, contents)
    digest = sha256(contents).hexdigest()
    try:
        parsed = parse_workbook(contents)
    except Exception as exc:
        raise HTTPException(422, f"Impossibile leggere il file Excel: {exc}") from exc
    if not parsed:
        raise HTTPException(422, "Il file non contiene righe cliente riconoscibili")

    with SessionLocal() as db:
        duplicate = db.scalar(
            select(WindTreImport).where(
                WindTreImport.competence_month == competence_month,
                WindTreImport.file_sha256 == digest,
            )
        )
        if duplicate:
            raise HTTPException(409, "Questo file è già stato importato per il mese selezionato")

        previous = db.scalar(
            select(WindTreImport)
            .where(WindTreImport.competence_month < competence_month)
            .order_by(WindTreImport.competence_month.desc())
            .limit(1)
        )
        previous_rows = db.scalars(select(WindTreImportRow).where(WindTreImportRow.import_id == previous.id)).all() if previous else []
        previous_by_asset = {row.asset_key: row for row in previous_rows}
        previous_customer_keys = {row.customer_key for row in previous_rows}

        record = WindTreImport(
            competence_month=competence_month,
            file_name=file.filename,
            file_sha256=digest,
            row_count=len(parsed),
        )
        db.add(record)
        db.flush()

        current_by_asset: dict[str, dict[str, Any]] = {}
        customer_ids: dict[str, uuid.UUID] = {}
        new_customer_keys: set[str] = set()
        for row in parsed:
            customer = None
            if row["customer_code"]:
                customer = db.scalar(select(Customer).where(Customer.windtre_customer_code == row["customer_code"]))
            if not customer and row["tax_id"]:
                customer = db.scalar(select(Customer).where(Customer.tax_id == row["tax_id"]))
            if not customer and row["fiscal_code"]:
                customer = db.scalar(select(Customer).where(Customer.fiscal_code == row["fiscal_code"]))
            if not customer:
                customer = Customer(
                    segment="BUSINESS_SME",
                    business_name=row["business_name"],
                    tax_id=row["tax_id"] or None,
                    fiscal_code=row["fiscal_code"] or None,
                    windtre_customer_code=row["customer_code"] or None,
                    email=row["email"] or None,
                    phone=row["phone"] or None,
                    first_seen_month=competence_month,
                    last_seen_month=competence_month,
                )
                db.add(customer)
                db.flush()
                new_customer_keys.add(row["customer_key"])
            else:
                customer.business_name = row["business_name"] or customer.business_name
                customer.windtre_customer_code = row["customer_code"] or customer.windtre_customer_code
                customer.email = row["email"] or customer.email
                customer.phone = row["phone"] or customer.phone
                customer.last_seen_month = competence_month
                customer.portfolio_status = "ACTIVE"
            customer_ids[row["customer_key"]] = customer.id
            current_by_asset[row["asset_key"]] = row
            db.add(
                WindTreImportRow(
                    import_id=record.id,
                    customer_id=customer.id,
                    row_number=row["row_number"],
                    customer_key=row["customer_key"],
                    asset_key=row["asset_key"],
                    business_name=row["business_name"],
                    asset_type=row["asset_type"] or None,
                    asset_number=row["asset_number"] or None,
                    current_plan=row["plan"] or None,
                    current_status=row["status"] or None,
                    monthly_fee=row["monthly_fee"] or None,
                    raw_data=row["raw"],
                    campaigns=row["campaigns"],
                )
            )

        def add_change(kind: str, customer_key: str, asset_key: str | None = None, field: str | None = None, old=None, new=None):
            db.add(
                WindTreChange(
                    import_id=record.id,
                    customer_id=customer_ids.get(customer_key),
                    change_type=kind,
                    customer_key=customer_key,
                    asset_key=asset_key,
                    field_name=field,
                    old_value=text(old),
                    new_value=text(new),
                )
            )

        for key in new_customer_keys:
            add_change("NEW_CUSTOMER", key)
        current_customer_keys = {row["customer_key"] for row in parsed}
        missing_customer_keys = previous_customer_keys - current_customer_keys
        for key in missing_customer_keys:
            previous_row = next((old_row for old_row in previous_rows if old_row.customer_key == key), None)
            missing_customer_id = previous_row.customer_id if previous_row else None
            db.add(
                WindTreChange(
                    import_id=record.id,
                    customer_id=missing_customer_id,
                    change_type="MISSING_CUSTOMER",
                    customer_key=key,
                )
            )
            customer = db.get(Customer, missing_customer_id) if missing_customer_id else None
            if customer:
                customer.portfolio_status = "MISSING_FROM_LATEST_IMPORT"

        new_assets = set(current_by_asset) - set(previous_by_asset)
        removed_assets = set(previous_by_asset) - set(current_by_asset)
        for key in new_assets:
            add_change("NEW_ASSET", current_by_asset[key]["customer_key"], key)
        for key in removed_assets:
            previous_row = previous_by_asset[key]
            add_change("REMOVED_ASSET", previous_row.customer_key, key)

        field_change_count = 0
        campaign_change_count = 0
        for key in set(current_by_asset) & set(previous_by_asset):
            current = current_by_asset[key]
            old = previous_by_asset[key]
            old_raw = old.raw_data or {}
            for field in SIGNIFICANT_FIELDS:
                before, after = clean(old_raw.get(field)), clean(current["raw"].get(field))
                if before != after:
                    add_change("FIELD_CHANGED", current["customer_key"], key, field, before, after)
                    field_change_count += 1
            campaign_names = set(old.campaigns or {}) | set(current["campaigns"])
            for campaign in campaign_names:
                before = clean((old.campaigns or {}).get(campaign))
                after = clean(current["campaigns"].get(campaign))
                if before == after:
                    continue
                kind = "CAMPAIGN_ENTERED" if not before else "CAMPAIGN_EXITED" if not after else "CAMPAIGN_CHANGED"
                add_change(kind, current["customer_key"], key, campaign, before, after)
                campaign_change_count += 1

        record.customer_count = len(current_customer_keys)
        record.new_customers = len(new_customer_keys)
        record.missing_customers = len(missing_customer_keys)
        record.new_assets = len(new_assets)
        record.removed_assets = len(removed_assets)
        record.field_changes = field_change_count
        record.campaign_changes = campaign_change_count
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(409, "Importazione duplicata o dati fiscali incompatibili") from exc
        db.refresh(record)
        return serialize_import(record)
