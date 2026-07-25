from __future__ import annotations

from contextlib import asynccontextmanager
from collections import defaultdict
import csv
from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import re
import uuid
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from jose import jwt
from openpyxl import load_workbook
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from passlib.context import CryptContext
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, create_engine, func, or_, select
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
    address: Mapped[str | None] = mapped_column(String(255))
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


class StoreSettings(Base):
    __tablename__ = "store_settings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_name: Mapped[str] = mapped_column(String(255), default="Cornet Solutions")
    legal_name: Mapped[str | None] = mapped_column(String(255))
    tax_id: Mapped[str | None] = mapped_column(String(32))
    fiscal_code: Mapped[str | None] = mapped_column(String(32))
    dealer_code: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(120))
    postal_code: Mapped[str | None] = mapped_column(String(12))
    province: Mapped[str | None] = mapped_column(String(8))
    phone: Mapped[str | None] = mapped_column(String(80))
    whatsapp: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))
    logo_path: Mapped[str | None] = mapped_column(String(500))
    partner_logo_path: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Product(Base):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    unit_cost_cents: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SimOrder(Base):
    __tablename__ = "sim_orders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    order_date: Mapped[date] = mapped_column(Date, default=date.today)
    supplier: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(40), default="INVIATO")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    lines: Mapped[list["SimOrderLine"]] = relationship(cascade="all, delete-orphan")


class SimOrderLine(Base):
    __tablename__ = "sim_order_lines"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sim_orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    product: Mapped[Product] = relationship()


class SimInventory(Base):
    __tablename__ = "sim_inventory"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iccid: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sim_orders.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="IN_MAGAZZINO", index=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), index=True)
    msisdn: Mapped[str | None] = mapped_column(String(30), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    product: Mapped[Product] = relationship()
    order: Mapped[SimOrder | None] = relationship()
    customer: Mapped[Customer | None] = relationship()


class SimInventoryImport(Base):
    __tablename__ = "sim_inventory_imports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_name: Mapped[str] = mapped_column(String(255))
    added_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_count: Mapped[int] = mapped_column(Integer, default=0)
    rejected_count: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DdtShipmentSim(Base):
    __tablename__ = "ddt_shipment_sims"
    ddt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ddt_shipments.id", ondelete="CASCADE"), primary_key=True)
    sim_inventory_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sim_inventory.id", ondelete="RESTRICT"), primary_key=True)


class DdtShipment(Base):
    __tablename__ = "ddt_shipments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ddt_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    document_date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), index=True)
    recipient_name: Mapped[str] = mapped_column(String(255), index=True)
    recipient_address: Mapped[str] = mapped_column(String(500))
    goods_description: Mapped[str] = mapped_column(Text)
    carrier: Mapped[str | None] = mapped_column(String(255), index=True)
    tracking_number: Mapped[str | None] = mapped_column(String(255), index=True)
    status: Mapped[str] = mapped_column(String(40), default="IN_PREPARAZIONE", index=True)
    sender_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    customer: Mapped[Customer | None] = relationship()
    sims: Mapped[list[SimInventory]] = relationship(secondary="ddt_shipment_sims")


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    email: str
    password: str


class StoreSettingsRequest(BaseModel):
    store_name: str
    legal_name: str | None = None
    tax_id: str | None = None
    fiscal_code: str | None = None
    dealer_code: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    province: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    website: str | None = None


class DdtShipmentRequest(BaseModel):
    document_date: date = date.today()
    customer_id: uuid.UUID | None = None
    recipient_name: str
    recipient_address: str
    goods_description: str
    carrier: str | None = None
    tracking_number: str | None = None
    status: str = "IN_PREPARAZIONE"
    sim_ids: list[uuid.UUID] = []


class DdtStatusRequest(BaseModel):
    status: str
    tracking_number: str | None = None


class ProductRequest(BaseModel):
    sku: str
    name: str
    unit_cost: float | None = None


class OrderLineRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int
    description: str | None = None


class SimOrderRequest(BaseModel):
    order_number: str | None = None
    order_date: date = date.today()
    supplier: str | None = None
    notes: str | None = None
    status: str = "INVIATO"
    lines: list[OrderLineRequest]


class OrderStatusRequest(BaseModel):
    status: str


class SimInventoryRequest(BaseModel):
    iccid: str
    product_id: uuid.UUID
    order_id: uuid.UUID | None = None
    status: str = "IN_MAGAZZINO"
    customer_id: uuid.UUID | None = None
    msisdn: str | None = None


class SimInventoryUpdate(BaseModel):
    status: str | None = None
    customer_id: uuid.UUID | None = None
    msisdn: str | None = None


class QuickCustomerRequest(BaseModel):
    business_name: str
    tax_id: str | None = None
    address: str | None = None


UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def seed():
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


def classify_asset(row: WindTreImportRow) -> str:
    raw = row.raw_data or {}
    sim_type = normalize_header(raw.get("TIPOLOGIA_SIM"))
    sim_class = normalize_header(raw.get("CLASSE_SIM"))

    if sim_type == "FONIA_MOBILE":
        if sim_class == "FONIA":
            return "MOBILE_VOICE"
        if sim_class == "DATI":
            return "MOBILE_DATA"
        if sim_class == "M2M":
            return "MOBILE_M2M"
        return "MOBILE_OTHER"
    if sim_type == "MARKETPLACE":
        return "ICT"
    if sim_type in {"VOIP", "ADSL", "FONIA_FISSA", "DATI"}:
        return "FIXED_DATA"

    asset_text = normalize_header(
        " ".join(
            clean(value)
            for value in (
                row.asset_type,
                row.current_plan,
                raw.get("TIPO_ASSET"),
                raw.get("TIPO_SERVIZIO"),
                raw.get("CATEGORIA_SERVIZIO"),
                raw.get("CATEGORIA"),
                raw.get("TIPO_ACCESSO"),
                raw.get("DES_TIPO_ACCESSO"),
                raw.get("DESCRIZIONE_ACCESSO"),
                raw.get("DES_PRODOTTO"),
                raw.get("PRODOTTO"),
            )
            if clean(value)
        )
    )
    fixed_tokens = (
        "FISSO",
        "DATI",
        "FIBRA",
        "FTTH",
        "FTTC",
        "FWA",
        "ADSL",
        "ACCESSO",
        "OFFICE_PLUS",
        "SUPER_OFFICE",
    )
    # Alcune estrazioni WINDTRE valorizzano MSISDN anche sulle linee fisse:
    # gli indicatori specifici Fisso/Dati devono quindi avere la precedenza.
    if (
        clean(raw.get("CANONE_LINEA"))
        or clean(raw.get("CANONE_ACCESSO"))
        or any(token in asset_text for token in fixed_tokens)
    ):
        return "FIXED_DATA"
    if (
        clean(raw.get("CANONE_SIM"))
        or any(token in asset_text for token in ("MOBILE", "SIM", "MSISDN"))
        or clean(raw.get("MSISDN"))
    ):
        if sim_class == "FONIA":
            return "MOBILE_VOICE"
        if sim_class == "DATI":
            return "MOBILE_DATA"
        if sim_class == "M2M":
            return "MOBILE_M2M"
        return "MOBILE_OTHER"
    return "OTHER"


def is_active_service(row: WindTreImportRow) -> bool:
    status = normalize_header(row.current_status or "")
    return not status or status in {"ATT", "ACTIVE", "ATTIVO", "ATTIVA"}


def customer_service_pivot(rows: list[WindTreImportRow]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, float | int]] = defaultdict(lambda: {"count": 0, "mrr": 0.0})
    for row in rows:
        if not is_active_service(row):
            continue
        plan = clean(row.current_plan) or "Piano non indicato"
        grouped[plan]["count"] = int(grouped[plan]["count"]) + 1
        grouped[plan]["mrr"] = round(float(grouped[plan]["mrr"]) + parse_monthly_fee(row.monthly_fee), 2)
    return [
        {"plan": plan, "count": values["count"], "mrr": values["mrr"]}
        for plan, values in sorted(grouped.items(), key=lambda item: item[0].casefold())
    ]


