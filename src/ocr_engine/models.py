from __future__ import annotations

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class OutputFormat(str, Enum):
    TXT = "txt"
    JSON = "json"
    PDF = "pdf"
    HOCR = "hocr"


@dataclass(frozen=True)
class OCRRequest:
    input_path: Path
    output_format: OutputFormat = OutputFormat.JSON
    languages: str = "spa+eng"
    psm: int = 3
    oem: int = 1

    def validate(self) -> None:
        if not self.input_path.exists():
            raise FileNotFoundError(f"Input file does not exist: {self.input_path}")
        if not self.input_path.is_file():
            raise ValueError(f"Input path is not a file: {self.input_path}")
        if not self.languages.strip():
            raise ValueError("At least one OCR language is required.")
        if self.psm < 0 or self.psm > 13:
            raise ValueError("Tesseract psm must be between 0 and 13.")
        if self.oem < 0 or self.oem > 3:
            raise ValueError("Tesseract oem must be between 0 and 3.")


@dataclass
class OCRResult:
    text: str
    output_format: OutputFormat
    engine: str
    languages: str
    source_path: Path
    text_payload: str | None = None
    binary_payload: bytes | None = None

    def to_json_payload(self) -> dict[str, object]:
        return {
            "engine": self.engine,
            "languages": self.languages,
            "source_path": str(self.source_path),
            "output_format": self.output_format.value,
            "text": self.text,
        }

    def as_text(self) -> str:
        if self.text_payload is not None:
            return self.text_payload
        if self.output_format == OutputFormat.JSON:
            return json.dumps(self.to_json_payload(), indent=2)
        return self.text

    def write_to(self, output_path: Path) -> None:
        if self.binary_payload is not None:
            output_path.write_bytes(self.binary_payload)
            return
        output_path.write_text(self.as_text(), encoding="utf-8")
