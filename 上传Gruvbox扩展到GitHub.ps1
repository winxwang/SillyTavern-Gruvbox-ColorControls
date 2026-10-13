#requires -Version 5.1
<#
SillyTavern Gruvbox ColorControls 自动上传脚本
目标仓库：https://github.com/winxwang/SillyTavern-Gruvbox-ColorControls
本地目录：D:\GitHub\SillyTavern-Gruvbox-ColorControls

功能：
- 检查本地目录与 Git 状态
- 确认 GitHub 远程仓库
- 自动暂存、提交并推送到 main
- 不会覆盖或删除本地文件
- 如果目录不是 Git 仓库，会尝试在当前目录初始化并配置 origin
- 不会自动猜测/下载 ZIP 内容；请先将要上传的文件放入本地目标目录

使用方式：
1. 把此脚本放到任意位置。
2. 在 PowerShell 中执行：
   powershell -ExecutionPolicy Bypass -File ".\上传Gruvbox扩展到GitHub.ps1"
#>

$ErrorActionPreference = 'Stop'
$RepoDir = 'D:\GitHub\SillyTavern-Gruvbox-ColorControls'
$RemoteUrl = 'https://github.com/winxwang/SillyTavern-Gruvbox-ColorControls.git'
$Branch = 'main'

function Stop-WithMessage([string]$Message) {
    Write-Host "`n[错误] $Message" -ForegroundColor Red
    Read-Host '按 Enter 退出'
    exit 1
}

function Run-Git([string[]]$GitArgs) {
    Write-Host ("`n> git " + ($GitArgs -join ' ')) -ForegroundColor DarkGray
    & git @GitArgs
    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage ("git 命令失败，退出码：$LASTEXITCODE")
    }
}

Write-Host '=== Gruvbox ColorControls 自动上传到 GitHub ===' -ForegroundColor Cyan
Write-Host "本地目录：$RepoDir"
Write-Host "目标仓库：$RemoteUrl"
Write-Host ''

if (-not (Test-Path -LiteralPath $RepoDir -PathType Container)) {
    Stop-WithMessage "找不到目标目录：$RepoDir`n请先确认文件夹存在。脚本不会擅自创建空目录代替已有项目。"
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Stop-WithMessage '系统未找到 git。请先安装 Git for Windows，并重新打开 PowerShell。'
}

Set-Location -LiteralPath $RepoDir

# 检查目录中是否有实际项目文件
$projectFiles = Get-ChildItem -LiteralPath $RepoDir -Force -File -Recurse |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' -and $_.Name -ne '.DS_Store' }

if (-not $projectFiles -or $projectFiles.Count -eq 0) {
    Stop-WithMessage "目录中没有可上传的文件：$RepoDir`n请先将扩展源码、manifest、README 等文件放入该目录。"
}

Write-Host '发现的文件（最多显示前 40 个）：' -ForegroundColor Yellow
$projectFiles | Select-Object -First 40 | ForEach-Object {
    Write-Host ('  ' + $_.FullName.Substring($RepoDir.Length).TrimStart('\'))
}
if ($projectFiles.Count -gt 40) {
    Write-Host ("  ... 另有 {0} 个文件" -f ($projectFiles.Count - 40))
}

# 若不是 Git 仓库，则初始化
if (-not (Test-Path -LiteralPath (Join-Path $RepoDir '.git') -PathType Container)) {
    Write-Host "`n当前目录不是 Git 仓库，准备初始化。" -ForegroundColor Yellow
    Run-Git @('init', '-b', $Branch)
    Run-Git @('remote', 'add', 'origin', $RemoteUrl)
} else {
    # 读取远程；如没有 origin 则补上，如 URL 不一致则提示并修正
    $origin = (& git remote get-url origin 2>$null)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($origin -join '').Trim())) {
        Run-Git @('remote', 'add', 'origin', $RemoteUrl)
    } elseif (($origin -join '').Trim().TrimEnd('/') -ne $RemoteUrl.TrimEnd('/')) {
        Write-Host "origin 当前指向：$($origin -join '')" -ForegroundColor Yellow
        $answer = Read-Host "是否将 origin 改为 $RemoteUrl ？输入 Y 确认"
        if ($answer -notin @('Y','y')) {
            Stop-WithMessage '用户取消，未修改远程仓库地址。'
        }
        Run-Git @('remote', 'set-url', 'origin', $RemoteUrl)
    }
}

# 读取当前分支；统一提交到 main
$currentBranch = (& git branch --show-current 2>$null).Trim()
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    Run-Git @('checkout', '-B', $Branch)
} elseif ($currentBranch -ne $Branch) {
    Write-Host "当前分支为 $currentBranch，将切换/重命名到 $Branch。" -ForegroundColor Yellow
    Run-Git @('branch', '-M', $Branch)
}

# 检查 GitHub 远程是否可访问
Write-Host "`n检查 GitHub 远程仓库……" -ForegroundColor Cyan
& git ls-remote --heads origin $Branch
if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage '无法读取 GitHub 远程仓库。请检查网络、仓库地址、GitHub 登录/凭据，以及仓库是否存在。'
}

# 显示变更，暂存所有项目文件
Write-Host "`n当前 Git 状态：" -ForegroundColor Cyan
& git status --short
if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage '无法读取 Git 状态。'
}

Run-Git @('add', '-A')

$staged = (& git diff --cached --name-only)
if ([string]::IsNullOrWhiteSpace(($staged -join '').Trim())) {
    Write-Host "`n没有检测到新的或已修改的文件，无需提交。" -ForegroundColor Green
    Write-Host '如果你预期有文件上传，请确认文件已放入目标目录，且没有被 .gitignore 排除。'
    Read-Host '按 Enter 退出'
    exit 0
}

Write-Host "`n即将提交以下文件：" -ForegroundColor Yellow
$staged | ForEach-Object { Write-Host "  $_" }
Write-Host "`n注意：这会把上述暂存内容推送到 GitHub 的 main 分支。" -ForegroundColor Yellow
$confirm = Read-Host '确认继续？输入 YES'
if ($confirm -cne 'YES') {
    Stop-WithMessage '用户取消；文件已暂存，但未提交或推送。'
}

$commitMessage = 'Add or update Gruvbox ColorControls files'
Run-Git @('commit', '-m', $commitMessage)

# 若远程已有提交，先以 rebase 方式整合，避免直接覆盖远程历史
Write-Host "`n同步远程 main 分支……" -ForegroundColor Cyan
& git pull --rebase origin $Branch
if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "git pull --rebase 失败。为避免覆盖远程内容，脚本已停止；请先处理冲突，再重新运行。"
}

Run-Git @('push', '-u', 'origin', $Branch)

Write-Host "`n上传完成。" -ForegroundColor Green
Write-Host "仓库：https://github.com/winxwang/SillyTavern-Gruvbox-ColorControls"
Write-Host "本地目录：$RepoDir"
& git log -1 --oneline
Read-Host '按 Enter 退出'
