# Motor OCR web de documentos

Este repositorio contiene una base local para escanear documentos con OCR. Incluye una CLI directa con Tesseract y una interfaz web para que cualquier persona cargue un PDF, genere texto y descargue un PDF buscable.

## Motor recomendado para PDF

Tesseract es un motor OCR open source con licencia Apache 2.0 y documentacion vigente para la version 5.x. Soporta multiples idiomas mediante archivos `traineddata`, incluidos `spa` y `eng`.

Para PDFs escaneados, el flujo web usa `OCRmyPDF` como envoltura de Tesseract. OCRmyPDF agrega mejoras utiles: rotacion automatica, enderezado de paginas, texto lateral `.txt` y PDF buscable. La limpieza de ruido queda como opcion avanzada porque requiere `unpaper`.

Alternativas libres que vale la pena considerar despues:

- PaddleOCR / PP-OCRv5: mejor candidato para documentos complejos, varios idiomas, texto rotado o manuscrito; requiere mas dependencias y peso de modelos.
- EasyOCR: facil de instalar desde Python y soporta 80+ idiomas; tambien trae dependencias de aprendizaje profundo.

La arquitectura deja el procesamiento separado de la web para agregar backends como PaddleOCR despues sin cambiar la pantalla principal.

## Instalacion para la web

1. Instala Tesseract OCR y agrega su carpeta al `PATH`.

   En Windows, usa el instalador recomendado por la documentacion de Tesseract para builds actuales de UB Mannheim y agrega la carpeta del ejecutable al `PATH`:

   ```powershell
   C:\Program Files\Tesseract-OCR
   ```

2. Instala Ghostscript si necesitas PDF/A o el rasterizador tradicional de OCRmyPDF. El flujo actual usa `pypdfium2` y `--output-type pdf`, asi que puede operar sin Ghostscript para el caso base.

3. Instala OCRmyPDF. En Windows suele ser mas estable instalarlo en un entorno Python dedicado:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   pip install ocrmypdf
   ```

4. Instala la dependencia web del proyecto:

   ```powershell
   pip install -e ".[web]"
   ```

5. Verifica la instalacion:

   ```powershell
   & "C:\Program Files\Tesseract-OCR\tesseract.exe" --version
   python -m ocrmypdf --version
   ```

6. Levanta la aplicacion web:

   ```powershell
   ocr-web
   ```

   Abre:

   ```text
   http://127.0.0.1:5000
   ```

Tambien se puede ejecutar sin instalar el script:

```powershell
$env:PYTHONPATH='src'
python -m ocr_engine.web.app
```

## Uso web

La pantalla permite:

- cargar un PDF;
- seleccionar idiomas, por defecto `spa+eng`;
- corregir rotacion;
- enderezar paginas;
- limpiar ruido de imagen;
- respetar texto existente, rehacer OCR o forzar OCR completo;
- descargar texto `.txt`;
- descargar PDF buscable.

Los resultados se guardan localmente en `var/ocr_jobs/`.

## Configuracion actual de este ambiente

- Flask quedo instalado con `pip install -e ".[web]"`.
- OCRmyPDF quedo instalado con `python -m pip install ocrmypdf pypdfium2`.
- Tesseract existe en `C:\Program Files\Tesseract-OCR\tesseract.exe`.
- El proyecto usa `var/tessdata/` para `eng`, `spa` y `osd`, mas las configuraciones necesarias de Tesseract.
- La opcion "Limpiar ruido de imagen con unpaper" requiere instalar `unpaper`; esta desactivada por defecto.
- Los scripts `ocr-web.exe` y `ocr-scan.exe` quedaron en `C:\Users\pik_y\AppData\Local\Python\pythoncore-3.14-64\Scripts`, que no esta en el `PATH`; por eso el arranque mas confiable es `python -m ocr_engine.web.app`.

## Uso CLI directo

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
