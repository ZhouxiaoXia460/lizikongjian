# -*- coding: utf-8 -*-
"""栗子空间 WebView APK 构建脚本（参数化，可构建公告/题库等多个设置器）
用法示例：
  python build_apk.py --pkg com.lizikongjian.truthbank --label 栗子题库 \
      --url https://kongjian-d9gplvfce4e66ddb4-1455016831.tcloudbaseapp.com/truth-admin.html \
      --out 栗子题库设置.apk --icon-text 题库 --work truthbank
"""
import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--pkg', default='com.lizikongjian.noticeadmin')
ap.add_argument('--label', default='栗子公告')
ap.add_argument('--url', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--icon-text', default='公告')
ap.add_argument('--work', default='noticeadmin')
ap.add_argument('--version-code', default='1')
ap.add_argument('--version-name', default='1.0')
ap.add_argument('--min-sdk', default='24')
ap.add_argument('--target-sdk', default='33')
args = ap.parse_args()

T = Path(os.environ['USERPROFILE']) / '.lizitools'
TC = T / 'toolchain'
B = T / 'apkbuild' / args.work
WS = Path(r'C:\Users\admin\Desktop\VS\HTML\栗子空间')
OUT_APK = WS / args.out
KS = T / 'apkbuild' / 'lizi-notice.keystore'
KS_PASS = 'lizi-notice-2026'

jdk = next((d for d in TC.glob('jdk-17*') if d.is_dir()), None)
aapt2 = next((p for p in TC.rglob('aapt2.exe') if 'disabled' not in str(p)), None)
ajar = next((p for p in TC.rglob('android.jar') if 'disabled' not in str(p)), None)
d8jar = next((p for p in TC.rglob('d8.jar') if 'disabled' not in str(p)), None)
zipalign = next((p for p in TC.rglob('zipalign.exe') if 'disabled' not in str(p)), None)
asignjar = next((p for p in TC.rglob('apksigner.jar') if 'disabled' not in str(p)), None)
missing = [n for n, v in [('jdk', jdk), ('aapt2', aapt2), ('android.jar', ajar), ('d8.jar', d8jar), ('zipalign', zipalign), ('apksigner.jar', asignjar)] if not v]
if missing:
    sys.exit('toolchain missing: ' + ', '.join(missing))
print('toolchain ok | pkg:', args.pkg, '| label:', args.label)

env = os.environ.copy()
env['JAVA_HOME'] = str(jdk)
env['PATH'] = str(jdk / 'bin') + os.pathsep + env['PATH']
java = str(jdk / 'bin' / 'java.exe')
javac = str(jdk / 'bin' / 'javac.exe')
keytool = str(jdk / 'bin' / 'keytool.exe')


def run(cmd):
    print('+', ' '.join(os.path.basename(str(c)) if i == 0 else str(c) for i, c in enumerate(cmd)))
    r = subprocess.run([str(c) for c in cmd], env=env, capture_output=True)
    out = (r.stdout or b'').decode('utf-8', 'replace')
    err = (r.stderr or b'').decode('gbk', 'replace')
    if out.strip():
        print(out.strip()[-1200:])
    if err.strip():
        print(err.strip()[-1200:])
    if r.returncode != 0:
        sys.exit('FAILED: ' + ' '.join(str(c) for c in cmd))


JAVA_TEMPLATE = '''package %PKG%;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String ADMIN_URL = "%URL%";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(0xFFF7EDE1);
        setContentView(webView);
        if (savedInstanceState == null) {
            webView.loadUrl(ADMIN_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
'''

MANIFEST_TEMPLATE = '''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="%PKG%">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.Material.Light.NoActionBar"
        android:allowBackup="false"
        android:usesCleartextTraffic="false">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|smallestScreenSize"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
'''

# ---------- 源码与资源 ----------
pkg_path = args.pkg.replace('.', '/')
SRC = B / 'src' / pkg_path
RES = B / 'res'
if B.exists():
    shutil.rmtree(B)
SRC.mkdir(parents=True, exist_ok=True)
(RES / 'values').mkdir(parents=True, exist_ok=True)
(RES / 'mipmap-xxhdpi').mkdir(parents=True, exist_ok=True)

(SRC / 'MainActivity.java').write_text(JAVA_TEMPLATE.replace('%PKG%', args.pkg).replace('%URL%', args.url), encoding='utf-8')
(B / 'AndroidManifest.xml').write_text(MANIFEST_TEMPLATE.replace('%PKG%', args.pkg), encoding='utf-8')
(RES / 'values' / 'strings.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">' + args.label + '</string>\n</resources>\n',
    encoding='utf-8')

icon = RES / 'mipmap-xxhdpi' / 'ic_launcher.png'
from PIL import Image, ImageDraw, ImageFont
S = 4
W = 192 * S
img = Image.new('RGB', (W, W))
d = ImageDraw.Draw(img)
for y in range(W):
    t = y / W
    d.line([(0, y), (W, y)], fill=(int(0xa9 + (0x7a - 0xa9) * t), int(0x71 + (0x4a - 0x71) * t), int(0x3f + (0x1f - 0x3f) * t)))
mask = Image.new('L', (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=255)
img.putalpha(mask)
font = None
for fp in (r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf'):
    try:
        font = ImageFont.truetype(fp, int(W * 0.34))
        break
    except OSError:
        continue
if font:
    tb = d.textbbox((0, 0), args.icon_text, font=font)
    d.text(((W - (tb[2] - tb[0])) / 2 - tb[0], (W - (tb[3] - tb[1])) / 2 - tb[1] - W * 0.02), args.icon_text, font=font, fill=(255, 255, 255, 255))
img = img.resize((192, 192), Image.LANCZOS)
img.save(icon)
print('resources ready')

# ---------- 编译 ----------
run([javac, '-source', '8', '-target', '8', '-encoding', 'UTF-8', '-classpath', ajar, '-d', B / 'classes', SRC / 'MainActivity.java'])
class_files = sorted((B / 'classes').rglob('*.class'))
(B / 'dex').mkdir(parents=True, exist_ok=True)
run([java, '-cp', d8jar, 'com.android.tools.r8.D8', '--release', '--lib', ajar, '--min-api', args.min_sdk, '--output', B / 'dex'] + class_files)
assert (B / 'dex' / 'classes.dex').exists(), 'd8 produced no classes.dex'

run([aapt2, 'compile', '--dir', RES, '-o', B / 'res.zip'])
run([aapt2, 'link', '-o', B / 'base.apk', '-I', ajar, '--manifest', B / 'AndroidManifest.xml',
     '--min-sdk-version', args.min_sdk, '--target-sdk-version', args.target_sdk,
     '--version-code', args.version_code, '--version-name', args.version_name, B / 'res.zip'])

unsigned = B / 'unsigned.apk'
with zipfile.ZipFile(B / 'base.apk') as zin, zipfile.ZipFile(unsigned, 'w') as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        comp = zipfile.ZIP_STORED if item.filename == 'resources.arsc' else zipfile.ZIP_DEFLATED
        zout.writestr(zipfile.ZipInfo(item.filename, date_time=item.date_time), data, compress_type=comp)
    zout.writestr('classes.dex', (B / 'dex' / 'classes.dex').read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
print('unsigned apk:', round(unsigned.stat().st_size / 1024, 1), 'KB')

run([zipalign, '-f', '4', unsigned, B / 'aligned.apk'])
if not KS.exists():
    run([keytool, '-genkeypair', '-keystore', KS, '-storetype', 'PKCS12', '-storepass', KS_PASS, '-keypass', KS_PASS,
         '-alias', 'lizinotice', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10950',
         '-dname', 'CN=Lizi Notice,O=Lizikongjian,C=CN'])
run([java, '-cp', asignjar, 'com.android.apksigner.ApkSignerTool', 'sign',
     '--ks', KS, '--ks-key-alias', 'lizinotice', '--ks-pass', 'pass:' + KS_PASS, '--key-pass', 'pass:' + KS_PASS,
     '--out', B / 'signed.apk', B / 'aligned.apk'])
run([java, '-cp', asignjar, 'com.android.apksigner.ApkSignerTool', 'verify', '--print-certs', B / 'signed.apk'])

shutil.copy(B / 'signed.apk', OUT_APK)
print('APK DONE:', OUT_APK, round(OUT_APK.stat().st_size / 1024, 1), 'KB')
