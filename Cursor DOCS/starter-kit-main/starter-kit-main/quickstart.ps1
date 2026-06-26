# Abu Dhabi AI PropTech Challenge - one command to a running AI agent (Windows).
#
#   powershell -ExecutionPolicy Bypass -File .\quickstart.ps1
#
# Creates a local virtualenv, installs the few dependencies, and runs the
# land-intelligence example end to end. No API keys needed.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Show-Fallback {
    Write-Host ""
    Write-Host "Windows fallback - if setup keeps fighting you, do not lose time:"
    Write-Host "  - GitHub Codespaces (zero local setup): open this repo, Code, Codespaces"
    Write-Host "  - Google Colab: upload the notebook in notebooks\ and run there"
    Write-Host "  - WSL: run 'wsl --install', then use the bash quickstart (./quickstart.sh)"
    Write-Host "  - Long-path errors: run as admin 'git config --system core.longpaths true'"
    Write-Host "  - Stuck? Ask in Discord #help-desk: https://discord.gg/jy3QDxQ3jK"
    exit 1
}

# Find a real Python 3.10+ (the Microsoft Store stub fails this check safely)
$python = $null
$pyargs = @()
foreach ($candidate in @("py", "python", "python3")) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $candidateArgs = if ($candidate -eq "py") { @("-3") } else { @() }
        try {
            $ok = & $candidate @candidateArgs -c "import sys; print(1 if sys.version_info >= (3,10) else 0)" 2>$null
            if ("$ok".Trim() -eq "1") { $python = $candidate; $pyargs = $candidateArgs; break }
        } catch {}
    }
}
if (-not $python) {
    Write-Host "X Python 3.10+ not found. Install it from https://python.org (tick Add Python to PATH) and retry."
    Show-Fallback
}

Write-Host "- Creating virtualenv (.venv)..."
& $python @pyargs -m venv .venv
if ($LASTEXITCODE -ne 0) { Write-Host "X Could not create the virtualenv."; Show-Fallback }

# Absolute path to the venv Python; a relative path breaks after we change directory.
$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) { Write-Host "X Virtualenv Python not found at $venvPy."; Show-Fallback }

Write-Host "- Installing dependencies (pandas, matplotlib, jupyter)..."
& $venvPy -m pip install --quiet --upgrade pip
if ($LASTEXITCODE -ne 0) { Write-Host "X pip could not upgrade itself."; Show-Fallback }
& $venvPy -m pip install --quiet pandas matplotlib jupyter
if ($LASTEXITCODE -ne 0) { Write-Host "X Dependency install failed (often a Windows long-path issue)."; Show-Fallback }

# Verify the imports actually work before claiming success.
& $venvPy -c "import pandas, matplotlib" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "X Dependencies installed but will not import; the environment is not usable."; Show-Fallback }

Write-Host "- Running the Land Intelligence example agent..."
Write-Host ""
Push-Location examples\land-intelligence-agent
& $venvPy main.py
$exampleExit = $LASTEXITCODE
Pop-Location
if ($exampleExit -ne 0) { Write-Host "X The example agent did not run cleanly."; Show-Fallback }

Write-Host ""
Write-Host "OK - You're set. Next moves:"
Write-Host ""
Write-Host "  - Explore the data:     .venv\Scripts\jupyter notebook notebooks\explore_sample_data.ipynb"
Write-Host "  - Try the other agents: examples\investment-matching-agent  and  examples\decision-copilot"
Write-Host "  - Build a web UI:       https://github.com/abu-dhabi-ai-proptech-challenge/project-template"
Write-Host "  - Stuck? Discord:       https://discord.gg/jy3QDxQ3jK"
