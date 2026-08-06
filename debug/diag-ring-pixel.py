"""定位：分析 v18-ring.png 中时段分布环图的圆周颜色分布，找出无颜色缺口"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Desktop\test\guanji-app\screenshots\v18-ring.png'
# ring-wrap 逻辑坐标 (42, 443.4) 112x112，dpr 2.755
X0, Y0 = 42 * 2.755, 443.4 * 2.755
SIZE = 112 * 2.755

im = Image.open(IMG).convert('RGB')
W, H = im.size
print(f'截图尺寸: {W}x{H}')

cx, cy = X0 + SIZE / 2, Y0 + SIZE / 2
# 环带中心半径（SVG R=45/120 * 尺寸），半宽 6/120
R = SIZE * 45 / 120
HALF = SIZE * 6 / 120
print(f'环中心: ({cx:.0f}, {cy:.0f})  半径 {R:.0f}px 半宽 {HALF:.0f}px')

BG = (255, 255, 255)  # 浅色卡片背景
KNOWN = {
    '黄 #FFCC00': (255, 204, 0),
    '橙 #FF9500': (255, 149, 0),
    '绿 #34C759': (52, 199, 89),
    '青 #32ADE6': (50, 173, 230),
    '蓝 #007AFF': (0, 122, 255),
}

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def sample(theta_deg):
    """SVG 坐标：0°=3点方向，顺时针；采样环带内外 5 个点取中值（避开抗锯齿边缘）"""
    pts = []
    for r in (R - HALF * 0.5, R, R + HALF * 0.5):
        x = cx + r * math.cos(math.radians(theta_deg))
        y = cy + r * math.sin(math.radians(theta_deg))
        pts.append(im.getpixel((int(x), int(y))))
    return tuple(sorted(pts)[len(pts) // 2])  # 中值

# 每 2° 采样，判断颜色归属
color_runs = []   # (start_deg, end_deg, color_name)
cur = None
for deg in range(0, 360, 2):
    px = sample(deg)
    if dist(px, BG) < 40:
        name = '背景(缺口)'
    else:
        name = '彩色'
        for n, c in KNOWN.items():
            if dist(px, c) < 90:
                name = n
                break
    if cur and cur[2] == name:
        cur[1] = deg
    else:
        cur = [deg, deg, name]
        color_runs.append(cur)

print('\n=== 环周颜色分布（每 2° 采样） ===')
for s, e, n in color_runs:
    print(f'{s:3d}° → {e:3d}°  ({e - s + 2:3d}°)  {n}')

# 缺口统计
gaps = [(s, e) for s, e, n in color_runs if n == '背景(缺口)']
total_gap = sum(e - s + 2 for s, e in gaps)
print(f'\n=== 缺口统计 ===')
print(f'缺口数量: {len(gaps)}  总缺口角度: {total_gap}°  (占环 {total_gap / 360 * 100:.1f}%)')
for s, e in gaps:
    print(f'  {s}° → {e}° ({(e - s + 2):.0f}°)')
