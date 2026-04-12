import unittest
from pathlib import Path

from ocr_engine.models import OCRRequest, OutputFormat


class OCRRequestTests(unittest.TestCase):
    def test_request_rejects_missing_file(self) -> None:
        request = OCRRequest(input_path=Path("missing.png"))

        with self.assertRaises(FileNotFoundError):
            request.validate()

    def test_request_rejects_invalid_psm(self) -> None:
        with self.subTest("invalid psm"):
            image_path = Path(__file__).parent / "scan.png"
            image_path.write_bytes(b"not really an image")
            self.addCleanup(image_path.unlink)

            request = OCRRequest(input_path=image_path, psm=99)

            with self.assertRaisesRegex(ValueError, "psm"):
                request.validate()

    def test_json_output_is_default(self) -> None:
        image_path = Path(__file__).parent / "scan.png"
        image_path.write_bytes(b"not really an image")
        self.addCleanup(image_path.unlink)

        request = OCRRequest(input_path=image_path)

        self.assertEqual(request.output_format, OutputFormat.JSON)


if __name__ == "__main__":
    unittest.main()
