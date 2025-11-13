// src/services/pdfMergerBridge.cjs
async function loadPdfMerger() {
  // Native ESM dynamic import
  const mod = await import('pdf-merger-js');
  const PDFMerger = mod.default || mod;
  return PDFMerger;
}

module.exports = { loadPdfMerger };
