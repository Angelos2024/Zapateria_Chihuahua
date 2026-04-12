from pathlib import Path
import unittest
from unittest.mock import patch

from ocr_engine.pdf_ocr import PdfOcrOptions, PdfOcrService


class PdfOcrServiceTests(unittest.TestCase):
    def test_build_command_includes_improvement_flags(self) -> None:
        service = PdfOcrService(command="ocrmypdf")
        command = service._build_command(
            Path("in.pdf"),
            Path("out.pdf"),
            Path("out.txt"),
            PdfOcrOptions(languages="spa+eng", rotate_pages=True, deskew=True, clean=True),
        )

        self.assertIn("--rotate-pages", command)
        self.assertIn("--deskew", command)
        self.assertIn("--clean", command)
        self.assertIn("--sidecar", command)
        self.assertEqual(command[-2:], ["in.pdf", "out.pdf"])

    def test_rejects_non_pdf(self) -> None:
        service = PdfOcrService(command="ocrmypdf")

        with patch("ocr_engine.pdf_ocr.shutil.which", return_value="ocrmypdf"):
            with self.assertRaisesRegex(ValueError, "PDF"):
                service._validate_input(Path(__file__), PdfOcrOptions())

    def test_rejects_conflicting_modes(self) -> None:
        service = PdfOcrService(command="ocrmypdf")
        pdf_path = Path(__file__).with_name("temp_conflict.pdf")
        pdf_path.write_bytes(b"%PDF-1.4\n")
        self.addCleanup(pdf_path.unlink)

        with patch("ocr_engine.pdf_ocr.shutil.which", return_value="ocrmypdf"):
            with self.assertRaisesRegex(ValueError, "force_ocr"):
                service._validate_input(
                    pdf_path,
                    PdfOcrOptions(force_ocr=True, redo_ocr=True),
                )


if __name__ == "__main__":
    unittest.main()
