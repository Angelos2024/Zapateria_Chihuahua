$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectName = Split-Path -Leaf $ProjectDir
$Port = 45126
$BaseUrl = "http://127.0.0.1:$Port/"
$StartUrl = "${BaseUrl}${ProjectName}/botas-seguridad.html?admin=1"
$AdminDataPath = Join-Path $ProjectDir 'product-admin-data.js'
$ProductImagesDir = Join-Path $ProjectDir 'img\productos'

function Write-Response {
  param(
    [Parameter(Mandatory = $true)] $Context,
    [int] $StatusCode = 200,
    [string] $ContentType = 'text/plain; charset=utf-8',
    [byte[]] $Body = [byte[]]::new(0)
  )

  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = $ContentType
  $Context.Response.Headers['Access-Control-Allow-Origin'] = '*'
  $Context.Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Context.Response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
  $Context.Response.ContentLength64 = $Body.Length
  if ($Body.Length -gt 0) {
    $Context.Response.OutputStream.Write($Body, 0, $Body.Length)
  }
  $Context.Response.Close()
}

function Write-TextResponse {
  param(
    [Parameter(Mandatory = $true)] $Context,
    [int] $StatusCode = 200,
    [string] $ContentType = 'text/plain; charset=utf-8',
    [string] $Text = ''
  )

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  Write-Response -Context $Context -StatusCode $StatusCode -ContentType $ContentType -Body $bytes
}

function Get-MimeType {
  param([string] $Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.css'  { 'text/css; charset=utf-8' }
    '.js'   { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.gif'  { 'image/gif' }
    '.webp' { 'image/webp' }
    '.svg'  { 'image/svg+xml; charset=utf-8' }
    default { 'application/octet-stream' }
  }
}

function Resolve-StaticPath {
  param([string] $RequestPath)

  $path = [System.Uri]::UnescapeDataString($RequestPath)
  if ($path.StartsWith("/$ProjectName", [System.StringComparison]::OrdinalIgnoreCase)) {
    $path = $path.Substring($ProjectName.Length + 1)
  }
  if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') {
    $path = '/index.html'
  }

  $relative = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $ProjectDir $relative))
  $root = [System.IO.Path]::GetFullPath($ProjectDir)

  if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $candidate
}

