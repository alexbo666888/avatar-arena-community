param([string]$PythonExe = '')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 or 24 LTS from https://nodejs.org/ first.' }
    $nodeMajor = & node -p "Number(process.versions.node.split('.')[0])"
    if ($LASTEXITCODE -ne 0 -or [int]$nodeMajor -lt 22) { throw 'Node.js 22+ is required.' }
    if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
        $ErrorActionPreference = 'SilentlyContinue'
        if (-not $PythonExe -and (Get-Command py -ErrorAction SilentlyContinue)) {
            $candidate = & py -3.12 -c "import sys;print(sys.executable)" 2>$null
            if ($LASTEXITCODE -eq 0) { $PythonExe = "$candidate" }
        }
        if (-not $PythonExe -and (Get-Command python -ErrorAction SilentlyContinue)) {
            $candidate = & python -c "import sys;print(sys.executable if sys.version_info[:2] == (3,12) else '')" 2>$null
            if ($LASTEXITCODE -eq 0 -and $candidate) { $PythonExe = "$candidate" }
        }
        if (-not $PythonExe -and (Get-Command uv -ErrorAction SilentlyContinue)) {
            $candidate = & uv python find 3.12 --offline 2>$null
            if ($LASTEXITCODE -eq 0) { $PythonExe = "$candidate" }
        }
        $ErrorActionPreference = 'Stop'
        if (-not $PythonExe) { throw 'Install Python 3.12 from https://www.python.org/downloads/windows/ or pass -PythonExe C:\path\python.exe to setup.ps1.' }
        & $PythonExe -c "import sys; assert sys.version_info[:2] == (3,12), 'Python 3.12 required'"
        if ($LASTEXITCODE -ne 0) { throw 'The selected Python is not 3.12.' }
        & $PythonExe -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 environment creation failed.' }
    }
    & .\.venv\Scripts\python.exe -c "import sys; assert sys.version_info[:2] == (3,12), 'Python 3.12 required'"
    if ($LASTEXITCODE -ne 0) { throw 'The existing .venv is not Python 3.12. Use a clean extracted folder.' }
    & .\.venv\Scripts\python.exe -m pip install -r requirements-local.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check network and retry install.bat.' }
    & .\.venv\Scripts\python.exe -m pip check
    if ($LASTEXITCODE -ne 0) { throw 'Dependency check failed.' }
    Write-Host 'Ready. Run start.bat. WebView2 Runtime is required: https://developer.microsoft.com/microsoft-edge/webview2/'
    exit 0
} catch {
    Write-Host ('Setup failed: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
