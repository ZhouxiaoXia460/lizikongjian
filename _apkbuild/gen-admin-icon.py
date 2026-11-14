# -*- coding: utf-8 -*-
"""生成 iOS apple-touch-icon：180x180 满幅无透明（iOS 自己裁圆角，透明会变黑角）"""
from PIL import Image, ImageDraw, ImageFont

W = 540
img = Image.new('RGB', (W, W))
d = ImageDraw.Draw(img)
for y in range(W):
    t = y / W
    d.line([(0, y), (W, y)], fill=(int(0xa9 + (0x7a - 0xa9) * t), int(0x71 + (0x4a - 0x71) * t), int(0x3f + (0x1f - 0x3f) * t)))
font = None
for fp in (r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf'):
    try:
        font = ImageFont.truetype(fp, int(W * 0.34))
        break
    except OSError:
        continue
tb = d.textbbox((0, 0), '公告', font=font)
d.text(((W - (tb[2] - tb[0])) / 2 - tb[0], (W - (tb[3] - tb[1])) / 2 - tb[1] - W * 0.02), '公告', font=font, fill=(255, 255, 255))
img = img.resize((180, 180), Image.LANCZOS)
img.save('admin-icon.png')
print('admin-icon.png ok')
