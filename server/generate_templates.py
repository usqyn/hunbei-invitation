#!/usr/bin/env python3
"""Generate 26 poster template backgrounds and cover thumbnails."""
import os
import math
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = '/tmp/TOYtamaxia-invitation/uploads/poster/templates'
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 750, 1334  # Poster size
COVER_W, COVER_H = 350, 500  # Cover thumbnail

# Template definitions
TEMPLATES = [
    # (id, style, colors)
    ('wedding_1', 'romantic', [(255, 182, 193), (255, 105, 180), (255, 192, 203)]),
    ('wedding_2', 'chinese', [(220, 20, 60), (139, 0, 0), (178, 34, 34)]),
    ('wedding_3', 'forest', [(46, 125, 50), (76, 175, 80), (129, 212, 130)]),
    ('wedding_4', 'minimal', [(250, 250, 250), (240, 240, 245), (230, 230, 240)]),
    ('wedding_5', 'luxury', [(212, 175, 55), (184, 134, 11), (218, 165, 32)]),
    ('engagement_1', 'pink', [(255, 182, 193), (240, 128, 128), (255, 218, 185)]),
    ('engagement_2', 'soft', [(230, 180, 180), (210, 160, 170), (240, 200, 200)]),
    ('baby_1', 'warm', [(255, 224, 130), (255, 183, 77), (255, 241, 118)]),
    ('baby_2', 'pastel', [(248, 187, 208), (206, 147, 216), (179, 229, 252)]),
    ('baby_3', 'peach', [(255, 204, 188), (255, 171, 145), (255, 138, 101)]),
    ('birthday_1', 'purple', [(156, 39, 176), (171, 71, 188), (186, 104, 200)]),
    ('birthday_2', 'vibrant', [(244, 67, 54), (233, 30, 99), (255, 87, 34)]),
    ('birthday_3', 'navy', [(26, 35, 126), (40, 53, 147), (57, 73, 171)]),
    ('house_1', 'orange', [(255, 152, 0), (251, 140, 0), (239, 108, 0)]),
    ('house_2', 'terracotta', [(216, 67, 21), (230, 74, 25), (191, 54, 12)]),
    ('parents_1', 'brown', [(109, 76, 65), (93, 64, 55), (121, 85, 72)]),
    ('parents_2', 'red_gold', [(183, 28, 28), (198, 40, 40), (211, 47, 47)]),
    ('study_1', 'blue', [(21, 101, 192), (25, 118, 210), (30, 136, 229)]),
    ('study_2', 'teal', [(0, 105, 92), (0, 121, 107), (0, 137, 123)]),
    ('poster_1', 'dark', [(33, 33, 33), (66, 66, 66), (44, 44, 44)]),
    ('poster_2', 'gradient_blue', [(41, 128, 185), (52, 152, 219), (41, 128, 185)]),
    ('poster_3', 'corp_blue', [(13, 71, 161), (21, 101, 192), (26, 35, 126)]),
    ('creative_1', 'cyber', [(0, 0, 0), (30, 30, 50), (10, 10, 30)]),
    ('creative_2', 'art', [(255, 255, 255), (245, 245, 240), (250, 248, 240)]),
    ('creative_3', 'neon', [(18, 18, 40), (30, 30, 60), (20, 20, 45)]),
    ('default', 'modern', [(100, 100, 150), (120, 120, 180), (80, 80, 130)]),
]

def draw_gradient(draw, w, h, colors, direction='vertical'):
    """Draw a gradient background."""
    if direction == 'vertical':
        for y in range(h):
            ratio = y / h
            r = int(colors[0][0] * (1 - ratio) + colors[2][0] * ratio)
            g = int(colors[0][1] * (1 - ratio) + colors[2][1] * ratio)
            b = int(colors[0][2] * (1 - ratio) + colors[2][2] * ratio)
            draw.line([(0, y), (w, y)], fill=(r, g, b))
    elif direction == 'horizontal':
        for x in range(w):
            ratio = x / w
            r = int(colors[0][0] * (1 - ratio) + colors[2][0] * ratio)
            g = int(colors[0][1] * (1 - ratio) + colors[2][1] * ratio)
            b = int(colors[0][2] * (1 - ratio) + colors[2][2] * ratio)
            draw.line([(x, 0), (x, h)], fill=(r, g, b))
    elif direction == 'radial':
        cx, cy = w // 2, h // 2
        max_r = int(math.sqrt(cx**2 + cy**2))
        for r in range(max_r, 0, -1):
            ratio = r / max_r
            rc = int(colors[0][0] * (1 - ratio) + colors[2][0] * ratio)
            gc = int(colors[0][1] * (1 - ratio) + colors[2][1] * ratio)
            bc = int(colors[0][2] * (1 - ratio) + colors[2][2] * ratio)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(rc, gc, bc))

