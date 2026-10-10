#Requires -Version 5.1
<#
Publish this application's source files to the existing GitHub main branch.
The source directory is never changed. A fresh clone preserves remote history
and LICENSE. No credentials are embedded and no force push is performed.

Usage:
  .\push-github.ps1
  .\push-github.ps1 -Yes
#>
[CmdletBinding()]
param(
    [string]$SourceDirectory = $PSScriptRoot,
    [switch]$Yes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$RepositoryUrl = 'https://github.com/bucala/Kinematicke_modely.git'
$RepositoryPage = 'https://github.com/bucala/Kinematicke_modely'
$Branch = 'main'
$PublishDirectory = $null
$OriginalPath = $env:Path
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$Utf8 = [System.Text.UTF8Encoding]::new($false)
$ProjectFiles = @(
    '.gitignore'
    '.gitattributes'
    '.node-version'
    '.github/workflows/ci.yml'
    '_headers'
    'wrangler.toml'
    'package.json'
    'index.html'
    'app.js'
    'engine.js'
    'double-drawer.js'
    'editor.js'
    'physics.js'
    'exports.js'
    'cad.js'
    'projects/dvojite-sklopeny-suflik-reference.png'
    'projects/dvojite-sklopeny-suflik.md'
    'styles.css'
    'favicon.svg'
    'README.md'
    'DEPLOYMENT.md'
    'VALIDATION.md'
    'push-github.ps1'
    'push-github.cmd'
    'scripts/server.mjs'
    'scripts/build.mjs'
    'scripts/archive.mjs'
    'tests/cases.js'
    'tests/editor-cases.js'
    'tests/physics-cases.js'
    'tests/export-cases.js'
    'tests/export-integration.test.mjs'
    'tests/test_fusion.py'
    'tests/kinematics.test.mjs'
    'tests/browser.html'
    'tests/browser.js'
    'vendor/pdfmake/pdfmake.min.js'
    'vendor/pdfmake/vfs_fonts.js'
    'vendor/pdfmake/LICENSE'
    'vendor/pdfmake/Roboto-LICENSE.txt'
    'vendor/pdfmake/PROVENANCE.md'
    'cad/KinmoFusion/KinmoFusion.py'
    'cad/KinmoFusion/bridge.py'
    'cad/KinmoFusion/KinmoFusion.manifest'
    'cad/KinmoFusion/README.md'
)
$SecretPatterns = @(
    '-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
    '\bgh[pousr]_[A-Za-z0-9]{20,}\b'
    '\bgithub_pat_[A-Za-z0-9_]{20,}\b'
    '\bxox[baprs]-[A-Za-z0-9-]{20,}\b'
    '\bAKIA[0-9A-Z]{16}\b'
)

function Resolve-Application {
    param(
        [Parameter(Mandatory = $true)][string[]]$Names,
        [string[]]$Candidates = @(),
        [Parameter(Mandatory = $true)][string]$MissingMessage
    )
    foreach ($name in $Names) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($command) { return $command.Source }
    }
    foreach ($pathValue in @($MachinePath, $UserPath)) {
        if ([string]::IsNullOrWhiteSpace($pathValue)) { continue }
        foreach ($directory in ($pathValue -split ';')) {
            $directory = [System.Environment]::ExpandEnvironmentVariables($directory.Trim().Trim('"'))
            if ([string]::IsNullOrWhiteSpace($directory)) { continue }
            foreach ($name in $Names) {
                $candidate = Join-Path $directory $name
                if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
            }
        }
    }
    foreach ($candidate in $Candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and
            (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return $candidate
        }
    }
    throw $MissingMessage
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE. Publication stopped."
    }
}

function Invoke-RepoGit {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    Invoke-Checked -Executable $GitPath -Arguments (@('--no-pager', '-C', $PublishDirectory) + $Arguments)
}

function Assert-NoLinkedPath {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string]$RelativePath
    )
    $current = $Directory
    foreach ($part in ($RelativePath -split '[/\\]')) {
        $current = Join-Path $current $part
        if ((Test-Path -LiteralPath $current) -and
            ((Get-Item -LiteralPath $current).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
            throw "A symbolic link or junction exists in the publication path: $RelativePath"
        }
    }
}

function Assert-PublishFiles {
    param([Parameter(Mandatory = $true)][string]$Directory)
    foreach ($relative in $ProjectFiles) {
        Assert-NoLinkedPath -Directory $Directory -RelativePath $relative
        $file = Join-Path $Directory $relative
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Required source file is missing: $relative"
        }
        $text = [System.IO.File]::ReadAllText($file)
        foreach ($pattern in $SecretPatterns) {
            if ($text -match $pattern) {
                throw "Possible secret detected in $relative. Remove it before publication."
            }
        }
    }
}

function Assert-License {
    if (-not (Test-Path -LiteralPath $LicensePath -PathType Leaf)) {
        throw 'The original remote LICENSE was removed. Publication stopped.'
    }
    if ((Get-FileHash -LiteralPath $LicensePath -Algorithm SHA256).Hash -ne $LicenseHash) {
        throw 'The original remote LICENSE was changed. Publication stopped.'
    }
}

