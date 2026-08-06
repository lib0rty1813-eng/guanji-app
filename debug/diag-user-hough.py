"""分析用户附件：定位环（Hough 拟合）并采样环周颜色"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Documents\xwechat_files\wxid_sbijyex91itn22_b7cf\temp\InputTemp\a59ac7e4-5702-4075-b3eb-35b7e7fc0376.png'
im = Image.open(IMG).convert('RGB')
W, H = im.size
print(f'尺寸: {W}x{H}')

# 旧版环色
OLD = {
    '清晨#C6E2FF': (198, 226, 255), '上午#9CCBFF': (156, 203, 255),
    '下午#6FB2FF': (111, 178, 255), '傍晚#3F96FF': (63, 150, 255),
    '深夜#007AFF': (0, 122, 255),
}

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def is_ring_color(px):
    return any(dist(px, c) < 70 for c in OLD.values())

# 找所有环色像素
pts = [(x, y) for y in range(0, H, 2) for x in range(0, W, 2) if is_ring_color(im.getpixel((x, y)))]
print(f'环色像素: {len(pts)}')
if not pts:
    print('未找到环色')
    exit()

# 按 y 聚类找环带
ys = sorted(set(p[1] for p in pts))
# 简单：输出 y 直方图（每 10px 一行）
hist = {}
for p in pts:
    hist.setdefault(p[1] // 10, []).append(p)
print('\n环色像素 y 分布:')
for k in sorted(hist):
    xs = [p[0] for p in hist[k]]
    print(f'  y{k*10}-{k*10+9}: {len(hist[k])} 点, x[{min(xs)}-{max(xs)}]')

# 假设环带在 y 密集区：取点数最多的 3 个 10px 桶
top = sorted(hist.items(), key=lambda kv: -len(kv[1]))[:3]
if not top:
    exit()
y_lo = min(k * 10 for k, _ in top)
y_hi = max(k * 10 + 9 for k, _ in top)
band = [p for p in pts if y_lo <= p[1] <= y_hi]
xs = [p[0] for p in band]
print(f'\n环带估计: y[{y_lo}-{y_hi}], x[{min(xs)}-{max(xs)}]')

# Hough：扫描候选圆心（带内），评分 = 圆周上彩色点比例
best = None
for cy in range(y_lo, y_hi + 1, 3):
    for cx in range(min(xs), max(xs) + 1, 3):
        for r in range(50, 90, 4):
            hit = miss = 0
            for deg in range(0, 360, 10):
                x = int(cx + r * math.cos(math.radians(deg)))
                y = int(cy + r * math.sin(math.radians(deg)))
                if 0 <= x < W and 0 <= y < H:
                    if is_ring_color(im.getpixel((x, y))):
                        hit += 1
                    else:
                        miss += 1
            score = hit / (hit + miss + 1)
            if best is None or score > best[0]:
                best = (score, cx, cy, r)
print(f'\n最佳环拟合: 评分={best[0]:.2f} 中心=({best[1]},{best[2]}) 半径={best[3]}')

cx, cy, R = best[1], best[2], best[3]
runs = []
cur = None
for deg in range(0, 360, 2):
    px = im.getpixel((int(cx + R * math.cos(math.radians(deg))), int(cy + R * math.sin(math.radians(deg)))))
    if is_ring_color(px):
        name = '彩色'
        for n, c in OLD.items():
            if dist(px, c) < 70:
                name = n
                break
    else:
        name = '背景'
    if cur and cur[2] == name:
        cur[1] = deg
    else:
        cur = [deg, deg, name]
        runs.append(cur)

print('\n=== 环周颜色分布（0°=3点方向，顺时针） ===')
for s, e, n in runs:
    print(f'{s:3d}° → {e:3d}°  ({e - s + 2:3d}°)  {n}')
gaps = [(s, e) for s, e, n in runs if n == '背景']
total = sum(e - s + 2 for s, e in gaps)
print(f'\n缺口: {len(gaps)} 个, 共 {total}° ({total / 360 * 100:.1f}%)')
