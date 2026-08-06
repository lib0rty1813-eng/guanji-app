"""分析用户附件截图：全图扫描环色像素 + 定位环"""
from PIL import Image
import math

IMG = r'C:\Users\43124\Documents\xwechat_files\wxid_sbijyex91itn22_b7cf\temp\InputTemp\a59ac7e4-5702-4075-b3eb-35b7e7fc0376.png'
im = Image.open(IMG).convert('RGB')
W, H = im.size
print(f'尺寸: {W}x{H}')

TARGETS = {
    '黄#C6E2FF': (198, 226, 255), '橙#9CCBFF': (156, 203, 255),
    '绿#6FB2FF': (111, 178, 255), '青#3F96FF': (63, 150, 255),
    '蓝#C6E2FF2': (0, 122, 255)
}

def dist(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

found = {k: [] for k in TARGETS}
for y in range(0, H, 3):
    for x in range(0, W, 3):
        px = im.getpixel((x, y))
        for name, c in TARGETS.items():
            if dist(px, c) < 60:
                found[name].append((x, y))
                break

for name, pts in found.items():
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        print(f'{name}: {len(pts)} 点, x[{min(xs)}-{max(xs)}] y[{min(ys)}-{max(ys)}]')
    else:
        print(f'{name}: 未找到')

