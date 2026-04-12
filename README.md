# Motor OCR de documentos

Este repositorio contiene una base local para escanear documentos con OCR usando Tesseract como motor inicial. La integracion evita depender de servicios externos: llama al binario `tesseract` instalado en la maquina y puede exportar texto, JSON, hOCR o PDF buscable.

## Por que Tesseract primero

Tesseract es un motor OCR open source con licencia Apache 2.0 y documentacion vigente para la version 5.x. Soporta multiples idiomas mediante archivos `traineddata`, incluidos `spa` y `eng`.

Alternativas libres que vale la pena considerar despues:

- PaddleOCR / PP-OCRv5: mejor candidato para documentos complejos, varios idiomas, texto rotado o manuscrito; requiere mas dependencias y peso de modelos.
- EasyOCR: facil de instalar desde Python y soporta 80+ idiomas; tambien trae dependencias de aprendizaje profundo.
- OCRmyPDF: recomendable si el flujo principal sera convertir PDFs escaneados en PDFs buscables.

Para arrancar en este ambiente, Tesseract es la opcion mas simple y estable. La arquitectura del paquete deja el motor aislado para agregar esos backends despues sin cambiar la CLI principal.

## Instalacion local

1. Instala Tesseract OCR.

   En Windows, usa el instalador recomendado por la documentacion de Tesseract para builds actuales de UB Mannheim y agrega la carpeta del ejecutable al `PATH`:

   ```powershell
   C:\Program Files\Tesseract-OCR
   ```

2. Verifica que el binario exista:

   ```powershell
   tesseract --version
   tesseract --list-langs
   ```

3. Crea y activa un entorno Python si lo deseas:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   ```

4. Ejecuta un OCR basico:

   ```powershell
   ocr-scan .\documentos\scan.png --lang spa+eng --output .\salida\scan.json
   ```

Tambien se puede ejecutar sin instalar el paquete:

```powershell
python -m ocr_engine.cli .\documentos\scan.png --lang spa+eng --output .\salida\scan.txt --format txt
```

## Uso

Texto plano:

```powershell
ocr-scan .\documentos\scan.png --format txt --output .\salida\scan.txt
```

JSON con metadatos:

```powershell
ocr-scan .\documentos\scan.png --format json --output .\salida\scan.json
```

PDF buscable:

```powershell
ocr-scan .\documentos\scan.png --format pdf --output .\salida\scan.pdf
```

hOCR:

```powershell
ocr-scan .\documentos\scan.png --format hocr --output .\salida\scan.hocr
```

Si Tesseract no esta en el `PATH`, pasa la ruta completa:

```powershell
ocr-scan .\documentos\scan.png --tesseract-cmd "C:\Program Files\Tesseract-OCR\tesseract.exe"
```

## Siguientes integraciones recomendadas

- Agregar `OCRmyPDF` para PDFs multipagina escaneados.
- Agregar un backend `paddleocr` para mayor precision en documentos con tablas, rotacion o manuscritos.
- Agregar preprocesamiento de imagen con OpenCV/Pillow: deskew, binarizacion, aumento de contraste y eliminacion de ruido.
