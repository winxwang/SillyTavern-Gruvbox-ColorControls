# SillyTavern Gruvbox ColorControls - GitHub upload helper
# Target directory: D:\GitHub\SillyTavern-Gruvbox-ColorControls
# This script intentionally pauses on exit so errors remain visible.

$ErrorActionPreference = "Stop"
$TargetDir = "D:\GitHub\SillyTavern-Gruvbox-ColorControls"
$RepoUrl = "https://github.com/winxwang/SillyTavern-Gruvbox-ColorControls.git"
$LogPath = Join-Path $env:TEMP "Gruvbox-GitHub-upload.log"

function Write-Step([string]$Message) {
    Write-Host "`n[INFO] $Message" -ForegroundColor Cyan
}
function Stop-WithMessage([string]$Message) {
    Write-Host "`n[ERROR] $Message" -ForegroundColor Red
    Write-Host "日志位置：$LogPath" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
    exit 1
}

try {
    Start-Transcript -Path $LogPath -Append | Out-Null
    Write-Host "=== Gruvbox 扩展 GitHub 上传工具（防闪退版）===" -ForegroundColor Green
    Write-Host "目标目录：$TargetDir"
    Write-Host "仓库：$RepoUrl"

    if (-not (Test-Path -LiteralPath $TargetDir -PathType Container)) {
        Stop-WithMessage "目标目录不存在：$TargetDir`n请先创建该目录，或确认路径是否正确。"
    }

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Stop-WithMessage "没有找到 Git。请安装 Git for Windows，并确认命令行中能运行 git。"
    }

    Set-Location -LiteralPath $TargetDir
    $items = @(Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" })
    if ($items.Count -eq 0) {
        Stop-WithMessage "目标目录是空的。脚本不会凭空生成扩展源码；请先把完整扩展文件放入此目录。"
    }

    Write-Step "当前待检查的文件/目录："
    $items | Select-Object Mode, Length, Name | Format-Table -AutoSize | Out-Host

    $manifest = Join-Path $TargetDir "manifest.json"
    $indexJs = Join-Path $TargetDir "index.js"
    if ((Test-Path $manifest) -and (Test-Path $indexJs)) {
        try {
            Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
            Write-Host "[OK] manifest.json 是有效 JSON。" -ForegroundColor Green
        } catch {
            Stop-WithMessage "manifest.json 不是有效 JSON：$($_.Exception.Message)"
        }
    } else {
        Write-Host "[WARN] 根目录未同时发现 manifest.json 和 index.js。" -ForegroundColor Yellow
        Write-Host "如果扩展源码位于子目录，请确认仓库目录结构正确；脚本仍允许继续。" -ForegroundColor Yellow
    }

    $gitDir = Join-Path $TargetDir ".git"
    if (-not (Test-Path $gitDir)) {
        Write-Step "初始化 Git 仓库并连接远程仓库"
        git init
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "git init 失败。" }
        git branch -M main
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "设置 main 分支失败。" }
        git remote add origin $RepoUrl
        if ($LASTEXITCODE -ne 0) {
            # If origin was already created by an unusual Git configuration, correct it below.
            git remote set-url origin $RepoUrl
            if ($LASTEXITCODE -ne 0) { Stop-WithMessage "设置远程仓库失败。" }
        }
    } else {
        Write-Step "发现现有 Git 仓库，检查远程地址"
        $remotes = @(git remote)
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "读取 Git 远程地址失败。" }
        if ($remotes -contains "origin") {
            git remote set-url origin $RepoUrl
        } else {
            git remote add origin $RepoUrl
        }
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "配置 origin 失败。" }
        git branch -M main
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "设置 main 分支失败。" }
    }

    Write-Step "暂存文件"
    git add -A
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage "git add 失败。" }

    $changes = git status --short
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage "读取 Git 状态失败。" }
    if (-not $changes) {
        Write-Host "没有检测到新变更，无需提交。" -ForegroundColor Yellow
        Write-Host "`n检查远程仓库状态……"
        git ls-remote --heads origin main
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "无法访问 GitHub。请检查网络或 GitHub 登录认证。" }
        Write-Host "`n操作结束。" -ForegroundColor Green
        Read-Host "按 Enter 键退出"
        exit 0
    }

    Write-Host "`n以下变更将被提交：" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $confirm = Read-Host "确认提交并推送到 GitHub 的 main 分支？输入 YES 继续"
    if ($confirm -cne "YES") {
        Write-Host "用户取消操作，未提交。" -ForegroundColor Yellow
        Read-Host "按 Enter 键退出"
        exit 0
    }

    $commitMessage = Read-Host "请输入提交说明（直接回车使用默认说明）"
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $commitMessage = "Add Gruvbox ColorControls extension"
    }

    git commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage "git commit 失败。若提示身份未知，请先设置 git config user.name 和 git config user.email。"
    }

    Write-Step "推送到 GitHub main 分支"
    git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage "推送失败。常见原因：GitHub 身份验证失败、网络连接失败，或远程仓库已有未合并提交。请查看上方错误和日志。"
    }

    Write-Host "`n[成功] 文件已推送到 GitHub。" -ForegroundColor Green
    Write-Host "仓库：https://github.com/winxwang/SillyTavern-Gruvbox-ColorControls"
    Write-Host "日志：$LogPath"
    Read-Host "按 Enter 键退出"
}
catch {
    Write-Host "`n[未处理错误] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "日志位置：$LogPath" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
}
finally {
    try { Stop-Transcript | Out-Null } catch {}
}
