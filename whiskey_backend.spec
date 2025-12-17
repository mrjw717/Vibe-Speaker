
from PyInstaller.utils.hooks import collect_all

datas = []
binaries = []
hiddenimports = ['pyaudio', 'pyaudio._portaudio']
tmp_ret = collect_all('pyaudio')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]

a = Analysis(
    ['python/main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas + [('python/transcriber.py', '.'), ('python/audio_stream.py', '.')],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='whiskey_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
