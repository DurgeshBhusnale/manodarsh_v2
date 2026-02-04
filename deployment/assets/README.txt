CRPF System - Assets Folder

This folder should contain:

1. sathi_logo.ico (Required for installer)
   - 256x256 icon for application
   - Used in installer and executable

2. wizard_image.bmp (Optional for installer)
   - 164x314 pixels
   - Shown on left side of installer

3. wizard_small.bmp (Optional for installer)
   - 55x58 pixels
   - Shown in top-right corner

HOW TO CREATE:

1. Find your logo image (PNG or JPG)

2. Convert to ICO:
   - Use online tool: https://www.icoconverter.com/
   - Or use ImageMagick: convert logo.png -resize 256x256 sathi_logo.ico

3. Create wizard images:
   - Use any image editor (Paint, Photoshop, GIMP)
   - Resize to exact dimensions
   - Save as BMP

PLACEHOLDER:
If you don't have these files, Inno Setup will use default icons.
The installer will still work, just won't have custom branding.
