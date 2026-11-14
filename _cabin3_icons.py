# -*- coding: utf-8 -*-
# 生成栗子空间 PWA 图标：奶油底圆角方块 + 手绘栗子小人（与 App 头像同款风格）
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'icons')
os.makedirs(OUT, exist_ok=True)

def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 512.0
    # 奶油底 + 圆角
    d.rounded_rectangle([12 * s, 12 * s, (512 - 12) * s, (512 - 12) * s], radius=112 * s,
                        fill=(255, 249, 240, 255), outline=(245, 222, 194, 255), width=max(2, int(10 * s)))
    # 栗子身体（渐变感用两层椭圆模拟）
    d.ellipse([136 * s, 170 * s, 376 * s, 428 * s], fill=(94, 58, 32, 255))          # 深棕外圈
    d.ellipse([146 * s, 180 * s, 366 * s, 418 * s], fill=(139, 90, 43, 255))         # 棕色主体
    d.ellipse([170 * s, 200 * s, 300 * s, 390 * s], fill=(160, 108, 55, 255))        # 左侧高光带
    # 栗子帽（顶部深色盖 + 叶柄）
    d.pieslice([136 * s, 132 * s, 376 * s, 300 * s], 180, 360, fill=(62, 37, 18, 255))
    d.ellipse([136 * s, 232 * s, 376 * s, 268 * s], fill=(62, 37, 18, 255))
    d.rounded_rectangle([244 * s, 96 * s, 268 * s, 156 * s], radius=10 * s, fill=(74, 46, 24, 255))
    # 眼睛（高光）
    d.ellipse([196 * s, 272 * s, 232 * s, 316 * s], fill=(26, 15, 8, 255))
    d.ellipse([280 * s, 272 * s, 316 * s, 316 * s], fill=(26, 15, 8, 255))
    d.ellipse([203 * s, 279 * s, 216 * s, 292 * s], fill=(255, 255, 255, 235))
    d.ellipse([287 * s, 279 * s, 300 * s, 292 * s], fill=(255, 255, 255, 235))
    # 腮红
    d.ellipse([168 * s, 318 * s, 214 * s, 348 * s], fill=(255, 154, 136, 110))
    d.ellipse([298 * s, 318 * s, 344 * s, 348 * s], fill=(255, 154, 136, 110))
    # 微笑
    d.arc([216 * s, 320 * s, 296 * s, 376 * s], 20, 160, fill=(26, 15, 8, 255), width=max(2, int(10 * s)))
    return img

big = draw_icon(512)
big.save(os.path.join(OUT, 'icon-512.png'))
big.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'))
print('icons generated ✓')
