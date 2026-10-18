"""Builds the self-hosted fonts (never Google Fonts at runtime): TTF for the app in
packages/ui/assets/fonts, WOFF2 for the family page in apps/family/public/fonts, and
variable WOFF2 for the landing page in apps/landing/public/fonts.

React Native can't use variable font axes, so every weight we use becomes a static font:
Fraunces with SOFT 100 and WONK 1 baked in, and an optical size close to where it is used.
The landing page is plain HTML, so it keeps the weight and optical-size axes (big headlines
look right at every size) with SOFT and WONK pinned, which keeps the files small.
Everything is subset to Latin (with Latin Extended-A for names).

Run once when fonts change (needs Python 3 with `fonttools` and `brotli`):
    python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
    /tmp/fontenv/bin/python scripts/build-fonts.py
"""

import os
import shutil
import tempfile
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "packages", "ui", "assets", "fonts")
WEB = os.path.join(ROOT, "apps", "family", "public", "fonts")
LANDING = os.path.join(ROOT, "apps", "landing", "public", "fonts")
SOURCE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"

FILES = {
    "fraunces": ["Fraunces[SOFT,WONK,opsz,wght].ttf", "Fraunces-Italic[SOFT,WONK,opsz,wght].ttf", "OFL.txt"],
    "nunito": ["Nunito[wght].ttf", "OFL.txt"],
    "shantellsans": ["ShantellSans[BNCE,INFM,SPAC,wght].ttf", "OFL.txt"],
    "bagelfatone": ["BagelFatOne-Regular.ttf", "OFL.txt"],
}

# Output name -> (source file, axis values). Names match `fontFamily` in packages/ui/src/fonts.ts.
STATIC = {
    # Titles: 18 to 22px (title-s, title-m) and 30 to 36px (title-l, display).
    "Fraunces-Bold": ("fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf", {"wght": 700, "opsz": 20, "SOFT": 100, "WONK": 1}),
    "Fraunces-ExtraBold": ("fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf", {"wght": 800, "opsz": 32, "SOFT": 100, "WONK": 1}),
    "Fraunces-ExtraBoldItalic": ("fraunces/Fraunces-Italic[SOFT,WONK,opsz,wght].ttf", {"wght": 800, "opsz": 36, "SOFT": 100, "WONK": 1}),
    "Nunito-Regular": ("nunito/Nunito[wght].ttf", {"wght": 400}),
    "Nunito-Bold": ("nunito/Nunito[wght].ttf", {"wght": 700}),
    "Nunito-ExtraBold": ("nunito/Nunito[wght].ttf", {"wght": 800}),
    "ShantellSans-Medium": ("shantellsans/ShantellSans[BNCE,INFM,SPAC,wght].ttf", {"wght": 500, "INFM": 0, "BNCE": 0, "SPAC": 0}),
    "ShantellSans-Bold": ("shantellsans/ShantellSans[BNCE,INFM,SPAC,wght].ttf", {"wght": 700, "INFM": 0, "BNCE": 0, "SPAC": 0}),
    "BagelFatOne-Regular": ("bagelfatone/BagelFatOne-Regular.ttf", None),
}

# Landing page: output name -> (source file, axis limits). Names match @font-face in apps/landing.
VARIABLE = {
    "Fraunces": ("fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf", {"SOFT": 100, "WONK": 1, "wght": (600, 900), "opsz": (16, 144)}),
    "Fraunces-Italic": ("fraunces/Fraunces-Italic[SOFT,WONK,opsz,wght].ttf", {"SOFT": 100, "WONK": 1, "wght": (600, 900), "opsz": (16, 144)}),
    "Nunito": ("nunito/Nunito[wght].ttf", {"wght": (400, 800)}),
    "ShantellSans": ("shantellsans/ShantellSans[BNCE,INFM,SPAC,wght].ttf", {"wght": (500, 700), "INFM": 0, "BNCE": 0, "SPAC": 0}),
    "BagelFatOne": ("bagelfatone/BagelFatOne-Regular.ttf", None),
}

# Google's "latin" range plus Latin Extended-A, so names like "Zoë", "Łukasz" or "Çelik" render.
UNICODES = (
    "U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
)


def download(tmp):
    for family, names in FILES.items():
        os.makedirs(os.path.join(tmp, family), exist_ok=True)
        for name in names:
            url = SOURCE + family + "/" + urllib.parse.quote(name)
            urllib.request.urlretrieve(url, os.path.join(tmp, family, name))


def write_subset(source_path, flavor, path):
    options = subset.Options()
    options.flavor = flavor
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    out = TTFont(source_path)
    sub.subset(out)
    out.flavor = flavor
    out.save(path)


def build(tmp):
    for folder in (OUT, WEB, LANDING):
        os.makedirs(folder, exist_ok=True)
    for name, (source, axes) in STATIC.items():
        font = TTFont(os.path.join(tmp, source))
        if axes:
            font = instancer.instantiateVariableFont(font, axes, static=True)
        static_path = os.path.join(tmp, name + ".static.ttf")
        font.save(static_path)
        write_subset(static_path, None, os.path.join(OUT, f"{name}.ttf"))
        write_subset(static_path, "woff2", os.path.join(WEB, f"{name}.woff2"))
    for name, (source, axes) in VARIABLE.items():
        font = TTFont(os.path.join(tmp, source))
        if axes:
            font = instancer.instantiateVariableFont(font, axes)
        limited_path = os.path.join(tmp, name + ".landing.ttf")
        font.save(limited_path)
        write_subset(limited_path, "woff2", os.path.join(LANDING, f"{name}.woff2"))
    for family in FILES:
        for folder in (OUT, WEB, LANDING):
            shutil.copy(os.path.join(tmp, family, "OFL.txt"), os.path.join(folder, f"OFL-{family}.txt"))


if __name__ == "__main__":
    import urllib.parse  # noqa: F401  (used in download)

    with tempfile.TemporaryDirectory() as tmp:
        download(tmp)
        build(tmp)
    for folder in (OUT, WEB, LANDING):
        for name in sorted(os.listdir(folder)):
            print(f"{os.path.getsize(os.path.join(folder, name)) // 1024:5d} KB  {os.path.relpath(folder, ROOT)}/{name}")