def safe_export_name(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_")
    return normalized[:80] or "cliente"


def italian_currency(value: float) -> str:
    return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " EUR"


def latest_customer_snapshot(db, customer_id: uuid.UUID):
    latest_import = db.scalar(
        select(WindTreImport)
        .order_by(WindTreImport.competence_month.desc(), WindTreImport.uploaded_at.desc())
        .limit(1)
    )
    rows = (
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
    return latest_import, rows


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


PRODUCT_COLUMN_ALIASES = {
    "sku": {"CODICE", "CODICE_ARTICOLO", "SKU", "ARTICOLO"},
    "name": {"NOME", "NOME_PRODOTTO", "DESCRIZIONE", "DESCRIZIONE_COMMERCIALE"},
    "unit_cost": {"COSTO", "COSTO_UNITARIO", "PREZZO_ACQUISTO"},
}
SIM_COLUMN_ALIASES = {
    "iccid": {"ICCID", "SERIALE", "SERIALE_SIM", "SERIALE_ICCID"},
    "sku": {"CODICE", "CODICE_ARTICOLO", "SKU", "ARTICOLO"},
    "status": {"STATO", "STATO_SIM"},
    "order_number": {"ORDINE", "ID_ORDINE", "NUMERO_ORDINE"},
    "msisdn": {"MSISDN", "NUMERO", "NUMERO_TELEFONICO", "NUMERO_ASSEGNATO_MSISDN"},
    "customer": {"CLIENTE", "NOME_CLIENTE", "ASSEGNATA_A_CLIENTE"},
    "order_date": {"DATA_ORDINE", "DATA"},
}
SIM_STATUSES = {"IN_MAGAZZINO", "ASSEGNATA", "ATTIVATA", "DISABILITATA", "SOSPESA"}
ORDER_STATUSES = {"INVIATO", "IN_ATTESA", "IN_LAVORAZIONE", "RICEVUTO", "EVASO"}


def parse_uploaded_table(filename: str, contents: bytes) -> list[dict[str, str]]:
    suffix = Path(filename).suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        workbook = load_workbook(BytesIO(contents), read_only=True, data_only=True)
        sheet = workbook.active
        values = sheet.iter_rows(values_only=True)
        headers = [normalize_header(value) for value in next(values, [])]
        return [
            {
                headers[index]: clean(value)
                for index, value in enumerate(row)
                if index < len(headers) and headers[index] and clean(value)
            }
            for row in values
            if any(clean(value) for value in row)
        ]
    if suffix == ".csv":
        decoded = None
        for encoding in ("utf-8-sig", "cp1252", "latin-1"):
            try:
                decoded = contents.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        if decoded is None:
            raise HTTPException(422, "Codifica CSV non riconosciuta")
        sample = decoded[:65536]
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=";,|\t")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(decoded.splitlines(), dialect=dialect)
        return [
            {normalize_header(key): clean(value) for key, value in row.items() if key and clean(value)}
            for row in reader
            if any(clean(value) for value in row.values())
        ]
    raise HTTPException(422, "Carica un file CSV, XLSX o XLSM")


def mapped_value(row: dict[str, str], aliases: set[str]) -> str:
    return next((row[key] for key in aliases if row.get(key)), "")


def parse_compact_date(value: str) -> date:
    normalized = re.sub(r"\D", "", value or "")
    for pattern in ("%Y%m%d", "%d%m%Y"):
        try:
            return datetime.strptime(normalized, pattern).date()
        except ValueError:
            pass
    return date.today()


def cents_from_value(value: Any) -> int | None:
    parsed = parse_monthly_fee(value)
    return round(parsed * 100) if clean(value) else None


def serialize_product(item: Product) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "sku": item.sku,
        "name": item.name,
        "unit_cost": round(item.unit_cost_cents / 100, 2) if item.unit_cost_cents is not None else None,
        "is_active": item.is_active,
    }


def serialize_order(item: SimOrder) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "order_number": item.order_number,
        "order_date": item.order_date.isoformat(),
        "supplier": item.supplier,
        "status": item.status,
        "notes": item.notes,
        "lines": [
            {
                "id": str(line.id),
                "product_id": str(line.product_id),
                "sku": line.product.sku,
                "product_name": line.product.name,
                "quantity": line.quantity,
                "description": line.description,
            }
            for line in item.lines
        ],
        "total_quantity": sum(line.quantity for line in item.lines),
    }


def serialize_inventory(item: SimInventory) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "iccid": item.iccid,
        "product_id": str(item.product_id),
        "sku": item.product.sku,
        "product_name": item.product.name,
        "order_id": str(item.order_id) if item.order_id else None,
        "order_number": item.order.order_number if item.order else None,
        "status": item.status,
        "customer_id": str(item.customer_id) if item.customer_id else None,
        "customer_name": item.customer.business_name if item.customer else None,
        "msisdn": item.msisdn,
        "created_at": item.created_at.isoformat(),
    }


