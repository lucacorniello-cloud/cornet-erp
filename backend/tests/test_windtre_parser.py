from io import BytesIO
import unittest

from openpyxl import Workbook

from app.main import build_preview, parse_workbook


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


if __name__ == "__main__":
    unittest.main()