def add_vignette(draw, w, h):
    """Add dark vignette edges."""
    max_dim = max(w, h)
    for i in range(min(w, h) // 3, 0, -1):
        alpha = int(15 * (1 - i / (min(w, h) // 3)))
        draw.rectangle([i, i, w - i, h - i], outline=(0, 0, 0, alpha))

def add_texture(draw, w, h, color=(255, 255, 255, 15)):
    """Add subtle noise texture."""
    import random
    random.seed(42)
    for _ in range(300):
        x = random.randint(0, w - 1)
        y = random.randint(0, h - 1)
        # Just add very subtle dots
        r = random.randint(1, 3)
        alpha = random.randint(2, 8)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(color[0], color[1], color[2], alpha))

def add_photo_frame(draw, w, h, cx, cy, fw, fh, radius=12):
    """Draw a photo frame placeholder."""
    # Outer shadow
    draw.rectangle([cx - fw // 2 - 4, cy - fh // 2 - 4, cx + fw // 2 + 4, cy + fh // 2 + 4],
                   fill=(255, 255, 255, 30), outline=None)
    # Frame
    draw.rounded_rectangle([cx - fw // 2, cy - fh // 2, cx + fw // 2, cy + fh // 2],
                          radius=radius, outline=(255, 255, 255, 60), width=3)
    # Inner cross (camera icon placeholder)
    cross_len = 40
    draw.line([(cx - cross_len, cy), (cx + cross_len, cy)], fill=(255, 255, 255, 40), width=2)
    draw.line([(cx, cy - cross_len), (cx, cy + cross_len)], fill=(255, 255, 255, 40), width=2)

def add_decorative_lines(draw, w, h, style='modern'):
    """Add decorative elements."""
    if style in ('romantic', 'pink', 'soft'):
        # Floral dots pattern
        for i in range(5):
            x = w * (i + 1) // 6
            y = 80
            for r in [20, 14, 8]:
                draw.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255, 30), width=1)
        # Bottom decoration
        for i in range(5):
            x = w * (i + 1) // 6
            y = h - 80
            for r in [20, 14, 8]:
                draw.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255, 30), width=1)

    elif style == 'chinese':
        # Horizontal lines top and bottom
        for y_pos in [60, h - 60]:
            draw.line([(w // 4, y_pos), (w * 3 // 4, y_pos)], fill=(255, 255, 255, 40), width=2)

    elif style in ('luxury', 'red_gold'):
        # Golden decorative lines
        for y_pos in [80, h - 80]:
            draw.line([(w // 6, y_pos), (w * 5 // 6, y_pos)], fill=(218, 165, 32, 60), width=2)
            draw.line([(w // 6, y_pos + 10), (w * 5 // 6, y_pos + 10)], fill=(218, 165, 32, 30), width=1)

    elif style in ('modern', 'minimal', 'corp_blue', 'dark'):
        # Simple geometric accents
        bar_w = 80
        for y_pos in [100, h - 80]:
            draw.rectangle([w // 2 - bar_w, y_pos, w // 2 + bar_w, y_pos + 2], fill=(255, 255, 255, 40))

    elif style in ('vibrant', 'birthday'):
        # Confetti-like circles
        import random
        random.seed(100)
        for _ in range(30):
            x = random.randint(30, w - 30)
            y = random.randint(30, h - 30)
            r = random.randint(4, 12)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 15))

    elif style in ('warm', 'pastel', 'peach'):
        # Gentle dots pattern
        for i in range(8):
            for j in range(3):
                x = w * (i + 1) // 9
                y = 60 + j * 30
                r = 3
                draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 20))

def generate_poster(name, style, colors):
    """Generate a poster background."""
    img = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(img)

    # Gradient background
    grad_dir = 'vertical'
    if style in ('cyber', 'neon'): grad_dir = 'radial'
    elif style in ('gradient_blue',): grad_dir = 'horizontal'
    draw_gradient(draw, W, H, colors, grad_dir)

    # Texture
    add_texture(draw, W, H)

    # Vignette
    add_vignette(draw, W, H)

    # Photo frame
    frame_cy = H * 0.52
    frame_size = min(W, H) // 3 * 2
    add_photo_frame(draw, W, H, W // 2, int(frame_cy), frame_size, frame_size, 12)

    # Decorative elements
    add_decorative_lines(draw, W, H, style)

    # Save
    path = os.path.join(OUT_DIR, f'{name}.jpg')
    img.save(path, 'JPEG', quality=85)
    print(f'  ✓ {name}.jpg')

def generate_cover(name, style, colors):
    """Generate a cover thumbnail."""
    img = Image.new('RGB', (COVER_W, COVER_H))
    draw = ImageDraw.Draw(img)

    # Gradient
    grad_dir = 'vertical'
    if style in ('cyber', 'neon'): grad_dir = 'radial'
    draw_gradient(draw, COVER_W, COVER_H, colors, grad_dir)

    # Small photo frame icon
    frame_size = COVER_W // 3
    frame_cy = COVER_H // 2 - 20
    add_photo_frame(draw, COVER_W, COVER_H, COVER_W // 2, frame_cy, frame_size, int(frame_size * 1.4), 8)

    # Title bar at bottom
    title_bar_h = 60
    draw.rectangle([0, COVER_H - title_bar_h, COVER_W, COVER_H],
                   fill=(0, 0, 0, 40))

    # Decorative line
    bar_w = 40
    draw.rectangle([COVER_W // 2 - bar_w, COVER_H - title_bar_h + 10,
                    COVER_W // 2 + bar_w, COVER_H - title_bar_h + 12],
                   fill=(255, 255, 255, 80))

    # Save
    path = os.path.join(OUT_DIR, f'cover_{name}.jpg')
    img.save(path, 'JPEG', quality=85)
    print(f'  ✓ cover_{name}.jpg')

print(f'Generating {len(TEMPLATES)} poster backgrounds + covers...')

for t_id, style, colors in TEMPLATES:
    generate_poster(t_id, style, colors)
    generate_cover(t_id, style, colors)

print(f'\n✅ Done! All templates saved to {OUT_DIR}')
print(f'   Total files: {len(TEMPLATES) * 2}')
