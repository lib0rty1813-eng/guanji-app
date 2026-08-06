"""环带 360° 采样表：每 10° 一个颜色字符"""
from PIL import Image
import math

IMG = r'C:\Users\43124\ZCodeProject\web-ring-sync.png'
RX, RY, RW, RH = 347.5714416503906, 467.0535888671875, 112, 112

im = Image.open(IMG).convert('RGB')
cx, cy = RX + RW / 2, RY + RH / 2
R = RW * 45 / 120
HALF = RW * 6 / 120

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

# 10° 步长，输出 36 格
print('角度刻度（0°=3点方向，顺时针）:')
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
print(line)
print()
print('位置标注:')
for deg in range(0, 360, 30):
    px = sample(deg)
    print(f'{deg:3d}°: rgb={px}')

# 理论分段对照（数据 0/0/2/4/10）
print()
print('理论: 绿 270-305° | 青 310-35° | 蓝 40-260° | gap 305-310, 35-40, 260-270')

