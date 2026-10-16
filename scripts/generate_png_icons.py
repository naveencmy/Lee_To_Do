from PIL import Image, ImageDraw, ImageFont
import os

sizes = [72, 96, 128, 192, 512]
out_dir = r"e:\Projects\Active\Lee_To_Do\client\public\icons"
os.makedirs(out_dir, exist_ok=True)

# Generate high-res 1024x1024 master icon first
master_size = 1024
im = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(im)

# Background rounded rectangle
# Modern dark terminal gradient with glowing emerald border
corner_radius = 210
# Outer subtle border
draw.rounded_rectangle(
    [20, 20, master_size - 20, master_size - 20],
    radius=corner_radius,
    fill=(10, 10, 14, 255),
    outline=(16, 185, 129, 200),
    width=14
)

# Subtle background grid/glow inside
for i in range(100, master_size - 100, 140):
    draw.line([(i, 60), (i, master_size - 60)], fill=(255, 255, 255, 6), width=2)
    draw.line([(60, i), (master_size - 60, i)], fill=(255, 255, 255, 6), width=2)

# Three Kanban Columns
col_y_start = 220
col_height = 580
col_radius = 32

# Column 1 (To-Do) - Purple accent
draw.rounded_rectangle([150, col_y_start, 350, col_y_start + col_height], radius=col_radius, fill=(28, 25, 45, 240), outline=(139, 92, 246, 180), width=6)
# Column 2 (In-Progress) - Cyan accent
draw.rounded_rectangle([412, col_y_start, 612, col_y_start + col_height - 120], radius=col_radius, fill=(18, 35, 45, 240), outline=(6, 182, 212, 180), width=6)
# Column 3 (Done) - Emerald accent
draw.rounded_rectangle([674, col_y_start, 874, col_y_start + col_height - 60], radius=col_radius, fill=(18, 42, 32, 240), outline=(16, 185, 129, 220), width=6)

# Column Header Dots (Window style)
draw.ellipse([185, col_y_start + 45, 215, col_y_start + 75], fill=(239, 68, 68, 255))
draw.ellipse([230, col_y_start + 45, 260, col_y_start + 75], fill=(245, 158, 11, 255))
draw.ellipse([275, col_y_start + 45, 305, col_y_start + 75], fill=(16, 185, 129, 255))

# Task cards inside Column 1
draw.rounded_rectangle([175, col_y_start + 110, 325, col_y_start + 230], radius=18, fill=(40, 35, 65, 240), outline=(139, 92, 246, 120), width=4)
draw.rounded_rectangle([175, col_y_start + 260, 325, col_y_start + 380], radius=18, fill=(40, 35, 65, 240), outline=(139, 92, 246, 120), width=4)
draw.rounded_rectangle([175, col_y_start + 410, 325, col_y_start + 530], radius=18, fill=(40, 35, 65, 240), outline=(139, 92, 246, 120), width=4)

# Task cards inside Column 2
draw.rounded_rectangle([437, col_y_start + 80, 587, col_y_start + 220], radius=18, fill=(24, 48, 62, 240), outline=(6, 182, 212, 120), width=4)
draw.rounded_rectangle([437, col_y_start + 250, 587, col_y_start + 390], radius=18, fill=(24, 48, 62, 240), outline=(6, 182, 212, 120), width=4)

# Task cards inside Column 3 (Completed with Checkmarks)
draw.rounded_rectangle([699, col_y_start + 80, 849, col_y_start + 220], radius=18, fill=(22, 55, 40, 240), outline=(16, 185, 129, 140), width=4)
# Checkmark in card 1
draw.line([(730, col_y_start + 150), (760, col_y_start + 180), (815, col_y_start + 120)], fill=(16, 185, 129, 255), width=10)

draw.rounded_rectangle([699, col_y_start + 250, 849, col_y_start + 390], radius=18, fill=(22, 55, 40, 240), outline=(16, 185, 129, 140), width=4)
# Checkmark in card 2
draw.line([(730, col_y_start + 320), (760, col_y_start + 350), (815, col_y_start + 290)], fill=(16, 185, 129, 255), width=10)

# Top Bar Header Prompt Text: "> LEE_TODO"
draw.text((150, 115), "> LEE_TODO // CLI", fill=(16, 185, 129, 255))
# Glowing Float AI Orbital Sparkle at top right
cx, cy = 820, 145
draw.ellipse([cx - 48, cy - 48, cx + 48, cy + 48], fill=(16, 185, 129, 40), outline=(16, 185, 129, 220), width=6)
draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(52, 211, 153, 255))
# Outer orbital dots
draw.ellipse([cx - 65, cy - 10, cx - 50, cy + 5], fill=(6, 182, 212, 255))
draw.ellipse([cx + 50, cy + 10, cx + 65, cy + 25], fill=(6, 182, 212, 255))

# Export PNGs of each size
for s in sizes:
    resized = im.resize((s, s), Image.Resampling.LANCZOS)
    out_path = os.path.join(out_dir, f"icon-{s}.png")
    resized.save(out_path, "PNG")
    print(f"Generated {out_path} ({s}x{s})")

# Badge icon (72x72 monochrome for notifications)
badge = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
bdraw = ImageDraw.Draw(badge)
bdraw.rounded_rectangle([4, 4, 68, 68], radius=16, fill=(16, 185, 129, 255))
bdraw.line([(20, 36), (32, 48), (52, 24)], fill=(0, 0, 0, 255), width=6)
badge_path = os.path.join(out_dir, "badge-72.png")
badge.save(badge_path, "PNG")
print(f"Generated {badge_path}")
