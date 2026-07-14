#!/usr/bin/env python3
"""Generate 20 high-quality transparent PNG stickers for poster editor."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = '/tmp/TOYtamaxia-invitation/uploads/poster/stickers'
os.makedirs(OUT_DIR, exist_ok=True)

SIZE = 256

def create_sticker(name, draw_func):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(img, draw, SIZE)
    path = os.path.join(OUT_DIR, f'{name}.png')
    img.save(path, 'PNG')
    print(f'  ✓ {name}.png')

# ---- Stickers ----

def sticker_heart(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 3
    # Simple heart using two circles and a triangle
    import math
    for y in range(s):
        for x in range(s):
            dx = (x - cx) / r
            dy = (y - cy + r * 0.3) / r
            if (dx**2 + dy**2 - 1)**3 - dx**2 * dy**3 < 0:
                img.putpixel((x, y), (232, 74, 110, 255))

def sticker_star(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 3
    points = []
    for i in range(10):
        angle = i * 36 - 90
        rad = r if i % 2 == 0 else r * 0.4
        import math
        px = cx + rad * math.cos(math.radians(angle))
        py = cy + rad * math.sin(math.radians(angle))
        points.append((px, py))
    draw.polygon(points, fill=(255, 193, 7, 255))

def sticker_flower(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 4
    import math
    for i in range(5):
        angle = i * 72 - 90
        px = cx + r * 0.8 * math.cos(math.radians(angle))
        py = cy + r * 0.8 * math.sin(math.radians(angle))
        draw.ellipse([px - r * 0.6, py - r * 0.6, px + r * 0.6, py + r * 0.6], fill=(255, 152, 0, 255))
    draw.ellipse([cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4], fill=(255, 235, 59, 255))

def sticker_bow(img, draw, s):
    cx, cy = s // 2, s // 2
    # Left wing
    draw.polygon([(cx - 10, cy), (cx - 90, cy - 60), (cx - 80, cy + 20), (cx - 10, cy + 30)], fill=(255, 64, 129, 255))
    # Right wing
    draw.polygon([(cx + 10, cy), (cx + 90, cy - 60), (cx + 80, cy + 20), (cx + 10, cy + 30)], fill=(255, 64, 129, 255))
    # Center
    draw.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=(255, 23, 68, 255))
    # Tails
    draw.polygon([(cx - 8, cy + 14), (cx - 30, cy + 90), (cx - 10, cy + 14)], fill=(255, 64, 129, 255))
    draw.polygon([(cx + 8, cy + 14), (cx + 30, cy + 90), (cx + 10, cy + 14)], fill=(255, 64, 129, 255))

def sticker_crown(img, draw, s):
    cx, cy = s // 2, s // 3
    w = s // 3
    # Base
    draw.rectangle([cx - w, cy + w * 0.3, cx + w, cy + w * 0.6], fill=(255, 193, 7, 255))
    # Peaks
    draw.polygon([(cx - w, cy + w * 0.3), (cx - w, cy - w * 0.6), (cx - w * 0.5, cy + w * 0.1)], fill=(255, 193, 7, 255))
    draw.polygon([(cx - w * 0.3, cy + w * 0.1), (cx, cy - w * 0.8), (cx + w * 0.3, cy + w * 0.1)], fill=(255, 193, 7, 255))
    draw.polygon([(cx + w * 0.5, cy + w * 0.1), (cx + w, cy - w * 0.6), (cx + w, cy + w * 0.3)], fill=(255, 193, 7, 255))

def sticker_balloon(img, draw, s):
    cx, cy = s // 2, s // 2 - 20
    r = s // 5
    draw.ellipse([cx - r * 1.2, cy - r * 1.5, cx + r * 1.2, cy + r * 1.5], fill=(244, 67, 54, 255))
    # String
    draw.line([(cx, cy + r * 1.5), (cx, cy + r * 1.5 + 60)], fill=(150, 150, 150, 200), width=3)
    # Highlight
    draw.ellipse([cx - r * 0.4, cy - r * 0.8, cx - r * 0.1, cy - r * 0.5], fill=(255, 255, 255, 100))

def sticker_gift(img, draw, s):
    cx, cy = s // 2, s // 2
    w = s // 4
    draw.rectangle([cx - w, cy - w * 0.8, cx + w, cy + w * 0.8], fill=(76, 175, 80, 255))
    # Ribbon vertical
    draw.rectangle([cx - w * 0.15, cy - w * 0.8, cx + w * 0.15, cy + w * 0.8], fill=(255, 87, 34, 255))
    # Ribbon horizontal
    draw.rectangle([cx - w, cy - w * 0.12, cx + w, cy + w * 0.12], fill=(255, 87, 34, 255))
    # Bow
    draw.polygon([(cx - 10, cy - w * 0.8), (cx - 35, cy - w * 1.3), (cx - 5, cy - w * 1.1)], fill=(255, 87, 34, 255))
    draw.polygon([(cx + 10, cy - w * 0.8), (cx + 35, cy - w * 1.3), (cx + 5, cy - w * 1.1)], fill=(255, 87, 34, 255))

def sticker_note(img, draw, s):
    cx, cy = s // 2, s // 2
    w = s // 4
    # Music note
    draw.ellipse([cx - w * 0.5, cy + w * 0.6, cx + w * 0.5, cy + w * 1.3], fill=(33, 150, 243, 255))
    draw.rectangle([cx + w * 0.3, cy - w * 1.2, cx + w * 0.6, cy + w * 0.7], fill=(33, 150, 243, 255))
    draw.ellipse([cx + w * 0.2, cy - w * 1.3, cx + w * 0.8, cy - w * 0.7], fill=(33, 150, 243, 255))

def sticker_ring(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 4
    # Ring band
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 215, 0, 255), width=s // 18)
    # Diamond
    diamond_r = r * 0.35
    draw.polygon([
        (cx, cy - r - diamond_r),
        (cx + diamond_r, cy - r),
        (cx, cy - r + diamond_r),
        (cx - diamond_r, cy - r),
    ], fill=(255, 255, 255, 255))

def sticker_champagne(img, draw, s):
    cx, cy = s // 2, s // 2
    w = s // 8
    # Bottle
    draw.rectangle([cx - w * 0.8, cy - w * 2, cx + w * 0.8, cy + w * 2.5], fill=(255, 235, 59, 200))
    # Neck
    draw.rectangle([cx - w * 0.4, cy - w * 3, cx + w * 0.4, cy - w * 2], fill=(255, 193, 7, 200))
    # Cork
    draw.rectangle([cx - w * 0.5, cy - w * 3.5, cx + w * 0.5, cy - w * 3], fill=(139, 90, 43, 255))
    # Label
    draw.rectangle([cx - w * 0.6, cy - w * 0.5, cx + w * 0.6, cy + w * 1], fill=(255, 255, 255, 230))

def sticker_confetti1(img, draw, s):
    import random, math
    random.seed(42)
    colors = [(244,67,54,200), (33,150,243,200), (76,175,80,200), (255,193,7,200), (156,39,176,200)]
    for _ in range(40):
        x = random.randint(20, s - 20)
        y = random.randint(20, s - 20)
        angle = random.random() * 360
        w = random.randint(12, 24)
        h = random.randint(6, 12)
        color = random.choice(colors)
        # Rotated rectangle using polygon
        cos_a = math.cos(math.radians(angle))
        sin_a = math.sin(math.radians(angle))
        points = [
            (x - w // 2 * cos_a - h // 2 * sin_a, y - w // 2 * sin_a + h // 2 * cos_a),
            (x + w // 2 * cos_a - h // 2 * sin_a, y + w // 2 * sin_a + h // 2 * cos_a),
            (x + w // 2 * cos_a + h // 2 * sin_a, y + w // 2 * sin_a - h // 2 * cos_a),
            (x - w // 2 * cos_a + h // 2 * sin_a, y - w // 2 * sin_a - h // 2 * cos_a),
        ]
        draw.polygon(points, fill=color)

def sticker_confetti2(img, draw, s):
    import random, math
    random.seed(99)
    colors = [(255,87,34,200), (0,188,212,200), (205,220,57,200), (233,30,99,200), (63,81,181,200)]
    for _ in range(50):
        x = random.randint(15, s - 15)
        y = random.randint(15, s - 15)
        r = random.randint(4, 10)
        color = random.choice(colors)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

def sticker_ribbon(img, draw, s):
    cx, cy = s // 2, s // 2
    w = s // 5
    # Main ribbon
    draw.rectangle([cx - w * 0.4, cy - w * 2, cx + w * 0.4, cy + w * 2], fill=(233, 30, 99, 255))
    # Left tail
    draw.polygon([(cx - w * 0.4, cy + w * 0.5), (cx - w * 1.3, cy + w * 2.2), (cx - w * 0.4, cy + w * 1.8)], fill=(233, 30, 99, 255))
    # Right tail
    draw.polygon([(cx + w * 0.4, cy + w * 0.5), (cx + w * 1.3, cy + w * 2.2), (cx + w * 0.4, cy + w * 1.8)], fill=(233, 30, 99, 255))

def sticker_frame_round(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 3
    # Thick circle frame
    for i in range(12, 0, -1):
        alpha = 30 + (12 - i) * 20
        draw.ellipse([cx - r - i, cy - r - i, cx + r + i, cy + r + i], outline=(255, 255, 255, alpha), width=1)

def sticker_frame_square(img, draw, s):
    m = s // 6
    # Corner decorations
    corner_len = s // 5
    # Top-left
    draw.line([(m, m + corner_len), (m, m), (m + corner_len, m)], fill=(255, 255, 255, 220), width=4)
    # Top-right
    draw.line([(s - m - corner_len, m), (s - m, m), (s - m, m + corner_len)], fill=(255, 255, 255, 220), width=4)
    # Bottom-left
    draw.line([(m, s - m - corner_len), (m, s - m), (m + corner_len, s - m)], fill=(255, 255, 255, 220), width=4)
    # Bottom-right
    draw.line([(s - m - corner_len, s - m), (s - m, s - m), (s - m, s - m - corner_len)], fill=(255, 255, 255, 220), width=4)

def sticker_sparkle(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 4
    import math
    # Cross sparkle
    for angle in [0, 45, 90, 135]:
        rad = math.radians(angle)
        dx = r * math.cos(rad)
        dy = r * math.sin(rad)
        draw.line([(cx - dx * 0.3, cy - dy * 0.3), (cx + dx, cy + dy)], fill=(255, 255, 255, 220), width=3)
    draw.ellipse([cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2], fill=(255, 255, 255, 200))

def sticker_wreath(img, draw, s):
    cx, cy = s // 2, s // 2
    r = s // 4
    import math
    # Simple wreath - multiple leaves arranged in a circle
    for i in range(24):
        angle = math.radians(i * 15)
        lx = cx + r * math.cos(angle)
        ly = cy + r * math.sin(angle)
        leaf_size = 18
        draw.ellipse([lx - leaf_size // 2, ly - leaf_size // 3, lx + leaf_size // 2, ly + leaf_size // 3],
                     fill=(76, 175, 80, 200) if i % 3 else (56, 142, 60, 220))

def sticker_swirl(img, draw, s):
    cx, cy = s // 2, s // 2
    import math
    points = []
    for t in range(0, 720, 5):
        rad = math.radians(t)
        r = s * 0.1 + (t / 720) * s * 0.35
        x = cx + r * math.cos(rad)
        y = cy + r * math.sin(rad)
        points.append((x, y))
    if len(points) > 1:
        draw.line(points, fill=(255, 215, 0, 220), width=5)

def sticker_dot_pattern(img, draw, s):
    import random, math
    random.seed(77)
    for _ in range(80):
        x = random.randint(10, s - 10)
        y = random.randint(10, s - 10)
        r = random.randint(2, 6)
        alpha = random.randint(80, 200)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))

def sticker_tag(img, draw, s):
    cx, cy = s // 2, s // 2
    w = s // 4
    h = s // 3
    # Tag shape
    draw.rounded_rectangle([cx - w, cy - h, cx + w, cy + h], radius=16, fill=(255, 152, 0, 240))
    # Hole
    draw.ellipse([cx - 8, cy - h - 4, cx + 8, cy - h + 20], fill=(0, 0, 0, 0), outline=(255, 255, 255, 200), width=2)
    # Text placeholder line
    draw.line([(cx - w * 0.5, cy - h * 0.2), (cx + w * 0.5, cy - h * 0.2)], fill=(255, 255, 255, 180), width=3)
    draw.line([(cx - w * 0.4, cy + h * 0.2), (cx + w * 0.4, cy + h * 0.2)], fill=(255, 255, 255, 180), width=3)

# Generate all
stickers = [
    ('heart', sticker_heart),
    ('star', sticker_star),
    ('flower', sticker_flower),
    ('bow', sticker_bow),
    ('crown', sticker_crown),
    ('balloon', sticker_balloon),
    ('gift', sticker_gift),
    ('note', sticker_note),
    ('ring', sticker_ring),
    ('champagne', sticker_champagne),
    ('confetti_1', sticker_confetti1),
    ('confetti_2', sticker_confetti2),
    ('ribbon', sticker_ribbon),
    ('frame_round', sticker_frame_round),
    ('frame_square', sticker_frame_square),
    ('sparkle', sticker_sparkle),
    ('wreath', sticker_wreath),
    ('swirl', sticker_swirl),
    ('dot_pattern', sticker_dot_pattern),
    ('tag', sticker_tag),
]

print(f'Generating {len(stickers)} stickers...')
for name, fn in stickers:
    create_sticker(name, fn)

print(f'\n✅ Done! All stickers saved to {OUT_DIR}')
