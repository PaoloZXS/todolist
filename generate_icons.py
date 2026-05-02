from PIL import Image, ImageDraw
import os

# Crea cartella se non esiste
os.makedirs('assets/icons', exist_ok=True)

def create_icon(size):
    """Crea icona lista TODO con design professionale"""
    # Colori tema
    bg_color = (43, 121, 210)  # #2b79d2 blu
    accent_color = (61, 137, 240)  # #3d89f0 blu chiaro
    text_color = (255, 255, 255)  # bianco
    
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Sfondo arrotondato
    padding = int(size * 0.05)
    draw.rectangle(
        [(padding, padding), (size-padding, size-padding)],
        fill=bg_color
    )
    
    # Disegna checkbox lista (3 righe con checkbox)
    line_height = int(size * 0.2)
    start_y = int(size * 0.2)
    start_x = int(size * 0.15)
    checkbox_size = int(size * 0.08)
    
    for i in range(3):
        y = start_y + (i * line_height)
        
        # Checkbox
        draw.rectangle(
            [(start_x, y), (start_x + checkbox_size, y + checkbox_size)],
            outline=text_color,
            width=max(1, int(size * 0.02))
        )
        
        # Checkmark nel primo checkbox
        if i == 0:
            draw.line(
                [(start_x + int(checkbox_size*0.25), y + int(checkbox_size*0.5)),
                 (start_x + int(checkbox_size*0.4), y + int(checkbox_size*0.7)),
                 (start_x + int(checkbox_size*0.75), y + int(checkbox_size*0.25))],
                fill=accent_color,
                width=max(1, int(size * 0.02))
            )
        
        # Linea testo
        line_start_x = start_x + checkbox_size + int(size * 0.08)
        line_width = int(size * 0.35)
        draw.rectangle(
            [(line_start_x, y + int(checkbox_size*0.25)), 
             (line_start_x + line_width, y + int(checkbox_size*0.35))],
            fill=accent_color
        )
    
    return img

# Crea icona 192x192
img192 = create_icon(192)
img192.save('assets/icons/icon-192.png')
print('✓ icon-192.png creato (192x192, design lista TODO)')

# Crea icona 512x512
img512 = create_icon(512)
img512.save('assets/icons/icon-512.png')
print('✓ icon-512.png creato (512x512, design lista TODO)')
