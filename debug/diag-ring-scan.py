"""全图扫描：定位多彩环（找黄/橙/绿/青/蓝弧像素簇）"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Desktop\test\guanji-app\screenshots\cdp-full.png'
im = Image.open(IMG).convert('RGB')
W, H = im.size
print(f'尺寸: {W}x{H}')

TARGETS = {
    '黄#FFCC00': (255, 204, 0), '橙#FF9500': (255, 149, 0),
    '绿#34C759': (52, 199, 89), '青#32ADE6': (50, 173, 230),
    '蓝#007AFF': (0, 122, 255),
}

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

# 步长 4 扫描全图，统计每种目标色像素的坐标
found = {k: [] for k in TARGETS}
for y in range(0, H, 4):
    for x in range(0, W, 4):
        px = im.getpixel((x, y))
        for name, c in TARGETS.items():
            if dist(px, c) < 60:
                found[name].append((x, y))
                break

for name, pts in found.items():
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        print(f'{name}: {len(pts)} 点, x[{min(xs)}-{max(xs)}] y[{min(ys)}-{max(ys)}], 质心=({sum(xs)//len(pts)}, {sum(ys)//len(pts)})')
    else:
        print(f'{name}: 未找到')