def normalize_iccid(value: Any) -> str:
    return re.sub(r"\D", "", clean(value))


def order_share_text(item: SimOrder) -> str:
    lines = [
        f"ORDINE SIM {item.order_number}",
        f"Data: {item.order_date.strftime('%d/%m/%Y')}",
        f"Fornitore: {item.supplier or 'Non indicato'}",
        "",
    ]
    lines.extend(f"- {line.product.sku} | {line.product.name}: {line.quantity} pz" for line in item.lines)
    if item.notes:
        lines.extend(["", f"Note: {item.notes}"])
    lines.append(f"\nTotale: {sum(line.quantity for line in item.lines)} SIM")
    return "\n".join(lines)


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed()
    yield


app = FastAPI(title="Cornet ERP API", version="0.2.0", lifespan=lifespan)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
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


def serialize_store_settings(item: StoreSettings) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "store_name": item.store_name,
        "legal_name": item.legal_name or "",
        "tax_id": item.tax_id or "",
        "fiscal_code": item.fiscal_code or "",
        "dealer_code": item.dealer_code or "",
        "address": item.address or "",
        "city": item.city or "",
        "postal_code": item.postal_code or "",
        "province": item.province or "",
        "phone": item.phone or "",
        "whatsapp": item.whatsapp or "",
        "email": item.email or "",
        "website": item.website or "",
        "logo_url": f"/uploads/{item.logo_path}" if item.logo_path else None,
        "partner_logo_url": f"/uploads/{item.partner_logo_path}" if item.partner_logo_path else None,
        "updated_at": item.updated_at.isoformat(),
    }


def get_or_create_store_settings(db) -> StoreSettings:
    item = db.scalar(select(StoreSettings).limit(1))
    if not item:
        item = StoreSettings()
        db.add(item)
        db.flush()
    return item


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


@app.get("/api/v1/settings/store")
def store_settings():
    with SessionLocal() as db:
        item = get_or_create_store_settings(db)
        db.commit()
        db.refresh(item)
        return serialize_store_settings(item)


@app.put("/api/v1/settings/store")
def update_store_settings(data: StoreSettingsRequest):
    if not data.store_name.strip():
        raise HTTPException(422, "Il nome del punto vendita è obbligatorio")
    with SessionLocal() as db:
        item = get_or_create_store_settings(db)
        for field, value in data.model_dump().items():
            setattr(item, field, value.strip() if isinstance(value, str) else value)
        db.commit()
        db.refresh(item)
        return serialize_store_settings(item)


@app.post("/api/v1/settings/store/logo")
async def upload_store_logo(file: UploadFile = File(...)):
    allowed_types = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
    extension = allowed_types.get(file.content_type or "")
    if not extension:
        raise HTTPException(422, "Carica un logo PNG, JPG o WEBP")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(413, "Il logo supera il limite di 5 MB")
    filename = f"store-logo{extension}"
    target = UPLOAD_DIR / filename
    target.write_bytes(contents)
    with SessionLocal() as db:
        item = get_or_create_store_settings(db)
        previous = item.logo_path
        item.logo_path = filename
        db.commit()
        db.refresh(item)
        if previous and previous != filename:
            previous_path = UPLOAD_DIR / previous
            if previous_path.is_file():
                previous_path.unlink()
        return serialize_store_settings(item)


@app.post("/api/v1/settings/store/partner-logo")
async def upload_partner_logo(file: UploadFile = File(...)):
    allowed_types = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
    extension = allowed_types.get(file.content_type or "")
    if not extension:
        raise HTTPException(422, "Carica un logo PNG, JPG o WEBP")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(413, "Il logo supera il limite di 5 MB")
    filename = f"partner-logo{extension}"
    (UPLOAD_DIR / filename).write_bytes(contents)
    with SessionLocal() as db:
        item = get_or_create_store_settings(db)
        previous = item.partner_logo_path
        item.partner_logo_path = filename
        db.commit()
        db.refresh(item)
        if previous and previous != filename:
            previous_path = UPLOAD_DIR / previous
            if previous_path.is_file():
                previous_path.unlink()
        return serialize_store_settings(item)


DDT_STATUSES = {"IN_PREPARAZIONE", "SPEDITO", "CONSEGNATO", "ANNULLATO"}


def sender_snapshot(item: StoreSettings) -> dict[str, Any]:
    full_address = ", ".join(
        part for part in [
            item.address,
            " ".join(part for part in [item.postal_code, item.city] if part),
            f"({item.province})" if item.province else None,
        ] if part
    )
    return {
        "name": item.legal_name or item.store_name,
        "address": full_address,
        "tax_id": item.tax_id or item.fiscal_code or "",
        "logo_path": item.logo_path,
        "partner_logo_path": item.partner_logo_path,
    }


def generate_ddt_number(db, document_date: date) -> str:
    prefix = f"DDT-{document_date.strftime('%Y%m%d')}-"
    for _ in range(100):
        number = prefix + str(uuid.uuid4().int % 1000).zfill(3)
        if not db.scalar(select(DdtShipment.id).where(DdtShipment.ddt_number == number)):
            return number
    raise HTTPException(503, "Impossibile generare il numero DDT")


def serialize_ddt(item: DdtShipment) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "ddt_number": item.ddt_number,
        "document_date": item.document_date.isoformat(),
        "customer_id": str(item.customer_id) if item.customer_id else None,
        "recipient_name": item.recipient_name,
        "recipient_address": item.recipient_address,
        "goods_description": item.goods_description,
        "carrier": item.carrier or "",
        "tracking_number": item.tracking_number or "",
        "status": item.status,
        "sims": [serialize_inventory(sim) for sim in item.sims],
        "sim_ids": [str(sim.id) for sim in item.sims],
        "sender_snapshot": item.sender_snapshot,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def validate_ddt(data: DdtShipmentRequest):
    if data.status not in DDT_STATUSES:
        raise HTTPException(422, "Stato DDT non valido")
    if not data.recipient_name.strip():
        raise HTTPException(422, "Il destinatario è obbligatorio")
    if not data.recipient_address.strip():
        raise HTTPException(422, "L'indirizzo di consegna è obbligatorio")
    if not data.goods_description.strip() and not data.sim_ids:
        raise HTTPException(422, "La descrizione dei beni è obbligatoria")
    if data.status == "SPEDITO" and not (data.tracking_number or "").strip():
        raise HTTPException(422, "Inserisci il tracking prima di segnare il DDT come spedito")


