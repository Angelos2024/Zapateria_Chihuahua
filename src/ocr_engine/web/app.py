from __future__ import annotations

import os
import uuid
from pathlib import Path

from flask import Flask, abort, render_template, request, send_file, url_for
from werkzeug.utils import secure_filename

from ..pdf_ocr import PdfOcrOptions, PdfOcrService

WORK_DIR = Path(os.environ.get("OCR_WEB_WORK_DIR", "var/ocr_jobs"))
MAX_UPLOAD_MB = int(os.environ.get("OCR_WEB_MAX_UPLOAD_MB", "50"))


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

    @app.get("/")
    def index():
        return render_template("index.html", max_upload_mb=MAX_UPLOAD_MB)

    @app.post("/ocr")
    def ocr():
        uploaded = request.files.get("document")
        if uploaded is None or not uploaded.filename:
            return render_template("index.html", error="Carga un archivo PDF.", max_upload_mb=MAX_UPLOAD_MB), 400

        filename = secure_filename(uploaded.filename)
        if Path(filename).suffix.lower() != ".pdf":
            return render_template("index.html", error="Solo se aceptan archivos PDF.", max_upload_mb=MAX_UPLOAD_MB), 400

        job_id = uuid.uuid4().hex
        job_dir = WORK_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        source_pdf = job_dir / filename
        output_pdf = job_dir / "documento_buscable.pdf"
        output_text = job_dir / "documento.txt"
        uploaded.save(source_pdf)

        mode = request.form.get("ocr_mode", "skip")
        options = PdfOcrOptions(
            languages=request.form.get("languages", "spa+eng").strip() or "spa+eng",
            rotate_pages=request.form.get("rotate_pages") == "on",
            deskew=request.form.get("deskew") == "on",
            clean=request.form.get("clean") == "on",
            force_ocr=mode == "force",
            redo_ocr=mode == "redo",
        )

        try:
            result = PdfOcrService(command=request.form.get("ocrmypdf_cmd", "ocrmypdf").strip() or "ocrmypdf").scan_pdf(
                source_pdf,
                output_pdf,
                output_text,
                options,
            )
        except Exception as exc:  # noqa: BLE001 - web UI should present a clean error.
            return render_template(
                "index.html",
                error=str(exc),
                max_upload_mb=MAX_UPLOAD_MB,
            ), 500

        return render_template(
            "result.html",
            job_id=job_id,
            text=result.text,
            searchable_pdf_url=url_for("download_file", job_id=job_id, kind="pdf"),
            text_url=url_for("download_file", job_id=job_id, kind="txt"),
        )

    @app.get("/download/<job_id>/<kind>")
    def download_file(job_id: str, kind: str):
        if not job_id.isalnum():
            abort(404)
        paths = {
            "pdf": WORK_DIR / job_id / "documento_buscable.pdf",
            "txt": WORK_DIR / job_id / "documento.txt",
        }
        path = paths.get(kind)
        if path is None or not path.exists():
            abort(404)
        return send_file(path, as_attachment=True)

    return app


def main() -> int:
    app = create_app()
    app.run(host=os.environ.get("OCR_WEB_HOST", "127.0.0.1"), port=int(os.environ.get("OCR_WEB_PORT", "5000")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
