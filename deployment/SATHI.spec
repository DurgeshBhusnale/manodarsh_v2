# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for SATHI launcher

block_cipher = None

a = Analysis(
    ['sathi_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('assets/sathi_logo.png', 'assets'),
    ],
    hiddenimports=['pystray', 'PIL', 'psutil', 'requests'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SATHI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window for cleaner UX
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/sathi_logo.png',
)