function Invoke-Checks {
    Push-Location -LiteralPath $PublishDirectory
    try {
        Invoke-Checked -Executable $NpmPath -Arguments @('run', 'check')
        Invoke-Checked -Executable $NpmPath -Arguments @('test')
        Invoke-Checked -Executable $NpmPath -Arguments @('run', 'build')
    }
    finally {
        Pop-Location
    }
    Assert-PublishFiles -Directory $PublishDirectory
    Assert-License
}

function Stage-And-Review {
    Invoke-RepoGit -Arguments (@('add', '--') + $ProjectFiles)
    Invoke-RepoGit -Arguments @('diff', '--cached', '--check')
    Invoke-RepoGit -Arguments @('status', '--short')
    Invoke-RepoGit -Arguments @('diff', '--cached', '--stat')
    $diff = @(Invoke-RepoGit -Arguments @('diff', '--cached', '--no-ext-diff', '--no-color'))
    [System.IO.File]::WriteAllText($ReviewPath, ($diff -join "`n") + "`n", $Utf8)
    Write-Host ""
    Write-Host "Review the complete staged diff: $ReviewPath" -ForegroundColor Yellow
    Write-Host "Only the explicitly listed source files are staged."
    Write-Host "Secret detection is best-effort; check the diff for sensitive data."
}

function Assert-OnlyExpectedChanges {
    $status = @(Invoke-RepoGit -Arguments @('status', '--porcelain', '--untracked-files=all'))
    foreach ($entry in $status) {
        if ($entry.Length -lt 4 -or $ProjectFiles -notcontains $entry.Substring(3)) {
            throw 'Unexpected changes exist in the publish clone. Review them manually before proceeding.'
        }
    }
    return $status.Count
}

function Confirm-Publication {
    param([Parameter(Mandatory = $true)][string]$Word)
    if ($Yes) { return }
    $answer = Read-Host "After reviewing the diff, type $Word to continue"
    if ($answer -cne $Word) {
        throw 'Publication cancelled. The source and prepared clone are preserved.'
    }
}

try {
    if (-not (Test-Path -LiteralPath $SourceDirectory -PathType Container)) {
        throw 'SourceDirectory must point to the application directory.'
    }
    $SourceDirectory = (Resolve-Path -LiteralPath $SourceDirectory).ProviderPath
    $gitCandidates = @()
    $nodeCandidates = @()
    foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
        if ([string]::IsNullOrWhiteSpace($root)) { continue }
        $gitCandidates += Join-Path $root 'Git/cmd/git.exe'
        $gitCandidates += Join-Path $root 'Programs/Git/cmd/git.exe'
        $nodeCandidates += Join-Path $root 'nodejs/node.exe'
        $nodeCandidates += Join-Path $root 'Programs/nodejs/node.exe'
    }
    $GitPath = Resolve-Application -Names @('git.exe', 'git') -Candidates $gitCandidates -MissingMessage 'Git was not found in PATH or standard installation folders. Install Git for Windows from git-scm.com or run: winget install --id Git.Git --exact --source winget'
    $NodePath = Resolve-Application -Names @('node.exe', 'node') -Candidates $nodeCandidates -MissingMessage 'Node.js was not found. Install Node.js LTS from nodejs.org or run: winget install --id OpenJS.NodeJS.LTS --exact --source winget'
    $npmCandidates = @((Join-Path (Split-Path -Parent $NodePath) 'npm.cmd'))
    $NpmPath = Resolve-Application -Names @('npm.cmd', 'npm') -Candidates $npmCandidates -MissingMessage 'npm was not found next to Node.js or in PATH. Repair the Node.js LTS installation with npm enabled.'

    # Child processes (npm, Git credential manager, hooks) also need the tools.
    # Restore the original process PATH when this script finishes.
    $toolDirectories = @(
        (Split-Path -Parent $GitPath)
        (Split-Path -Parent $NodePath)
        (Split-Path -Parent $NpmPath)
    )
    if (-not [string]::IsNullOrWhiteSpace($env:SystemRoot)) {
        $toolDirectories += Join-Path $env:SystemRoot 'System32'
    }
    $toolDirectories += $PSHOME
    $env:Path = (@($toolDirectories) + @($OriginalPath, $MachinePath, $UserPath) |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ';'

    $nodeVersionText = [string](Invoke-Checked -Executable $NodePath -Arguments @('--version'))
    if ($nodeVersionText.Trim() -notmatch '^v(\d+\.\d+\.\d+)') {
        throw 'Cannot determine the installed Node.js version.'
    }
    if ([version]$Matches[1] -lt [version]'20.11.0') {
        throw 'Node.js 20.11 or newer is required. Node.js 24 is recommended.'
    }
    Assert-PublishFiles -Directory $SourceDirectory

    $PublishDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('kinematicke-modely-publish-' + [guid]::NewGuid().ToString('N'))
    if (Test-Path -LiteralPath $PublishDirectory) {
        throw 'The temporary clone directory already exists. Nothing was overwritten.'
    }
    Write-Host "Target: $RepositoryPage ($Branch)" -ForegroundColor Cyan
    Write-Host "Source remains untouched: $SourceDirectory"
    Write-Host "Publication clone: $PublishDirectory"
    Invoke-Checked -Executable $GitPath -Arguments @('clone', '--branch', $Branch, '--single-branch', '--', $RepositoryUrl, $PublishDirectory)

    $BaseCommit = ([string](Invoke-RepoGit -Arguments @('rev-parse', 'HEAD'))).Trim()
    if (([string](Invoke-RepoGit -Arguments @('branch', '--show-current'))).Trim() -ne $Branch) {
        throw 'The clone is not on the expected main branch.'
    }
    # Use the environment's existing author/committer configuration, unchanged.
    Invoke-RepoGit -Arguments @('var', 'GIT_AUTHOR_IDENT') | Out-Null
    Invoke-RepoGit -Arguments @('var', 'GIT_COMMITTER_IDENT') | Out-Null

    $LicensePath = Join-Path $PublishDirectory 'LICENSE'
    if (-not (Test-Path -LiteralPath $LicensePath -PathType Leaf)) {
        throw 'Expected remote LICENSE is missing. Inspect the repository before publishing.'
    }
    $LicenseHash = (Get-FileHash -LiteralPath $LicensePath -Algorithm SHA256).Hash
    $ReviewPath = Join-Path $PublishDirectory '.git/kinematika-review.patch'

    foreach ($relative in $ProjectFiles) {
        Assert-NoLinkedPath -Directory $PublishDirectory -RelativePath $relative
        $destination = Join-Path $PublishDirectory $relative
        $parent = Split-Path -Parent $destination
        if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
            New-Item -ItemType Directory -Path $parent | Out-Null
        }
        Copy-Item -LiteralPath (Join-Path $SourceDirectory $relative) -Destination $destination -Force
    }

    Invoke-Checks
    Assert-OnlyExpectedChanges | Out-Null
    Stage-And-Review
    $staged = @(Invoke-RepoGit -Arguments @('diff', '--cached', '--name-only'))
    if ($staged.Count -eq 0) {
        Write-Host 'GitHub already contains the same source files. No commit or push is necessary.' -ForegroundColor Green
        Write-Host "Clone preserved: $PublishDirectory"
        exit 0
    }

    Confirm-Publication -Word 'PUSH'
    $messagePath = Join-Path $PublishDirectory '.git/kinematika-commit-message.txt'
    $message = @'
