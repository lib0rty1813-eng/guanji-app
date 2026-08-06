"""定位 v2：径向采样 + 动态背景检测，分析环周颜色分布（浅色模式）"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Desktop\test\guanji-app\screenshots\diag-now.png'
# 用刚获取的坐标（若滚动已回顶部，坐标一致）
X0, Y0 = 42 * 2.755, 443.4 * 2.755
SIZE = 112 * 2.755

im = Image.open(IMG).convert('RGB')
W, H = im.size
print(f'截图尺寸: {W}x{H}')

cx, cy = X0 + SIZE / 2, Y0 + SIZE / 2
R = SIZE * 45 / 120
HALF = SIZE * 6 / 120

# 动态背景：采样环带内侧空白区域（圆心附近偏左上）估计卡片背景
bg_sample = im.getpixel((int(cx - R * 0.5), int(cy - R * 0.5)))
print(f'估计卡片背景: {bg_sample}')

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def sample(deg):
    """径向 7 点采样，取与背景距离最大的点（最接近弧中心色）"""
    best = None
    for k in range(-3, 4):
        r = R + HALF * (k / 3.5)
        x = cx + r * math.cos(math.radians(deg))
        y = cy + r * math.sin(math.radians(deg))
        px = im.getpixel((int(x), int(y)))
        if best is None or dist(px, bg_sample) > dist(best, bg_sample):
            best = px
    return best

KNOWN = {
    '黄': (255, 212, 10), '橙': (255, 159, 10), '绿': (48, 209, 88),
    '青': (100, 210, 255), '蓝': (10, 132, 255),
    '浅黄': (255, 204, 0), '浅橙': (255, 149, 0), '浅绿': (52, 199, 89),
    '浅青': (50, 173, 230), '浅蓝': (0, 122, 255),
}

def classify(px):
    if dist(px, bg_sample) < 35:
        return '背景'
    best_n, best_d = '彩色', 1e9
    for n, c in KNOWN.items():
        d = dist(px, c)
        if d < best_d:
            best_n, best_d = n, d
    return best_n if best_d < 100 else f'其他({px})'

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
print(f'\n=== 缺口统计 ===')
print(f'缺口数量: {len(gaps)}  总缺口: {total}° ({total / 360 * 100:.1f}%)')
for s, e in gaps:
    print(f'  {s}° → {e}° ({(e - s + 2):.0f}°)')
