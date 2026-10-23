# 栗子公告 APK 工具链下载脚本（JDK17 + Android build-tools + platform）
# 输出目录：%USERPROFILE%\.lizitools\toolchain（纯 ASCII 路径，避免 aapt2/javac 中文路径问题）
$ErrorActionPreference = 'Continue'
$T = Join-Path $env:USERPROFILE '.lizitools\toolchain'
New-Item -ItemType Directory -Force -Path $T | Out-Null
$log = Join-Path $T 'dl.log'
function Log([string]$m) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m) }
function Dl([string]$url, [string]$out) {
    Log ("GET " + $url)
    & curl.exe -sSL --retry 3 --retry-delay 2 --connect-timeout 20 -o $out $url 2>>$log
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $out)) { Log ("FAIL " + $out); if (Test-Path $out) { Remove-Item $out -Force }; return $false }
    Log ("OK " + (Split-Path $out -Leaf) + " " + [math]::Round((Get-Item $out).Length / 1MB, 1) + "MB")
    return $true
}

Log '=== toolchain download start ==='

# 1. 仓库索引，选 platform 与 build-tools 的 zip 文件名
$plat = $null; $bt = $null
if (Dl 'https://dl.google.com/android/repository/repository2-3.xml' (Join-Path $T 'repo.xml')) {
    $xml = Get-Content (Join-Path $T 'repo.xml') -Raw
    $plats = [regex]::Matches($xml, 'platform-(3[0-9])(-ext[0-9]+)?_r[0-9]+\.zip') |
        ForEach-Object { $_.Value } | Sort-Object -Unique
    $plat = $plats | Sort-Object { [int](($_ -replace '^platform-3', '3') -replace '(-ext[0-9]+)?_r[0-9]+\.zip$', '') } -Descending |
        Where-Object { [int](($_ -replace '^platform-', '').Split('-')[0]) -le 36 } | Select-Object -First 1
    $bts = [regex]::Matches($xml, 'build-tools_r([0-9.]+)-windows\.zip') | ForEach-Object { $_.Value } | Sort-Object -Unique
    $bt = $bts | Sort-Object { [version]($_ -replace '^build-tools_r', '' -replace '-windows\.zip$', '') } -Descending | Select-Object -First 1
}
if (-not $plat) { $plat = 'platform-34-ext7_r03.zip' }
if (-not $bt)   { $bt   = 'build-tools_r34-windows.zip' }
Log ("picked platform=" + $plat + " buildtools=" + $bt)

# 2. 下载三件套
$platOk = Dl ("https://dl.google.com/android/repository/" + $plat) (Join-Path $T $plat)
$btOk   = Dl ("https://dl.google.com/android/repository/" + $bt)   (Join-Path $T $bt)
$jdkOk  = Dl 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk' (Join-Path $T 'jdk17.zip')
if (-not $jdkOk) {
    Log 'adoptium api failed, try tsinghua mirror'
    $html = (& curl.exe -s --max-time 30 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/windows/') -join "`n"
    $name = ([regex]::Matches($html, 'OpenJDK17U-jdk_x64_windows_hotspot_[0-9._]+\.zip') | Select-Object -Last 1).Value
    if ($name) { $jdkOk = Dl ('https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/windows/' + $name) (Join-Path $T 'jdk17.zip') }
    else { Log 'tsinghua listing parse failed' }
}

# 3. 解压（tar.exe 支持 zip）
if ($jdkOk) { Log 'extract jdk'; & tar.exe -xf (Join-Path $T 'jdk17.zip') -C $T 2>>$log; Log ("jdk extract exit=" + $LASTEXITCODE) }
if ($btOk)  { Log 'extract build-tools'; & tar.exe -xf (Join-Path $T $bt) -C $T 2>>$log; Log ("bt extract exit=" + $LASTEXITCODE) }
if ($platOk){ Log 'extract platform'; & tar.exe -xf (Join-Path $T $plat) -C $T 2>>$log; Log ("plat extract exit=" + $LASTEXITCODE) }

# 4. 关键文件自检
$aapt2 = Get-ChildItem $T -Recurse -Filter 'aapt2.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$ajar  = Get-ChildItem $T -Recurse -Filter 'android.jar' -ErrorAction SilentlyContinue | Select-Object -First 1
$d8    = Get-ChildItem $T -Recurse -Filter 'd8.jar' -ErrorAction SilentlyContinue | Select-Object -First 1
$zalign= Get-ChildItem $T -Recurse -Filter 'zipalign.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$asign = Get-ChildItem $T -Recurse -Filter 'apksigner.jar' -ErrorAction SilentlyContinue | Select-Object -First 1
$jdkDir = Get-ChildItem $T -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1
Log ("check aapt2=" + [bool]$aapt2 + " android.jar=" + [bool]$ajar + " d8=" + [bool]$d8 + " zipalign=" + [bool]$zalign + " apksigner=" + [bool]$asign + " jdk=" + [bool]$jdkDir)
Log 'ALL DONE'