function Read-RequestBody {
  param($Request)

  $reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Get-SafeName {
  param([string] $Value)

  $safe = ($Value.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
  if ([string]::IsNullOrWhiteSpace($safe)) {
    return 'producto'
  }
  return $safe
}

function Save-DataImage {
  param(
    [string] $DataUrl,
    [string] $ProductKey,
    [int] $Index
  )

  if ([string]::IsNullOrWhiteSpace($DataUrl) -or -not $DataUrl.StartsWith('data:image/', [System.StringComparison]::OrdinalIgnoreCase)) {
    return $DataUrl
  }

  $match = [regex]::Match($DataUrl, '^data:(image/(png|jpeg|jpg|webp|gif));base64,(.+)$')
  if (-not $match.Success) {
    throw 'Una imagen subida no tiene formato base64 valido.'
  }

  $extension = switch ($match.Groups[2].Value.ToLowerInvariant()) {
    'jpeg' { 'jpg' }
    'jpg' { 'jpg' }
    'png' { 'png' }
    'webp' { 'webp' }
    'gif' { 'gif' }
    default { 'jpg' }
  }

  if (-not (Test-Path -LiteralPath $ProductImagesDir)) {
    New-Item -ItemType Directory -Path $ProductImagesDir | Out-Null
  }

  $bytes = [Convert]::FromBase64String($match.Groups[3].Value)
  $safeProduct = Get-SafeName -Value $ProductKey
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $fileName = "admin-$safeProduct-$stamp-$Index.$extension"
  $targetPath = Join-Path $ProductImagesDir $fileName
  [System.IO.File]::WriteAllBytes($targetPath, $bytes)

  return "img/productos/$fileName"
}

function Normalize-ProductImages {
  param($Products)

  foreach ($property in $Products.PSObject.Properties) {
    $productKey = [string] $property.Name
    $meta = $property.Value
    if ($null -eq $meta) {
      continue
    }

    $imageMap = @{}
    $nextImages = @()
    $index = 1

    $currentImages = @()
    if ($null -ne $meta.images) {
      $currentImages = @($meta.images)
    } elseif ($null -ne $meta.image) {
      $currentImages = @($meta.image)
    }

    foreach ($image in $currentImages) {
      $imageValue = [string] $image
      if ([string]::IsNullOrWhiteSpace($imageValue)) {
        continue
      }

      if ($imageMap.ContainsKey($imageValue)) {
        $savedPath = $imageMap[$imageValue]
      } else {
        $savedPath = Save-DataImage -DataUrl $imageValue -ProductKey $productKey -Index $index
        $imageMap[$imageValue] = $savedPath
      }

      $nextImages += $savedPath
      $index += 1
    }

    $coverImage = [string] $meta.coverImage
    if ($imageMap.ContainsKey($coverImage)) {
      $coverImage = $imageMap[$coverImage]
    } elseif ($coverImage.StartsWith('data:image/', [System.StringComparison]::OrdinalIgnoreCase)) {
      $coverImage = Save-DataImage -DataUrl $coverImage -ProductKey $productKey -Index $index
    }

    $image = [string] $meta.image
    if ($imageMap.ContainsKey($image)) {
      $image = $imageMap[$image]
    } elseif ($image.StartsWith('data:image/', [System.StringComparison]::OrdinalIgnoreCase)) {
      $image = Save-DataImage -DataUrl $image -ProductKey $productKey -Index $index
    }

    if ($nextImages.Count -gt 0) {
      if ([string]::IsNullOrWhiteSpace($coverImage) -or $coverImage.StartsWith('data:image/', [System.StringComparison]::OrdinalIgnoreCase)) {
        $coverImage = $nextImages[0]
      }
      if ([string]::IsNullOrWhiteSpace($image) -or $image.StartsWith('data:image/', [System.StringComparison]::OrdinalIgnoreCase)) {
        $image = $coverImage
      }
    }

    $meta | Add-Member -NotePropertyName 'images' -NotePropertyValue $nextImages -Force
    $meta | Add-Member -NotePropertyName 'coverImage' -NotePropertyValue $coverImage -Force
    $meta | Add-Member -NotePropertyName 'image' -NotePropertyValue $image -Force
  }
}

function Handle-AdminState {
  param($Context)

  if ($Context.Request.HttpMethod -eq 'OPTIONS') {
    Write-TextResponse -Context $Context -ContentType 'application/json; charset=utf-8' -Text '{"ok":true}'
    return
  }

  if ($Context.Request.HttpMethod -eq 'GET') {
    if (-not (Test-Path -LiteralPath $AdminDataPath)) {
      Write-TextResponse -Context $Context -StatusCode 404 -ContentType 'application/json; charset=utf-8' -Text '{"ok":false,"error":"product-admin-data.js no existe"}'
      return
    }
    $content = Get-Content -LiteralPath $AdminDataPath -Raw
    $json = $content -replace '^\s*window\.PRODUCT_ADMIN_DATA\s*=\s*', ''
    $json = $json -replace ';\s*$', ''
    Write-TextResponse -Context $Context -ContentType 'application/json; charset=utf-8' -Text $json
    return
  }

  if ($Context.Request.HttpMethod -ne 'POST') {
    Write-TextResponse -Context $Context -StatusCode 405 -ContentType 'application/json; charset=utf-8' -Text '{"ok":false,"error":"Metodo no permitido"}'
    return
  }

  try {
    $rawBody = Read-RequestBody -Request $Context.Request
    $payload = $rawBody | ConvertFrom-Json
    if ($null -eq $payload.products) {
      throw 'El payload no incluye products.'
    }

    Normalize-ProductImages -Products $payload.products

    $data = [ordered]@{
      savedAt = if ($payload.savedAt) { [string] $payload.savedAt } else { (Get-Date).ToUniversalTime().ToString('o') }
      source = 'product-admin'
      products = $payload.products
    }

    $json = $data | ConvertTo-Json -Depth 100
    $fileContent = "window.PRODUCT_ADMIN_DATA = $json;`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($AdminDataPath, $fileContent, $utf8NoBom)

    $response = [ordered]@{
      ok = $true
      data = $data
    } | ConvertTo-Json -Depth 100
    Write-TextResponse -Context $Context -ContentType 'application/json; charset=utf-8' -Text $response
  } catch {
    $message = ($_.Exception.Message -replace '"', '\"')
    Write-TextResponse -Context $Context -StatusCode 400 -ContentType 'application/json; charset=utf-8' -Text "{`"ok`":false,`"error`":`"$message`"}"
  }
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($BaseUrl)

try {
  $listener.Start()
} catch {
  Write-Host "No se pudo iniciar el servidor en $BaseUrl"
  Write-Host "Detalle: $($_.Exception.Message)"
  Write-Host "Si ya hay otra ventana abierta, cierrala e intenta otra vez."
  exit 1
}

Write-Host "Servidor local activo:"
Write-Host $StartUrl
Write-Host ''
Write-Host 'Deja esta ventana abierta mientras trabajas. Ctrl+C detiene el servidor.'
Start-Process $StartUrl

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath

    try {
      if ($path -eq '/api/product-admin-state') {
        Handle-AdminState -Context $context
        continue
      }

      $filePath = Resolve-StaticPath -RequestPath $path
      if ($null -eq $filePath -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        Write-TextResponse -Context $context -StatusCode 404 -Text 'Archivo no encontrado.'
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      Write-Response -Context $context -ContentType (Get-MimeType -Path $filePath) -Body $bytes
    } catch {
      if ($context.Response.OutputStream.CanWrite) {
        Write-TextResponse -Context $context -StatusCode 500 -Text "Error local: $($_.Exception.Message)"
      }
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
