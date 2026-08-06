"""元素级截图分析：环带 360° 采样 + ASCII（坐标 1:1，无错位）"""
from PIL import Image
import math

IMG = r'C:\Users\43124\ZCodeProject\web-ring-element.png'
im = Image.open(IMG).convert('RGB')
W, H = im.size
print(f'截图尺寸: {W}x{H}')

cx, cy = W / 2, H / 2
R = W * 45 / 120
HALF = W * 6 / 120
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

line = ''
for deg in range(0, 360, 10):
    px = sample(deg)
    if dist(px, (255, 255, 255)) < 20:
        ch = '.'
    elif dist(px, (0, 122, 255)) < 80:
        ch = 'B'
    elif dist(px, (50, 173, 230)) < 80:
        ch = 'C'
    elif dist(px, (52, 199, 89)) < 80:
        ch = 'G'
    elif dist(px, (255, 204, 0)) < 80:
        ch = 'Y'
    elif dist(px, (255, 149, 0)) < 80:
        ch = 'O'
    else:
        ch = '?'
    line += ch
    if deg % 90 == 80:
        line += ' | '
print('360° 采样（每10°）:', line)
print('理论: 绿 270-305° | 青 310-35° | 蓝 40-260°')

# ASCII 可视化（2px/格）
STEP = 2
for gy in range(0, H, STEP):
    row = ''
    for gx in range(0, W, STEP):
        px = im.getpixel((min(gx + 1, W - 1), min(gy + 1, H - 1)))
        if dist(px, (255, 255, 255)) < 12:
            row += '.'
        elif dist(px, (0, 122, 255)) < 80:
            row += 'B'
        elif dist(px, (50, 173, 230)) < 80:
            row += 'C'
        elif dist(px, (52, 199, 89)) < 80:
            row += 'G'
        elif dist(px, (255, 204, 0)) < 80:
            row += 'Y'
        elif dist(px, (255, 149, 0)) < 80:
            row += 'O'
        elif px[0] > 200 and px[1] > 200:
            row += '~'
        else:
            row += '?'
    print(row)