Add kinematic mechanism simulator

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>
'@
    [System.IO.File]::WriteAllText($messagePath, $message + "`n", $Utf8)
    Invoke-RepoGit -Arguments @('commit', '--file', $messagePath)

    # Include changes made by a passing commit hook, once and only before push.
    if ((Assert-OnlyExpectedChanges) -gt 0) {
        Write-Host 'A commit hook changed application files. Rechecking before one amend.' -ForegroundColor Yellow
        Invoke-Checks
        Stage-And-Review
        Confirm-Publication -Word 'AMEND'
        Invoke-RepoGit -Arguments @('commit', '--amend', '--no-edit')
        if ((Assert-OnlyExpectedChanges) -gt 0) {
            throw 'A hook changed files again. Resolve this in the preserved clone; nothing was pushed.'
        }
    }
    Assert-License

    $latest = [string](Invoke-RepoGit -Arguments @('ls-remote', '--exit-code', 'origin', 'refs/heads/main'))
    $remoteCommit = ($latest.Trim() -split '\s+')[0]
    if ($remoteCommit -ne $BaseCommit) {
        throw 'Remote main changed during preparation. Nothing was pushed. Rerun from a fresh clone or merge manually.'
    }

    $localCommit = ([string](Invoke-RepoGit -Arguments @('rev-parse', 'HEAD'))).Trim()
    Invoke-RepoGit -Arguments @('push', 'origin', 'HEAD:refs/heads/main')
    Invoke-RepoGit -Arguments @('fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main')
    Invoke-RepoGit -Arguments @('merge-base', '--is-ancestor', $localCommit, 'refs/remotes/origin/main')
    Write-Host ""
    Write-Host "Push verified: $RepositoryPage/commit/$localCommit" -ForegroundColor Green
    Write-Host "Clone preserved: $PublishDirectory"
    Write-Host 'Cloudflare was not modified by this script.'
    Write-Host 'If Workers Builds is already connected to this repository, the push can trigger its configured deployment.'
}
catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    if ($PublishDirectory -and (Test-Path -LiteralPath $PublishDirectory)) {
        Write-Host "Prepared clone preserved for inspection: $PublishDirectory" -ForegroundColor Yellow
    }
    Write-Host 'The original source directory was not modified. No force push was used.'
    Write-Host 'Git and Node.js must be installed, a Git author must already be configured, and GitHub write access must be available.'
    exit 1
}
finally {
    $env:Path = $OriginalPath
}
