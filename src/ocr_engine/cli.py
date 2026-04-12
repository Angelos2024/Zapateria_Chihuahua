from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .engines.tesseract_cli import TesseractCliEngine
from .models import OutputFormat, OCRRequest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ocr-scan",
        description="Run OCR on a local document image using Tesseract.",
    )
    parser.add_argument("input", type=Path, help="Path to an image document.")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Output path. Defaults to stdout for text/json.",
    )
    parser.add_argument(
        "--format",
        "-f",
        choices=[item.value for item in OutputFormat],
        default=OutputFormat.JSON.value,
        help="Output format.",
    )
    parser.add_argument(
        "--lang",
        "-l",
        default="spa+eng",
        help="Tesseract language expression, for example spa, eng, or spa+eng.",
    )
    parser.add_argument(
        "--psm",
        type=int,
        default=3,
        help="Tesseract page segmentation mode.",
    )
    parser.add_argument(
        "--oem",
        type=int,
        default=1,
        help="Tesseract OCR engine mode.",
    )
    parser.add_argument(
        "--tesseract-cmd",
        default="tesseract",
        help="Tesseract executable path.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    request = OCRRequest(
        input_path=args.input,
        output_format=OutputFormat(args.format),
        languages=args.lang,
        psm=args.psm,
        oem=args.oem,
    )

    engine = TesseractCliEngine(command=args.tesseract_cmd)

    try:
        result = engine.scan(request)
    except Exception as exc:  # noqa: BLE001 - CLI should return a concise error.
        print(f"ocr-scan: {exc}", file=sys.stderr)
        return 1

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        result.write_to(args.output)
        return 0

    if result.binary_payload is not None:
        print("ocr-scan: binary formats require --output", file=sys.stderr)
        return 1

    print(result.as_text(), end="" if result.as_text().endswith("\n") else "\n")
    return 0