def resolve_ddt_sims(db, sim_ids: list[uuid.UUID], customer_id: uuid.UUID | None) -> list[SimInventory]:
    if not sim_ids:
        return []
    items = db.scalars(select(SimInventory).where(SimInventory.id.in_(sim_ids))).all()
    if len(items) != len(set(sim_ids)):
        raise HTTPException(422, "Una o più SIM selezionate non sono presenti in magazzino")
    if customer_id and any(item.customer_id != customer_id for item in items):
        raise HTTPException(422, "Puoi inserire soltanto SIM associate al cliente selezionato")
    return items


@app.get("/api/v1/ddt")
def ddt_shipments(search: str = "", status: str | None = None):
    with SessionLocal() as db:
        query = select(DdtShipment).order_by(DdtShipment.document_date.desc(), DdtShipment.created_at.desc())
        if status:
            query = query.where(DdtShipment.status == status)
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(or_(
                DdtShipment.ddt_number.ilike(pattern),
                DdtShipment.recipient_name.ilike(pattern),
                DdtShipment.carrier.ilike(pattern),
                DdtShipment.tracking_number.ilike(pattern),
                DdtShipment.goods_description.ilike(pattern),
            ))
        items = db.scalars(query).all()
        return {
            "items": [serialize_ddt(item) for item in items],
            "counts": {state: sum(item.status == state for item in items) for state in DDT_STATUSES},
        }


@app.post("/api/v1/ddt")
def create_ddt(data: DdtShipmentRequest):
    validate_ddt(data)
    with SessionLocal() as db:
        store = get_or_create_store_settings(db)
        item = DdtShipment(
            ddt_number=generate_ddt_number(db, data.document_date),
            document_date=data.document_date,
            customer_id=data.customer_id,
            recipient_name=data.recipient_name.strip(),
            recipient_address=data.recipient_address.strip(),
            goods_description=data.goods_description.strip(),
            carrier=(data.carrier or "").strip() or None,
            tracking_number=(data.tracking_number or "").strip() or None,
            status=data.status,
            sender_snapshot=sender_snapshot(store),
            sims=resolve_ddt_sims(db, data.sim_ids, data.customer_id),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_ddt(item)


@app.put("/api/v1/ddt/{ddt_id}")
def update_ddt(ddt_id: uuid.UUID, data: DdtShipmentRequest):
    validate_ddt(data)
    with SessionLocal() as db:
        item = db.get(DdtShipment, ddt_id)
        if not item:
            raise HTTPException(404, "DDT non trovato")
        if item.status == "ANNULLATO":
            raise HTTPException(409, "Un DDT annullato non può essere modificato")
        sim_ids = data.sim_ids
        for field, value in data.model_dump(exclude={"sim_ids"}).items():
            setattr(item, field, value.strip() if isinstance(value, str) else value)
        item.sims = resolve_ddt_sims(db, sim_ids, data.customer_id)
        db.commit()
        db.refresh(item)
        return serialize_ddt(item)


@app.patch("/api/v1/ddt/{ddt_id}/status")
def update_ddt_status(ddt_id: uuid.UUID, data: DdtStatusRequest):
    if data.status not in DDT_STATUSES:
        raise HTTPException(422, "Stato DDT non valido")
    with SessionLocal() as db:
        item = db.get(DdtShipment, ddt_id)
        if not item:
            raise HTTPException(404, "DDT non trovato")
        if item.status == "ANNULLATO":
            raise HTTPException(409, "Un DDT annullato non può cambiare stato")
        if data.status == "SPEDITO" and not (data.tracking_number or item.tracking_number):
            raise HTTPException(422, "Inserisci il tracking prima della spedizione")
        item.status = data.status
        if data.tracking_number is not None:
            item.tracking_number = data.tracking_number.strip() or None
        db.commit()
        db.refresh(item)
        return serialize_ddt(item)


@app.delete("/api/v1/ddt/{ddt_id}")
def delete_ddt(ddt_id: uuid.UUID):
    with SessionLocal() as db:
        item = db.get(DdtShipment, ddt_id)
        if not item:
            raise HTTPException(404, "DDT non trovato")
        if item.status != "IN_PREPARAZIONE":
            raise HTTPException(409, "Puoi eliminare solo DDT in preparazione; usa Annulla per conservarne lo storico")
        db.delete(item)
        db.commit()
        return {"ok": True}


@app.get("/api/v1/ddt/{ddt_id}/pdf")
def ddt_pdf(ddt_id: uuid.UUID):
    with SessionLocal() as db:
        item = db.get(DdtShipment, ddt_id)
        if not item:
            raise HTTPException(404, "DDT non trovato")
        snapshot = item.sender_snapshot or {}
        lines = [line.strip() for line in item.goods_description.splitlines() if line.strip()]
        if item.sims:
            lines.append("SIM SELEZIONATE:")
            lines.extend(
                f"{sim.product.name} | ICCID: {sim.iccid} | Numero: {sim.msisdn or '—'} | Stato: {sim.status.replace('_', ' ')}"
                for sim in item.sims
            )
        lines = lines or ["—"]
        chunks = [lines[index:index + 15] for index in range(0, len(lines), 15)]
        styles = getSampleStyleSheet()
        body = ParagraphStyle("ddt-body", parent=styles["BodyText"], fontSize=9, leading=12)
        small = ParagraphStyle("ddt-small", parent=body, fontSize=8, leading=10)
        heading = ParagraphStyle("ddt-heading", parent=styles["Heading1"], fontSize=13, leading=16, alignment=1)
        buffer = BytesIO()
        document = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=12 * mm, bottomMargin=12 * mm)
        story = []
        for page_index, chunk in enumerate(chunks):
            logo_path = UPLOAD_DIR / snapshot.get("logo_path", "") if snapshot.get("logo_path") else None
            partner_path = UPLOAD_DIR / snapshot.get("partner_logo_path", "") if snapshot.get("partner_logo_path") else None
            left_logo = Image(str(logo_path), width=35 * mm, height=15 * mm, kind="proportional") if logo_path and logo_path.is_file() else Paragraph("", body)
            right_logo = Image(str(partner_path), width=35 * mm, height=15 * mm, kind="proportional") if partner_path and partner_path.is_file() else Paragraph("", body)
            header = Table([[left_logo, Paragraph("DOCUMENTO DI TRASPORTO (D.D.T.)<br/><font size='8'>D.P.R. 472/96</font>", heading), right_logo]], colWidths=[45 * mm, 87 * mm, 45 * mm])
            header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (2, 0), (2, 0), "RIGHT")]))
            story.extend([header, Spacer(1, 4 * mm)])
            refs = Table([[
                Paragraph(f"<b>Numero:</b> {item.ddt_number}", body),
                Paragraph(f"<b>Data:</b> {item.document_date.strftime('%d/%m/%Y')}", body),
                Paragraph(f"<b>Pagina:</b> {page_index + 1} di {len(chunks)}", body),
            ]], colWidths=[75 * mm, 55 * mm, 47 * mm])
            refs.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .6, colors.HexColor("#9ca3af")), ("INNERGRID", (0, 0), (-1, -1), .4, colors.HexColor("#d1d5db")), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")), ("PADDING", (0, 0), (-1, -1), 6)]))
            story.extend([refs, Spacer(1, 4 * mm)])
            parties = Table([[
                Paragraph(f"<b>MITTENTE</b><br/>{snapshot.get('name', '')}<br/>{snapshot.get('address', '')}<br/>P.IVA/C.F.: {snapshot.get('tax_id', '')}", body),
                Paragraph(f"<b>DESTINATARIO</b><br/>{item.recipient_name}<br/>{item.recipient_address}", body),
            ]], colWidths=[88.5 * mm, 88.5 * mm])
            parties.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .7, colors.HexColor("#475569")), ("INNERGRID", (0, 0), (-1, -1), .4, colors.HexColor("#cbd5e1")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("PADDING", (0, 0), (-1, -1), 8)]))
            story.extend([parties, Spacer(1, 5 * mm)])
            goods = [[Paragraph("<b>DESCRIZIONE DEI BENI / SERIALI / MATRICOLЕ</b>", body)]]
            goods.extend([[Paragraph(line, body)] for line in chunk])
            if page_index < len(chunks) - 1:
                goods.append([Paragraph("<i>Segue a pagina successiva…</i>", small)])
            goods_table = Table(goods, colWidths=[177 * mm], repeatRows=1)
            goods_table.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .7, colors.HexColor("#475569")), ("INNERGRID", (0, 0), (-1, -1), .3, colors.HexColor("#cbd5e1")), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")), ("PADDING", (0, 0), (-1, -1), 6)]))
            story.append(goods_table)
            if page_index == len(chunks) - 1:
                story.extend([Spacer(1, 7 * mm), Table([[
                    Paragraph(f"<b>VETTORE</b><br/>{item.carrier or '—'}", body),
                    Paragraph(f"<b>TRACKING</b><br/>{item.tracking_number or '—'}", body),
                ]], colWidths=[88.5 * mm, 88.5 * mm], style=[("BOX", (0, 0), (-1, -1), .7, colors.HexColor("#475569")), ("INNERGRID", (0, 0), (-1, -1), .4, colors.HexColor("#cbd5e1")), ("PADDING", (0, 0), (-1, -1), 8)]), Spacer(1, 14 * mm)])
                signatures = Table([["Firma Mittente", "Firma Vettore", "Firma Destinatario"], ["\n\n____________________", "\n\n____________________", "\n\n____________________"]], colWidths=[59 * mm] * 3)
                signatures.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 8)]))
                story.append(signatures)
            if page_index < len(chunks) - 1:
                story.append(PageBreak())
        document.build(story)
        buffer.seek(0)
        headers = {"Content-Disposition": f'inline; filename="{item.ddt_number}.pdf"'}
        return StreamingResponse(buffer, media_type="application/pdf", headers=headers)


