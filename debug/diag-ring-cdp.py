"""分析 CDP 截图（与 DOM 坐标一致）：环周颜色分布"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Desktop\test\guanji-app\screenshots\cdp-full.png'
RX, RY, RW, RH = 42, 584.8636474609375, 112, 112   # rect（CSS px）

im = Image.open(IMG).convert('RGB')
W, H = im.size
scale = W / 392.0   # 视口宽 392 CSS px
print(f'CDP 截图尺寸: {W}x{H}  (scale={scale:.3f})')

cx, cy = (RX + RW / 2) * scale, (RY + RH / 2) * scale
R = RW * 45 / 120 * scale
HALF = RW * 6 / 120 * scale
print(f'环中心: ({cx:.0f}, {cy:.0f})  半径 {R:.0f}px')

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def sample(deg):
    best = None
    for k in range(-3, 4):
        r = R + HALF * (k / 3.5)
        x = cx + r * math.cos(math.radians(deg))
        y = cy + r * math.sin(math.radians(deg))
        px = im.getpixel((int(x), int(y)))
        if best is None or dist(px, best[1]) > dist(px, (255, 255, 255)):
            best = (px,)
    return best[0]

# 背景估计：环内中心空白
bg_sample = im.getpixel((int(cx - R * 0.4), int(cy - R * 0.4)))
print(f'环内背景样本: {bg_sample}')

KNOWN = {
    '黄#FFCC00': (255, 204, 0), '橙#FF9500': (255, 149, 0),
    '绿#34C759': (52, 199, 89), '青#32ADE6': (50, 173, 230),
    '蓝#007AFF': (0, 122, 255),
    '深黄#FFD60A': (255, 214, 10), '深橙#FF9F0A': (255, 159, 10),
    '深绿#30D158': (48, 209, 88), '深青#64D2FF': (100, 210, 255),
    '深蓝#0A84FF': (10, 132, 255),
}

def classify(px):
    if dist(px, bg_sample) < 30:
        return '背景'
    best_n, best_d = '彩色', 1e9
    for n, c in KNOWN.items():
        d = dist(px, c)
        if d < best_d:
            best_n, best_d = n, d
    return best_n if best_d < 90 else f'其他{px}'

runs = []
cur = None
for deg in range(0, 360, 2):
    name = classify(sample(deg))
    if cur and cur[2] == name:
        cur[1] = deg
    else:
        cur = [deg, deg, name]
        runs.append(cur)

print('\n=== 环周颜色分布 ===')
for s, e, n in runs:
    print(f'{s:3d}° → {e:3d}°  ({e - s + 2:3d}°)  {n}')

gaps = [(s, e) for s, e, n in runs if n == '背景']
total = sum(e - s + 2 for s, e in gaps)
print(f'\n缺口: {len(gaps)} 个, 共 {total}° ({total / 360 * 100:.1f}%)')
for s, e in gaps:
    print(f'  {s}° → {e}° ({(e - s + 2):.0f}°)')
