from PIL import Image, ImageDraw

def make_icon(size):
    img = Image.new("RGBA", (size, size), (30, 58, 138, 255))
    d = ImageDraw.Draw(img)
    pad = size // 8
    d.ellipse([pad, pad, size - pad, size - pad], fill=(96, 165, 250, 255))
    return img

sizes = [16, 32, 48, 64, 128, 256]
frames = [make_icon(s) for s in sizes]

frames[0].save(
    "icons/icon.ico",
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=frames[1:],
)

make_icon(32).save("icons/32x32.png", format="PNG")
make_icon(128).save("icons/128x128.png", format="PNG")
make_icon(128).save("icons/128x128@2x.png", format="PNG")
make_icon(256).save("icons/icon.png", format="PNG")

print("Icons generated successfully")