@app.get("/api/v1/products")
def products(search: str = "", include_inactive: bool = False):
    with SessionLocal() as db:
        query = select(Product).order_by(Product.name)
        if not include_inactive:
            query = query.where(Product.is_active.is_(True))
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(or_(Product.sku.ilike(pattern), Product.name.ilike(pattern)))
        items = db.scalars(query).all()
        costs = [item.unit_cost_cents for item in items if item.unit_cost_cents is not None]
        return {
            "items": [serialize_product(item) for item in items],
            "total": len(items),
            "average_cost": round(sum(costs) / len(costs) / 100, 2) if costs else 0,
        }


@app.post("/api/v1/products")
def create_product(data: ProductRequest):
    sku, name = data.sku.strip().upper(), data.name.strip()
    if not sku or not name:
        raise HTTPException(422, "Codice articolo e nome sono obbligatori")
    with SessionLocal() as db:
        if db.scalar(select(Product).where(Product.sku == sku)):
            raise HTTPException(409, "Codice articolo già presente")
        item = Product(sku=sku, name=name, unit_cost_cents=cents_from_value(data.unit_cost))
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_product(item)


@app.put("/api/v1/products/{product_id}")
def update_product(product_id: uuid.UUID, data: ProductRequest):
    with SessionLocal() as db:
        item = db.get(Product, product_id)
        if not item:
            raise HTTPException(404, "Prodotto non trovato")
        sku, name = data.sku.strip().upper(), data.name.strip()
        duplicate = db.scalar(select(Product).where(Product.sku == sku, Product.id != product_id))
        if duplicate:
            raise HTTPException(409, "Codice articolo già presente")
        item.sku, item.name = sku, name
        item.unit_cost_cents = cents_from_value(data.unit_cost)
        item.is_active = True
        db.commit()
        return serialize_product(item)


@app.delete("/api/v1/products/{product_id}")
def delete_product(product_id: uuid.UUID):
    with SessionLocal() as db:
        item = db.get(Product, product_id)
        if not item:
            raise HTTPException(404, "Prodotto non trovato")
        item.is_active = False
        db.commit()
        return {"ok": True}


@app.post("/api/v1/products/import")
async def import_products(file: UploadFile = File(...)):
    contents = await file.read()
    rows = parse_uploaded_table(file.filename or "", contents)
    added = updated = rejected = 0
    errors = []
    with SessionLocal() as db:
        for index, row in enumerate(rows, 2):
            sku = mapped_value(row, PRODUCT_COLUMN_ALIASES["sku"]).strip().upper()
            name = mapped_value(row, PRODUCT_COLUMN_ALIASES["name"]).strip()
            cost = mapped_value(row, PRODUCT_COLUMN_ALIASES["unit_cost"])
            if not sku or not name:
                rejected += 1
                errors.append({"row": index, "error": "Codice o nome mancante"})
                continue
            item = db.scalar(select(Product).where(Product.sku == sku))
            if item:
                item.name = name
                item.unit_cost_cents = cents_from_value(cost)
                item.is_active = True
                updated += 1
            else:
                db.add(Product(sku=sku, name=name, unit_cost_cents=cents_from_value(cost)))
                added += 1
        db.commit()
    return {"added": added, "updated": updated, "rejected": rejected, "errors": errors[:50]}


