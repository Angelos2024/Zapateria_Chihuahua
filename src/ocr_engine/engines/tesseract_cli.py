from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from ..models import OCRRequest, OCRResult, OutputFormat


class TesseractCliEngine:
    """Tesseract backend that shells out to the local tesseract binary."""

    def __init__(self, command: str = "tesseract") -> None:
        self.command = command

    def scan(self, request: OCRRequest) -> OCRResult:
        request.validate()

        if request.output_format in {OutputFormat.TXT, OutputFormat.JSON}:
            text = self._read_text(request)
            result = OCRResult(
                text=text,
                output_format=request.output_format,
                engine="tesseract",
                languages=request.languages,
                source_path=request.input_path,
            )
            if request.output_format == OutputFormat.JSON:
                result.text_payload = json.dumps(result.to_json_payload(), indent=2)
            return result

        binary_payload = self._render_file(request)
        return OCRResult(
            text="",
            output_format=request.output_format,
            engine="tesseract",
            languages=request.languages,
            source_path=request.input_path,
            binary_payload=binary_payload,
        )

    def _read_text(self, request: OCRRequest) -> str:
        command = self._base_command(request, "stdout")
        completed = self._run(command)
        return completed.stdout

    def _render_file(self, request: OCRRequest) -> bytes:
        with tempfile.TemporaryDirectory(prefix="ocr_engine_") as tmpdir:
            output_base = Path(tmpdir) / "document"
            command = self._base_command(request, str(output_base))
            command.append(request.output_format.value)
            self._run(command)

            output_path = output_base.with_suffix(f".{request.output_format.value}")
            if not output_path.exists():
                raise RuntimeError(f"Tesseract did not create expected output: {output_path}")
            return output_path.read_bytes()

    def _base_command(self, request: OCRRequest, output_base: str) -> list[str]:
        return [
            self.command,
            str(request.input_path),
            output_base,
            "-l",
            request.languages,
            "--oem",
            str(request.oem),
            "--psm",
            str(request.psm),
        ]

    def _run(self, command: list[str]) -> subprocess.CompletedProcess[str]:
        if not shutil.which(self.command) and not Path(self.command).exists():
            raise RuntimeError(
                "Tesseract is not available. Install Tesseract OCR or pass --tesseract-cmd."
            )

        try:
            return subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
        except subprocess.CalledProcessError as exc:
            stderr = exc.stderr.strip() or "no stderr"
            raise RuntimeError(f"Tesseract failed: {stderr}") from exc
