from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PdfOcrOptions:
    languages: str = "spa+eng"
    rotate_pages: bool = True
    deskew: bool = True
    clean: bool = False
    force_ocr: bool = False
    redo_ocr: bool = False
    rasterizer: str = "pypdfium"
    output_type: str = "pdf"


@dataclass(frozen=True)
class PdfOcrResult:
    source_pdf: Path
    searchable_pdf: Path
    text_path: Path
    text: str
    command: list[str]


class PdfOcrService:
    def __init__(self, command: str = "ocrmypdf") -> None:
        self.command = command

    def scan_pdf(
        self,
        input_pdf: Path,
        output_pdf: Path,
        output_text: Path,
        options: PdfOcrOptions | None = None,
    ) -> PdfOcrResult:
        options = options or PdfOcrOptions()
        self._validate_input(input_pdf, options)
        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        output_text.parent.mkdir(parents=True, exist_ok=True)

        command = self._build_command(input_pdf, output_pdf, output_text, options)
        self._run(command)

        if not output_pdf.exists():
            raise RuntimeError(f"OCRmyPDF did not create expected PDF: {output_pdf}")
        if not output_text.exists():
            raise RuntimeError(f"OCRmyPDF did not create expected text file: {output_text}")

        return PdfOcrResult(
            source_pdf=input_pdf,
            searchable_pdf=output_pdf,
            text_path=output_text,
            text=output_text.read_text(encoding="utf-8", errors="replace"),
            command=command,
        )

    def _command_prefix(self) -> list[str]:
        if self.command == "ocrmypdf":
            return [sys.executable, "-m", "ocrmypdf"]
        if shutil.which(self.command) or Path(self.command).exists():
            return [self.command]
        raise RuntimeError(
            "OCRmyPDF is not available. Install OCRmyPDF or pass a valid OCRmyPDF command."
        )

    def _validate_input(self, input_pdf: Path, options: PdfOcrOptions) -> None:
        if not self._command_exists():
            raise RuntimeError(
                "OCRmyPDF is not available. Install OCRmyPDF and its system dependencies."
            )
        if not input_pdf.exists():
            raise FileNotFoundError(f"Input PDF does not exist: {input_pdf}")
        if input_pdf.suffix.lower() != ".pdf":
            raise ValueError("Only PDF files are supported in the web OCR flow.")
        if not options.languages.strip():
            raise ValueError("At least one OCR language is required.")
        if options.force_ocr and options.redo_ocr:
            raise ValueError("Use force_ocr or redo_ocr, not both.")

    def _build_command(
        self,
        input_pdf: Path,
        output_pdf: Path,
        output_text: Path,
        options: PdfOcrOptions,
    ) -> list[str]:
        command = [
            *self._command_prefix(),
            "--language",
            options.languages,
            "--rasterizer",
            options.rasterizer,
            "--output-type",
            options.output_type,
            "--sidecar",
            str(output_text),
        ]

        if options.rotate_pages:
            command.append("--rotate-pages")
        if options.deskew:
            command.append("--deskew")
        if options.clean:
            command.append("--clean")
        if options.force_ocr:
            command.append("--force-ocr")
        if options.redo_ocr:
            command.append("--redo-ocr")

        command.extend([str(input_pdf), str(output_pdf)])
        return command

    def _command_exists(self) -> bool:
        if self.command == "ocrmypdf":
            check = subprocess.run(
                [sys.executable, "-m", "ocrmypdf", "--version"],
                capture_output=True,
                text=True,
            )
            return check.returncode == 0
        return bool(shutil.which(self.command) or Path(self.command).exists())

    def _run(self, command: list[str]) -> None:
        env = self._process_env()
        try:
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
            )
        except subprocess.CalledProcessError as exc:
            stderr = exc.stderr.strip() or "no stderr"
            raise RuntimeError(f"OCRmyPDF failed: {stderr}") from exc

    def _process_env(self) -> dict[str, str]:
        env = os.environ.copy()
        tesseract_dir = Path(r"C:\Program Files\Tesseract-OCR")
        if tesseract_dir.exists():
            env["PATH"] = f"{tesseract_dir}{os.pathsep}{env.get('PATH', '')}"

        local_tessdata = Path("var/tessdata").resolve()
        if local_tessdata.exists():
            env["TESSDATA_PREFIX"] = str(local_tessdata)

        temp_dir = Path("var/tmp").resolve()
        temp_dir.mkdir(parents=True, exist_ok=True)
        env["TMP"] = str(temp_dir)
        env["TEMP"] = str(temp_dir)
        env["TMPDIR"] = str(temp_dir)
        return env