@app.get("/api/v1/sim-orders")
def sim_orders():
    with SessionLocal() as db:
        return [serialize_order(item) for item in db.scalars(select(SimOrder).order_by(SimOrder.order_date.desc())).unique().all()]


@app.post("/api/v1/sim-orders")
def create_sim_order(data: SimOrderRequest):
    if not data.lines:
        raise HTTPException(422, "Inserisci almeno una riga d'ordine")
    if data.status not in ORDER_STATUSES:
        raise HTTPException(422, "Stato ordine non valido")
    with SessionLocal() as db:
        number = (data.order_number or "").strip().upper()
        if not number:
            year = data.order_date.year
            sequence = (db.scalar(select(func.count()).select_from(SimOrder).where(
                func.extract("year", SimOrder.order_date) == year
            )) or 0) + 1
            number = f"ORD-{year}-{sequence:03d}"
        if db.scalar(select(SimOrder).where(SimOrder.order_number == number)):
            raise HTTPException(409, "Numero ordine già presente")
        products_by_id = {
            item.id: item
            for item in db.scalars(select(Product).where(Product.id.in_([line.product_id for line in data.lines]))).all()
        }
        if len(products_by_id) != len(set(line.product_id for line in data.lines)):
            raise HTTPException(422, "Uno o più prodotti non esistono")
        if any(line.quantity <= 0 for line in data.lines):
            raise HTTPException(422, "Le quantità devono essere maggiori di zero")
        item = SimOrder(
            order_number=number,
            order_date=data.order_date,
            supplier=(data.supplier or "").strip() or None,
            notes=(data.notes or "").strip() or None,
            status=data.status,
        )
        db.add(item)
        db.flush()
        for line in data.lines:
            db.add(SimOrderLine(
                order_id=item.id,
                product_id=line.product_id,
                quantity=line.quantity,
                description=(line.description or "").strip() or None,
            ))
        db.commit()
        db.refresh(item)
        return serialize_order(item)


@app.patch("/api/v1/sim-orders/{order_id}/status")
def update_sim_order_status(order_id: uuid.UUID, data: OrderStatusRequest):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(422, "Stato ordine non valido")
    with SessionLocal() as db:
        item = db.get(SimOrder, order_id)
        if not item:
            raise HTTPException(404, "Ordine non trovato")
        item.status = data.status
        db.commit()
        return serialize_order(item)


@app.get("/api/v1/sim-orders/{order_id}/share")
def share_sim_order(order_id: uuid.UUID):
    with SessionLocal() as db:
        item = db.get(SimOrder, order_id)
        if not item:
            raise HTTPException(404, "Ordine non trovato")
        return {"subject": f"Ordine SIM {item.order_number}", "text": order_share_text(item)}


@app.get("/api/v1/sim-inventory")
def sim_inventory(
    search: str = "",
    status: str | None = None,
    product_id: uuid.UUID | None = None,
    order_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
    limit: int = Query(500, ge=1, le=2000),
):
    with SessionLocal() as db:
        query = select(SimInventory).order_by(SimInventory.created_at.desc()).limit(limit)
        if status:
            query = query.where(SimInventory.status == status)
        if product_id:
            query = query.where(SimInventory.product_id == product_id)
        if order_id:
            query = query.where(SimInventory.order_id == order_id)
        if customer_id:
            query = query.where(SimInventory.customer_id == customer_id)
        if search.strip():
            pattern = f"%{search.strip()}%"
            query = query.outerjoin(Customer).join(Product).outerjoin(SimOrder).where(or_(
                SimInventory.iccid.ilike(pattern),
                SimInventory.msisdn.ilike(pattern),
                Customer.business_name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.name.ilike(pattern),
                SimOrder.order_number.ilike(pattern),
            ))
        items = db.scalars(query).unique().all()
        return [serialize_inventory(item) for item in items]


