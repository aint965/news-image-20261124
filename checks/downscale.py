#!/usr/bin/env python3
"""Downscale entry.png to a ~300px thumbnail for the readability check."""
import sys
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else "checks/r1/entry.png"
dst = sys.argv[2] if len(sys.argv) > 2 else "checks/thumb-300.png"
img = Image.open(src)
img.resize((300, 300), Image.LANCZOS).save(dst)
print(f"wrote {dst} from {src} ({img.size[0]}x{img.size[1]} -> 300x300)")
