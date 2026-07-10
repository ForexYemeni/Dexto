#!/usr/bin/env python3
"""
Edit the logo to match the platform's color scheme using numpy vectorized operations
"""
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

def adjust_logo_colors(input_path, output_path):
    """Adjust logo colors to match platform scheme - vectorized"""
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img).astype(np.float32)

    h, w = arr.shape[:2]
    alpha = arr[:, :, 3]
    mask = alpha > 30

    # Create position-based gradient (top=blue, middle=purple, bottom=gold)
    y_coords = np.arange(h).reshape(h, 1).astype(np.float32) / h

    # Initialize color arrays
    r_new = np.zeros((h, w), dtype=np.float32)
    g_new = np.zeros((h, w), dtype=np.float32)
    b_new = np.zeros((h, w), dtype=np.float32)

    # Top 40%: Blue -> Purple
    top_mask = y_coords < 0.4
    factor = np.where(top_mask, y_coords / 0.4, 1.0)
    r_new = np.where(top_mask, 59 * (1 - factor) + 168 * factor, r_new)
    g_new = np.where(top_mask, 130 * (1 - factor) + 85 * factor, g_new)
    b_new = np.where(top_mask, 246 * (1 - factor) + 247 * factor, b_new)

    # Middle 30%: Purple -> Gold
    mid_mask = (y_coords >= 0.4) & (y_coords < 0.7)
    factor = np.where(mid_mask, (y_coords - 0.4) / 0.3, 0.0)
    r_new = np.where(mid_mask, 168 * (1 - factor) + 245 * factor, r_new)
    g_new = np.where(mid_mask, 85 * (1 - factor) + 158 * factor, g_new)
    b_new = np.where(mid_mask, 247 * (1 - factor) + 11 * factor, b_new)

    # Bottom 30%: Gold
    bot_mask = y_coords >= 0.7
    r_new = np.where(bot_mask, 245, r_new)
    g_new = np.where(bot_mask, 158, g_new)
    b_new = np.where(bot_mask, 11, b_new)

    # Calculate luminance from original
    luminance = (0.299 * arr[:,:,0] + 0.587 * arr[:,:,1] + 0.114 * arr[:,:,2]) / 255.0
    brightness = 0.3 + 0.7 * luminance

    # Apply colors only where mask is true
    arr[:,:,0] = np.where(mask, np.clip(r_new * brightness, 0, 255), arr[:,:,0])
    arr[:,:,1] = np.where(mask, np.clip(g_new * brightness, 0, 255), arr[:,:,1])
    arr[:,:,2] = np.where(mask, np.clip(b_new * brightness, 0, 255), arr[:,:,2])

    img = Image.fromarray(arr.astype(np.uint8))

    # Add glow effect
    glow = img.filter(ImageFilter.GaussianBlur(radius=8))
    glow_arr = np.array(glow).astype(np.float32)
    glow_arr[:,:,3] = glow_arr[:,:,3] * 0.4  # Reduce glow alpha
    glow = Image.fromarray(glow_arr.astype(np.uint8))

    # Composite: dark bg + glow + logo
    result = Image.new('RGBA', img.size, (10, 10, 26, 255))
    result = Image.alpha_composite(result, glow)
    result = Image.alpha_composite(result, img)

    result.save(output_path, 'PNG')
    print(f'✅ Saved: {output_path}')
    return result

# Generate different sizes
def generate_icons(base_img, sizes):
    for size, name in sizes:
        resized = base_img.resize((size, size), Image.LANCZOS)
        path = f'/home/z/my-project/public/{name}'
        resized.save(path, 'PNG', optimize=True)
        print(f'✅ {name}: {size}x{size}')

print('Editing logo colors...')
base = adjust_logo_colors(
    '/home/z/my-project/scripts/original-logo.png',
    '/home/z/my-project/public/logo-platform.png'
)

print('\nGenerating PWA icons...')
sizes = [
    (16, 'favicon-16.png'),
    (32, 'favicon-32.png'),
    (192, 'icon-192.png'),
    (256, 'icon-256.png'),
    (512, 'icon-512.png'),
    (180, 'apple-touch-icon.png'),
]
generate_icons(base, sizes)

# favicon.ico
base.resize((32, 32), Image.LANCZOS).save('/home/z/my-project/public/favicon.ico', format='ICO')
print('✅ favicon.ico')

# Maskable icon (with padding for Android safe zone)
maskable = Image.new('RGBA', (512, 512), (10, 10, 26, 255))
inner = base.resize((384, 384), Image.LANCZOS)
maskable.paste(inner, (64, 64), inner)
maskable.save('/home/z/my-project/public/maskable-icon.png', 'PNG')
print('✅ maskable-icon.png: 512x512')

print('\n✅ All icons generated!')
