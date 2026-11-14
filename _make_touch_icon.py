# -*- coding: utf-8 -*-
# 生成 iOS 主屏幕专用图标 apple-touch-icon.png：
#   满版奶油底、不透明、不带圆角（iOS 系统自己裁圆角），
#   栗子小人放大居中，与 App 内头像同款风格。
# 背景：原先 icon-192.png 是透明底+自带圆角，iOS 的 apple-touch-icon
#   规范要求满版不透明 PNG，否则会被黑色补底或退回网页截图。
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'icons')
os.makedirs(OUT, exist_ok=True)

K = 1.25  # 栗子整体放大系数（绕画布中心 256,256）

def v(x):
    return 256 + (x - 256) * K

def draw_touch(size):
    img = Image.new('RGB', (size, size), (255, 249, 240))  # 满版奶油底 #FFF9F0，无 alpha 通道
    d = ImageDraw.Draw(img)
    s = size / 512.0
    # 栗子身体（渐变感用两层椭圆模拟）
    d.ellipse([v(136) * s, v(170) * s, v(376) * s, v(428) * s], fill=(94, 58, 32))
    d.ellipse([v(146) * s, v(180) * s, v(366) * s, v(418) * s], fill=(139, 90, 43))
    d.ellipse([v(170) * s, v(200) * s, v(300) * s, v(390) * s], fill=(160, 108, 55))
    # 栗子帽（顶部深色盖 + 叶柄）
    d.pieslice([v(136) * s, v(132) * s, v(376) * s, v(300) * s], 180, 360, fill=(62, 37, 18))
    d.ellipse([v(136) * s, v(232) * s, v(376) * s, v(268) * s], fill=(62, 37, 18))
    d.rounded_rectangle([v(244) * s, v(96) * s, v(268) * s, v(156) * s], radius=10 * s, fill=(74, 46, 24))
    # 眼睛（高光）
    d.ellipse([v(196) * s, v(272) * s, v(232) * s, v(316) * s], fill=(26, 15, 8))
    d.ellipse([v(280) * s, v(272) * s, v(316) * s, v(316) * s], fill=(26, 15, 8))
    d.ellipse([v(203) * s, v(279) * s, v(216) * s, v(292) * s], fill=(255, 255, 255))
    d.ellipse([v(287) * s, v(279) * s, v(300) * s, v(292) * s], fill=(255, 255, 255))
    # 腮红
    d.ellipse([v(168) * s, v(318) * s, v(214) * s, v(348) * s], fill=(255, 154, 136))
    d.ellipse([v(298) * s, v(318) * s, v(344) * s, v(348) * s], fill=(255, 154, 136))
    # 微笑
    d.arc([v(216) * s, v(320) * s, v(296) * s, v(376) * s], 20, 160, fill=(26, 15, 8), width=max(2, int(10 * s)))
    return img

touch = draw_touch(180)
touch.save(os.path.join(OUT, 'apple-touch-icon.png'))
print('icons/apple-touch-icon.png generated: 180x180 RGB (full-bleed opaque)')
