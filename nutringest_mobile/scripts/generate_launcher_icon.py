import os
from PIL import Image

def generate_icons():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_path = os.path.join(base_dir, "assets", "images", "IsologoBlanco.png")
    fg_out_path = os.path.join(base_dir, "assets", "images", "ic_launcher_foreground.png")
    ios_out_path = os.path.join(base_dir, "assets", "images", "ic_launcher_ios.png")

    img = Image.open(src_path).convert("RGBA")
    w, h = img.size

    # Target canvas size: 512x512
    canvas_size = 512
    # Target central box: 320x320
    target_box = 320

    scale = min(target_box / w, target_box / h)
    new_w, new_h = int(w * scale), int(h * scale)

    resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    paste_x = (canvas_size - new_w) // 2
    paste_y = (canvas_size - new_h) // 2

    # 1. Padded transparent foreground image for Android Adaptive Icon
    fg_canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    fg_canvas.paste(resized_img, (paste_x, paste_y), resized_img)
    fg_canvas.save(fg_out_path, "PNG")
    print(f"Generated {fg_out_path} ({canvas_size}x{canvas_size}, logo size {new_w}x{new_h})")

    # 2. Padded iOS icon with solid purple background (#6B46C1)
    purple_color = (107, 70, 193, 255) # #6B46C1
    ios_canvas = Image.new("RGBA", (canvas_size, canvas_size), purple_color)
    ios_canvas.paste(resized_img, (paste_x, paste_y), resized_img)
    ios_canvas.save(ios_out_path, "PNG")
    print(f"Generated {ios_out_path} ({canvas_size}x{canvas_size}, logo size {new_w}x{new_h})")

if __name__ == "__main__":
    generate_icons()
