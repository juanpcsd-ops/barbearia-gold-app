"""Generate launcher icons from the Gold SVG for the Capacitor Android project."""
from io import BytesIO
from pathlib import Path
import cairosvg
from PIL import Image

source = Path("assets/logo.svg")
res = Path("android/app/src/main/res")
sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
svg = source.read_bytes()

def render(size):
    return Image.open(BytesIO(cairosvg.svg2png(bytestring=svg, output_width=size, output_height=size))).convert("RGBA")

for density, size in sizes.items():
    folder = res / ("mipmap-" + density)
    folder.mkdir(parents=True, exist_ok=True)
    icon = render(size)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")
    # Adaptive launcher icons are cropped into a circle/squircle by Android.
    # Keep the emblem in the central safe zone to avoid clipping its lettering.
    foreground = Image.new("RGBA", (size * 3 // 2, size * 3 // 2), (0, 0, 0, 0))
    emblem = render(size)
    foreground.alpha_composite(emblem, ((foreground.width - size) // 2, (foreground.height - size) // 2))
    foreground.save(folder / "ic_launcher_foreground.png")
print("Gold launcher icons generated for five Android densities.")
