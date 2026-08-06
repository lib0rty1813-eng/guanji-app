"""CDP 同步截图分析（修正分类阈值：青先于蓝判定 + sample 修复）"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Desktop\test\guanji-app\screenshots\cdp-full.png'
# rect（同一脚本内读取，scrollTop=165.45 时刻）
RX, RY, RW, RH = 42, 584.8636474609375, 112, 112

im = Image.open(IMG).convert('RGB')
W, H = im.size
scale = W / 392.0
print(f'截图尺寸: {W}x{H} (scale={scale:.3f})')

cx, cy = (RX + RW / 2) * scale, (RY + RH / 2) * scale
R = RW * 45 / 120 * scale
HALF = RW * 6 / 120 * scale
print(f'环中心: ({cx:.0f}, {cy:.0f}) 半径 {R:.0f}px')

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def sample(deg):
    best = None
    for k in range(-3, 4):
        r = R + HALF * (k / 3.5)
        x = cx + r * math.cos(math.radians(deg))
        y = cy + r * math.sin(math.radians(deg))
        px = im.getpixel((int(x), int(y)))
        if best is None or dist(px, (255, 255, 255)) > dist(best, (255, 255, 255)):
            best = px
    return best

KNOWN = {
    '青': (50, 173, 230),     # 先判青（与蓝距离近）
    '蓝': (0, 122, 255),
    '绿': (52, 199, 89),
    '黄': (255, 204, 0),
    '橙': (255, 149, 0),
}

def classify(px):
    if dist(px, (255, 255, 255)) < 15:
        return '.'
    best_n, best_d = '?', 1e9
    for n, c in KNOWN.items():
        d = dist(px, c)
        if d < best_d:
            best_n, best_d = n, d
    return best_n if best_d < 45 else f'{px}'

line = ''
for deg in range(0, 360, 10):
    line += classify(sample(deg))
    if deg % 90 == 80:
        line += '|'
print('360°采样(10°/格):', line)

print('\n位置标注:')
for deg in range(0, 360, 15):
    px = sample(deg)
    print(f'{deg:3d}°: {px}  {classify(px)}')

print('\n理论: 绿 270-305° | 青 310-35° | 蓝 40-260° | gap 35-40/260-270/305-310')
