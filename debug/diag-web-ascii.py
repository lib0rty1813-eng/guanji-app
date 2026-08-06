"""ASCII 可视化：把环图区域逐像素分类打印"""
from PIL import Image
import math

IMG = r'C:\Users\43124\ZCodeProject\web-ring-full.png'
RX, RY, RW, RH = 347.5714416503906, 777.3392944335938, 112, 112

im = Image.open(IMG).convert('RGB')

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

KNOWN = {
    'B': (0, 122, 255),    # 蓝 #007AFF
    'b': (10, 132, 255),   # 深蓝 #0A84FF
    'C': (50, 173, 230),   # 青 #32ADE6
    'G': (52, 199, 89),    # 绿 #34C759
    'Y': (255, 204, 0),    # 黄
    'O': (255, 149, 0),    # 橙
}

def classify(px):
    if dist(px, (255, 255, 255)) < 12:
        return '.'          # 白色（卡片/gap）
    best_n, best_d = '?', 1e9
    for n, c in KNOWN.items():
        d = dist(px, c)
        if d < best_d:
            best_n, best_d = n, d
    if best_d < 80:
        return best_n
    if px[0] > 200 and px[2] > 240 and px[1] > 200:
        return '~'          # 极浅蓝（面积图渐变/抗锯齿）
    return '?'              # 其他

# 输出 56x56 字符（每 2px 一格）
STEP = 2
for gy in range(int(RY), int(RY + RH), STEP):
    row = ''
    for gx in range(int(RX), int(RX + RW), STEP):
        # 每格取中心像素
        row += classify(im.getpixel((gx + 1, gy + 1)))
    print(row)
