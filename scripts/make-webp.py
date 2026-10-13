#!/usr/bin/env python3
"""Make fast WebP copies of the packaging photos.

For every backend/frontend/public/packaging/*.jpg this writes NAME-400.webp,
NAME-800.webp and NAME-1200.webp (the site loads these via src/utils/img.js)
and shrinks the original JPG to at most 1400 px wide.

Run after adding or replacing a packaging photo:
    pip install pillow && python3 scripts/make-webp.py
"""
import glob, os
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), '..', 'backend', 'frontend', 'public', 'packaging')
for f in sorted(glob.glob(os.path.join(DIR, '*.jpg'))):
    im = Image.open(f).convert('RGB')
    base = f[:-4]
    for w in (400, 800, 1200):
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if im.width > w else im
        r.save(f'{base}-{w}.webp', 'WEBP', quality=80, method=6)
    if im.width > 1400:
        im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS).save(
            f, 'JPEG', quality=82, optimize=True, progressive=True)
    print('ok', os.path.basename(f))
