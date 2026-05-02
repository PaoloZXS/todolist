from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('assets/icons', exist_ok=True)

def create_code_icon(size):
    """Crea icona che rappresenta il codice con simboli riconoscibili"""
    # Colori tema
    bg_color = (23, 31, 46)  # #171f2e background scuro
    code_color = (43, 121, 210)  # #2b79d2 blu principale
    accent_color = (61, 137, 240)  # #3d89f0 blu chiaro
    text_color = (237, 242, 255)  # #edf2ff text chiaro
    
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Stima dimensioni font
    font_size_large = int(size * 0.25)
    font_size_small = int(size * 0.12)
    
    try:
        font_large = ImageFont.truetype("arial.ttf", font_size_large)
        font_small = ImageFont.truetype("arial.ttf", font_size_small)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Sfondo gradiente simulato (quadranti diversi)
    for y in range(size):
        ratio = y / size
        r = int(23 + (43 - 23) * ratio)
        g = int(31 + (121 - 31) * ratio)
        b = int(46 + (210 - 46) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    
    # Disegna simboli di codice: < { >
    # Parentesi aperta <
    center_x = size // 2
    center_y = size // 2
    
    bracket_offset = int(size * 0.15)
    
    # < simbolo sinistro
    draw.line(
        [(center_x - bracket_offset, center_y - bracket_offset),
         (center_x - bracket_offset - int(size*0.1), center_y)],
        fill=accent_color,
        width=int(size * 0.025)
    )
    draw.line(
        [(center_x - bracket_offset - int(size*0.1), center_y),
         (center_x - bracket_offset, center_y + bracket_offset)],
        fill=accent_color,
        width=int(size * 0.025)
    )
    
    # Parentesi graffe centrali { }
    draw.line(
        [(center_x, center_y - bracket_offset - int(size*0.05)),
         (center_x - int(size*0.05), center_y - bracket_offset)],
        fill=code_color,
        width=int(size * 0.02)
    )
    draw.line(
        [(center_x - int(size*0.05), center_y - bracket_offset),
         (center_x - int(size*0.05), center_y + bracket_offset)],
        fill=code_color,
        width=int(size * 0.02)
    )
    draw.line(
        [(center_x - int(size*0.05), center_y + bracket_offset),
         (center_x, center_y + bracket_offset + int(size*0.05))],
        fill=code_color,
        width=int(size * 0.02)
    )
    
    # > simbolo destro
    draw.line(
        [(center_x + bracket_offset, center_y - bracket_offset),
         (center_x + bracket_offset + int(size*0.1), center_y)],
        fill=accent_color,
        width=int(size * 0.025)
    )
    draw.line(
        [(center_x + bracket_offset + int(size*0.1), center_y),
         (center_x + bracket_offset, center_y + bracket_offset)],
        fill=accent_color,
        width=int(size * 0.025)
    )
    
    # Puntini in basso (rappresentano linee di codice)
    dots_y = int(size * 0.75)
    for i in range(3):
        x = int(size * 0.25) + (i * int(size * 0.25))
        draw.ellipse(
            [(x-int(size*0.03), dots_y-int(size*0.03)), 
             (x+int(size*0.03), dots_y+int(size*0.03))],
            fill=text_color
        )
    
    return img

# Crea icona 192x192
img192 = create_code_icon(192)
img192.save('assets/icons/icon-192.png')
print('✓ icon-192.png creato (192x192, design codice professionali)')

# Crea icona 512x512
img512 = create_code_icon(512)
img512.save('assets/icons/icon-512.png')
print('✓ icon-512.png creato (512x512, design codice professionale)')
