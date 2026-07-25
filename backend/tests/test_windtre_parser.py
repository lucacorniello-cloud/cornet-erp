from io import BytesIO
import unittest

from openpyxl import Workbook

from app.main import (
    WindTreImportRow,
    asset_details,
    build_preview,
    classify_asset,
    find_activation_date,
    parse_monthly_fee,
    parse_workbook,
)


class WindTreParserTests(unittest.TestCase):
    def make_file(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(
            [
                "CODICE_CLIENTE",
                "RAGIONE_SOCIALE",
                "PARTITA_IVA",
                "MSISDN",
                "PIANO_TARIFFARIO_ATTUALE",
                "CANONE_SIM",
                "DATA_ATTIVAZIONE",
                "DESCRIZIONE_TERMINALE",
                "V_SMARTPHONE",
                "V_SIM_RINNOVABILI",
            ]
        )
        sheet.append(
            [
                "C001",
                "Rossi SRL",
                "01234567890",
                "3931111111",
                "Business Unlimited",
                15.90,
                "15/06/2025",
                "Apple iPhone",
                "Y_PREMIUM",
                "Y_11E",
            ]
        )
        target = BytesIO()
        workbook.save(target)
        return target.getvalue()

    def test_extracts_customer_asset_and_campaigns(self):
        rows = parse_workbook(self.make_file())
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["customer_key"], "C001")
        self.assertEqual(rows[0]["asset_key"], "3931111111")
        self.assertEqual(rows[0]["business_name"], "Rossi SRL")
        self.assertEqual(
            rows[0]["campaigns"],
            {"V_SMARTPHONE": "Y_PREMIUM", "V_SIM_RINNOVABILI": "Y_11E"},
        )

    def test_builds_preview_with_quality_and_sample(self):
        contents = self.make_file()
        rows = parse_workbook(contents)
        preview = build_preview("portafoglio.xlsx", contents, rows)

        self.assertEqual(preview["file_name"], "portafoglio.xlsx")
        self.assertEqual(preview["row_count"], 1)
        self.assertEqual(preview["customer_count"], 1)
        self.assertEqual(preview["asset_count"], 1)
        self.assertEqual(preview["campaign_count"], 2)
        self.assertEqual(preview["quality"]["duplicate_asset_rows"], 0)
        self.assertEqual(preview["sample_rows"][0]["business_name"], "Rossi SRL")
        self.assertIn("V_SMARTPHONE", preview["campaign_names"])

    def test_normalizes_monthly_fee_and_asset_details(self):
        self.assertEqual(parse_monthly_fee("1.234,56 €"), 1234.56)
        self.assertEqual(parse_monthly_fee("15.9"), 15.9)
        details = asset_details(
            {
                "DATA_ATTIVAZIONE": "15/06/2025",
                "DESCRIZIONE_TERMINALE": "Apple iPhone",
                "CAMPO_NON_GESTITO": "valore",
            }
        )
        self.assertEqual(
            details,
            [
                {"key": "DATA_ATTIVAZIONE", "label": "Data attivazione", "value": "15/06/2025"},
                {"key": "DESCRIZIONE_TERMINALE", "label": "Terminale", "value": "Apple iPhone"},
            ],
        )

    def test_finds_activation_date_from_windtre_header_variants(self):
        self.assertEqual(find_activation_date({"DATA_ATTIVAZIONE_MSISDN": "15/06/2025"}), "15/06/2025")
        self.assertEqual(find_activation_date({"DT_ATTIVAZIONE_LINEA": "01/07/2024"}), "01/07/2024")
        self.assertEqual(find_activation_date({"DATA_INIZIO_VALIDITA": "10/01/2023"}), "10/01/2023")
        details = asset_details({"DT_ATTIVAZIONE_LINEA": "01/07/2024"})
        self.assertEqual(
            details,
            [{"key": "DT_ATTIVAZIONE_LINEA", "label": "Dt Attivazione Linea", "value": "01/07/2024"}],
        )

    def test_classifies_mobile_fixed_and_other_assets(self):
        mobile = WindTreImportRow(
            row_number=1,
            customer_key="C1",
            asset_key="A1",
            business_name="Cliente",
            raw_data={"MSISDN": "3931111111", "CANONE_SIM": "10"},
            campaigns={},
        )
        fixed = WindTreImportRow(
            row_number=2,
            customer_key="C1",
            asset_key="A2",
            business_name="Cliente",
            # Nel DB Tool anche una linea fissa può avere MSISDN.
            raw_data={"MSISDN": "0299999999", "CANONE_ACCESSO": "25"},
            campaigns={},
        )
        other = WindTreImportRow(
            row_number=3,
            customer_key="C1",
            asset_key="A3",
            business_name="Cliente",
            asset_type="Microsoft 365",
            raw_data={"DES_PRODOTTO_MKP": "Microsoft 365"},
            campaigns={},
        )
        self.assertEqual(classify_asset(mobile), "MOBILE")
        self.assertEqual(classify_asset(fixed), "FIXED_DATA")
        self.assertEqual(classify_asset(other), "OTHER")


if __name__ == "__main__":
    unittest.main()