@app.post("/api/v1/sim-inventory")
def create_sim_inventory(data: SimInventoryRequest):
    iccid = normalize_iccid(data.iccid)
    if len(iccid) not in {19, 20}:
        raise HTTPException(422, "L'ICCID deve contenere 19 o 20 cifre")
    if data.status not in SIM_STATUSES:
        raise HTTPException(422, "Stato SIM non valido")
    with SessionLocal() as db:
        if db.scalar(select(SimInventory).where(SimInventory.iccid == iccid)):
            raise HTTPException(409, "ICCID già presente")
        if not db.get(Product, data.product_id):
            raise HTTPException(422, "Prodotto non trovato")
        item = SimInventory(
            iccid=iccid,
            product_id=data.product_id,
            order_id=data.order_id,
            status=data.status,
            customer_id=data.customer_id,
            msisdn=normalize_iccid(data.msisdn) or None,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_inventory(item)


@app.patch("/api/v1/sim-inventory/{inventory_id}")
def update_sim_inventory(inventory_id: uuid.UUID, data: SimInventoryUpdate):
    with SessionLocal() as db:
        item = db.get(SimInventory, inventory_id)
        if not item:
            raise HTTPException(404, "SIM non trovata")
        if data.status is not None:
            if data.status not in SIM_STATUSES:
                raise HTTPException(422, "Stato SIM non valido")
            item.status = data.status
        item.customer_id = data.customer_id
        item.msisdn = normalize_iccid(data.msisdn) or None
        db.commit()
        return serialize_inventory(item)


@app.post("/api/v1/sim-inventory/import")
async def import_sim_inventory(
    file: UploadFile = File(...),
    product_sku: str | None = Form(None),
    order_number: str | None = Form(None),
    default_status: str = Form("IN_MAGAZZINO"),
):
    if default_status not in SIM_STATUSES:
        raise HTTPException(422, "Stato SIM non valido")
    contents = await file.read()
    rows = parse_uploaded_table(file.filename or "", contents)
    added = updated = rejected = 0
    errors = []
    with SessionLocal() as db:
        products = {item.sku.upper(): item for item in db.scalars(select(Product)).all()}
        customers = {item.business_name.strip().casefold(): item for item in db.scalars(select(Customer)).all()}
        orders = {item.order_number.upper(): item for item in db.scalars(select(SimOrder)).unique().all()}
        created_products = created_customers = created_orders = 0

        # Il formato esportato da Cornet contiene già articolo, ordine e cliente:
        # creiamo prima le anagrafiche mancanti, poi importiamo le singole SIM.
        for row in rows:
            sku = (mapped_value(row, SIM_COLUMN_ALIASES["sku"]) or product_sku or "").strip().upper()
            if sku and sku not in products:
                product = Product(sku=sku, name=sku, is_active=True)
                db.add(product)
                db.flush()
                products[sku] = product
                created_products += 1
            customer_name = mapped_value(row, SIM_COLUMN_ALIASES["customer"]).strip()
            customer_key = customer_name.casefold()
            if customer_name and customer_key not in customers:
                customer = Customer(
                    business_name=customer_name,
                    segment="MICROBUSINESS",
                    portfolio_status="ACTIVE",
                )
                db.add(customer)
                db.flush()
                customers[customer_key] = customer
                created_customers += 1

        order_lines: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        order_dates: dict[str, date] = {}
        for row in rows:
            source_order = (mapped_value(row, SIM_COLUMN_ALIASES["order_number"]) or order_number or "").strip().upper()
            sku = (mapped_value(row, SIM_COLUMN_ALIASES["sku"]) or product_sku or "").strip().upper()
            if source_order and sku:
                order_lines[source_order][sku] += 1
                order_dates.setdefault(source_order, parse_compact_date(mapped_value(row, SIM_COLUMN_ALIASES["order_date"])))
        for source_order, lines in order_lines.items():
            if source_order in orders:
                continue
            order = SimOrder(
                order_number=source_order,
                order_date=order_dates[source_order],
                supplier="WINDTRE",
                status="RICEVUTO",
            )
            db.add(order)
            db.flush()
            for sku, quantity in lines.items():
                db.add(SimOrderLine(order_id=order.id, product_id=products[sku].id, quantity=quantity))
            orders[source_order] = order
            created_orders += 1

        for index, row in enumerate(rows, 2):
            iccid = normalize_iccid(mapped_value(row, SIM_COLUMN_ALIASES["iccid"]))
            sku = (mapped_value(row, SIM_COLUMN_ALIASES["sku"]) or product_sku or "").strip().upper()
            status = normalize_header(mapped_value(row, SIM_COLUMN_ALIASES["status"]) or default_status)
            source_order = (mapped_value(row, SIM_COLUMN_ALIASES["order_number"]) or order_number or "").strip().upper()
            msisdn = normalize_iccid(mapped_value(row, SIM_COLUMN_ALIASES["msisdn"])) or None
            customer_name = mapped_value(row, SIM_COLUMN_ALIASES["customer"]).strip()
            customer = customers.get(customer_name.casefold()) if customer_name else None
            if customer or msisdn:
                status = "ASSEGNATA"
            product = products.get(sku)
            order = orders.get(source_order) if source_order else None
            if len(iccid) not in {19, 20} or not product or status not in SIM_STATUSES:
                rejected += 1
                errors.append({"row": index, "iccid": iccid, "error": "ICCID, prodotto o stato non valido"})
                continue
            item = db.scalar(select(SimInventory).where(SimInventory.iccid == iccid))
            if item:
                item.product_id = product.id
                item.order_id = order.id if order else None
                item.status = status
                item.msisdn = msisdn
                item.customer_id = customer.id if customer else None
                updated += 1
            else:
                db.add(SimInventory(
                    iccid=iccid,
                    product_id=product.id,
                    order_id=order.id if order else None,
                    status=status,
                    msisdn=msisdn,
                    customer_id=customer.id if customer else None,
                ))
                added += 1
        record = SimInventoryImport(
            file_name=file.filename or "import",
            added_count=added,
            updated_count=updated,
            rejected_count=rejected,
            errors=errors[:100],
        )
        db.add(record)
        db.commit()
        return {
            "id": str(record.id),
            "added": added,
            "updated": updated,
            "rejected": rejected,
            "created_products": created_products,
            "created_orders": created_orders,
            "created_customers": created_customers,
            "errors": errors[:50],
        }


@app.get("/api/v1/sim-inventory/imports")
def sim_inventory_import_history():
    with SessionLocal() as db:
        items = db.scalars(select(SimInventoryImport).order_by(SimInventoryImport.imported_at.desc()).limit(50)).all()
        return [{
            "id": str(item.id),
            "file_name": item.file_name,
            "added": item.added_count,
            "updated": item.updated_count,
            "rejected": item.rejected_count,
            "errors": item.errors,
            "imported_at": item.imported_at.isoformat(),
        } for item in items]


@app.get("/api/v1/sim-report")
def sim_report():
    with SessionLocal() as db:
        inventory = db.scalars(select(SimInventory).order_by(SimInventory.created_at)).all()
        orders = db.scalars(select(SimOrder).order_by(SimOrder.order_date.desc())).unique().all()
        total = len(inventory)
        available = sum(item.status == "IN_MAGAZZINO" for item in inventory)
        grouped: dict[str, dict[str, Any]] = {}
        for order in orders:
            group = grouped[str(order.id)] = {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "order_date": order.order_date.isoformat(),
                "status": order.status,
                "products": {},
            }
            for line in order.lines:
                group["products"][str(line.product_id)] = {
                    "product_id": str(line.product_id),
                    "sku": line.product.sku,
                    "product_name": line.product.name,
                    "ordered": line.quantity,
                    "total": 0,
                    "available": 0,
                }
        for item in inventory:
            key = str(item.order_id) if item.order_id else "NO_ORDER"
            group = grouped.setdefault(key, {
                "order_id": None,
                "order_number": "SENZA ORDINE",
                "order_date": None,
                "status": None,
                "products": {},
            })
            product = group["products"].setdefault(str(item.product_id), {
                "product_id": str(item.product_id),
                "sku": item.product.sku,
                "product_name": item.product.name,
                "ordered": 0,
                "total": 0,
                "available": 0,
            })
            product["total"] += 1
            product["available"] += item.status == "IN_MAGAZZINO"
        return {
            "total": total,
            "available": available,
            "assigned": total - available,
            "assignment_rate": round((total - available) / total * 100, 1) if total else 0,
            "orders": [
                {**group, "products": list(group["products"].values())}
                for group in grouped.values()
            ],
        }


@app.post("/api/v1/customers")
def quick_create_customer(data: QuickCustomerRequest):
    name = data.business_name.strip()
    if not name:
        raise HTTPException(422, "Ragione sociale obbligatoria")
    with SessionLocal() as db:
        tax_id = (data.tax_id or "").strip() or None
        if tax_id and db.scalar(select(Customer).where(Customer.tax_id == tax_id)):
            raise HTTPException(409, "Cliente già presente")
        item = Customer(
            business_name=name,
            tax_id=tax_id,
            address=(data.address or "").strip() or None,
            segment="MICROBUSINESS",
            portfolio_status="ACTIVE",
        )
        db.add(item)
        db.commit()
        return {"id": str(item.id), "business_name": item.business_name}


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


@app.get("/api/v1/dashboard/portfolio")
def portfolio_summary(segment: str = "BUSINESS_SME"):
    with SessionLocal() as db:
        customers_query = select(func.count()).select_from(Customer).where(
            Customer.segment == segment,
            Customer.portfolio_status == "ACTIVE",
        )
        customer_count = db.scalar(customers_query) or 0
        latest_import = db.scalar(
            select(WindTreImport)
            .order_by(WindTreImport.competence_month.desc(), WindTreImport.uploaded_at.desc())
            .limit(1)
        )
        rows = (
            db.scalars(
                select(WindTreImportRow)
                .join(Customer, Customer.id == WindTreImportRow.customer_id)
                .where(
                    WindTreImportRow.import_id == latest_import.id,
                    Customer.segment == segment,
                )
            ).all()
            if latest_import
            else []
        )
        totals = {
            "MOBILE_VOICE": {"count": 0, "mrr": 0.0},
            "MOBILE_DATA": {"count": 0, "mrr": 0.0},
            "MOBILE_M2M": {"count": 0, "mrr": 0.0},
            "MOBILE_OTHER": {"count": 0, "mrr": 0.0},
            "FIXED_DATA": {"count": 0, "mrr": 0.0},
            "ICT": {"count": 0, "mrr": 0.0},
            "OTHER": {"count": 0, "mrr": 0.0},
        }
        for row in rows:
            category = classify_asset(row)
            totals[category]["count"] += 1
            totals[category]["mrr"] = round(
                totals[category]["mrr"] + parse_monthly_fee(row.monthly_fee),
                2,
            )
        mobile_categories = ("MOBILE_VOICE", "MOBILE_DATA", "MOBILE_M2M", "MOBILE_OTHER")
        mobile = {
            "count": sum(totals[key]["count"] for key in mobile_categories),
            "mrr": round(sum(totals[key]["mrr"] for key in mobile_categories), 2),
            "breakdown": {
                "voice": totals["MOBILE_VOICE"],
                "data": totals["MOBILE_DATA"],
                "m2m": totals["MOBILE_M2M"],
                "other": totals["MOBILE_OTHER"],
            },
        }
        return {
            "segment": segment,
            "competence_month": latest_import.competence_month if latest_import else None,
            "customers": customer_count,
            "mobile": mobile,
            "fixed_data": totals["FIXED_DATA"],
            "ict": totals["ICT"],
            "other_services": totals["OTHER"],
            "total_mrr": round(sum(item["mrr"] for item in totals.values()), 2),
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


@app.get("/api/v1/customers/{customer_id}/services-pivot.xlsx")
def customer_services_excel(customer_id: uuid.UUID):
    with SessionLocal() as db:
        customer = db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(404, "Cliente non trovato")
        latest_import, rows = latest_customer_snapshot(db, customer_id)
        pivot = customer_service_pivot(rows)

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Servizi attivi"
        sheet.merge_cells("A1:C1")
        sheet["A1"] = f"Servizi attivi - {customer.business_name}"
        sheet["A1"].font = Font(size=16, bold=True, color="FFFFFF")
        sheet["A1"].fill = PatternFill("solid", fgColor="1B2035")
        sheet["A1"].alignment = Alignment(horizontal="left")
        sheet["A2"] = "Mese fotografia"
        sheet["B2"] = latest_import.competence_month if latest_import else "N/D"
        sheet.append([])
        sheet.append(["Piano Tariffario", "Utenze Attive", "Ricavo Mensile (MRR)"])
        header_row = sheet.max_row
        for cell in sheet[header_row]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="287A51")
        for item in pivot:
            sheet.append([item["plan"], item["count"], item["mrr"]])
            sheet.cell(sheet.max_row, 3).number_format = '€ #,##0.00'
        total_count = sum(int(item["count"]) for item in pivot)
        total_mrr = round(sum(float(item["mrr"]) for item in pivot), 2)
        sheet.append(["TOTALE GENERALE", total_count, total_mrr])
        for cell in sheet[sheet.max_row]:
            cell.font = Font(bold=True)
            cell.fill = PatternFill("solid", fgColor="E8F3EC")
        sheet.cell(sheet.max_row, 3).number_format = '€ #,##0.00'
        sheet.column_dimensions["A"].width = 42
        sheet.column_dimensions["B"].width = 18
        sheet.column_dimensions["C"].width = 24
        sheet.freeze_panes = f"A{header_row + 1}"
        sheet.auto_filter.ref = f"A{header_row}:C{sheet.max_row - 1}"

        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        filename = f"servizi_attivi_{safe_export_name(customer.business_name)}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


@app.get("/api/v1/customers/{customer_id}/services-pivot.pdf")
def customer_services_pdf(customer_id: uuid.UUID):
    with SessionLocal() as db:
        customer = db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(404, "Cliente non trovato")
        latest_import, rows = latest_customer_snapshot(db, customer_id)
        pivot = customer_service_pivot(rows)
        total_count = sum(int(item["count"]) for item in pivot)
        total_mrr = round(sum(float(item["mrr"]) for item in pivot), 2)

        output = BytesIO()
        document = SimpleDocTemplate(
            output,
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
            title=f"Servizi attivi - {customer.business_name}",
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CornetTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1B2035"),
            spaceAfter=6,
        )
        story = [
            Paragraph("Servizi attivi", title_style),
            Paragraph(customer.business_name, styles["Heading2"]),
            Paragraph(
                f"Fotografia portafoglio: {latest_import.competence_month if latest_import else 'N/D'}",
                styles["BodyText"],
            ),
            Spacer(1, 8 * mm),
        ]
        data = [["Piano Tariffario", "Utenze Attive", "Ricavo Mensile (MRR)"]]
        data.extend(
            [[item["plan"], str(item["count"]), italian_currency(float(item["mrr"]))] for item in pivot]
        )
        data.append(["TOTALE GENERALE", str(total_count), italian_currency(total_mrr)])
        table = Table(data, colWidths=[91 * mm, 32 * mm, 51 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#287A51")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E8F3EC")),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9CED8")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        story.append(table)
        document.build(story)
        output.seek(0)
        filename = f"servizi_attivi_{safe_export_name(customer.business_name)}.pdf"
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


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
