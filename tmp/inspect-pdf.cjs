const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

(async () => {
  const data = new Uint8Array(fs.readFileSync('./tmp/investor-sample.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  console.log('PAGES', doc.numPages);
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map(item => item.str).join(' | ');
    console.log('PAGE ' + i + ': ' + text.slice(0, 1600));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
