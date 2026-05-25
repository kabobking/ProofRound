# Geist Fonts For PDF Rendering

Place the font files in this folder so backend PDF generation can match the website typography.

Required files (recommended names):

- `Geist-Regular.ttf`
- `Geist-SemiBold.ttf`

Optional fallback names recognized by the renderer:

- `Geist-Regular.otf`
- `Geist-Bold.ttf`
- `Geist-Bold.otf`
- `Geist-Variable.ttf`

## Where to get Geist

Use the official Geist font source:

- GitHub: `vercel/geist-font`
- Or Google Fonts (download as static TTF and rename to the expected names above)

## Important

- Use **TTF** or **OTF** files for PDFKit compatibility.
- Do not use only WOFF/WOFF2 files for backend PDF rendering.
- After adding files, redeploy the backend so the serverless function includes them.
