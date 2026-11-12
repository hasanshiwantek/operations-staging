// Turns a generated PDF into a JPG that looks exactly like it, by drawing each
// page with PDF.js. PDF.js (~1 MB) is only downloaded the first time this runs.

// 3x the PDF's 72 dpi ≈ 216 dpi: sharp text when printed or zoomed
const RENDER_SCALE = 3;
// Browsers refuse canvases much taller than this; long slips render smaller
const MAX_CANVAS_HEIGHT = 30000;
const JPG_QUALITY = 0.92;

let pdfjsPromise = null;
const loadPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ])
      .then(([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfjs;
      })
      .catch((err) => {
        pdfjsPromise = null; // try again next time
        throw err;
      });
  }
  return pdfjsPromise;
};

// PDF blob → JPG blob; a multi-page PDF becomes one tall image, pages stacked
export const pdfToJpgBlob = async (pdfBlob) => {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: await pdfBlob.arrayBuffer() })
    .promise;
  try {
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n += 1) pages.push(await pdf.getPage(n));

    const fullHeight = pages.reduce(
      (sum, page) => sum + page.getViewport({ scale: RENDER_SCALE }).height,
      0,
    );
    const scale = Math.min(
      RENDER_SCALE,
      (RENDER_SCALE * MAX_CANVAS_HEIGHT) / fullHeight,
    );

    const viewports = pages.map((page) => page.getViewport({ scale }));
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(Math.max(...viewports.map((v) => v.width)));
    canvas.height = Math.ceil(viewports.reduce((sum, v) => sum + v.height, 0));
    const ctx = canvas.getContext("2d");
    // JPG has no transparency: paper-white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Each page on its own canvas (PDF.js paints the whole canvas white before
    // drawing), then copied below the previous one
    let top = 0;
    for (let i = 0; i < pages.length; i += 1) {
      const viewport = viewports[i];
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = Math.ceil(viewport.width);
      pageCanvas.height = Math.ceil(viewport.height);
      await pages[i].render({
        canvasContext: pageCanvas.getContext("2d"),
        viewport,
      }).promise;
      ctx.drawImage(pageCanvas, 0, Math.round(top));
      top += viewport.height;
    }

    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("The JPG could not be made")),
        "image/jpeg",
        JPG_QUALITY,
      ),
    );
  } finally {
    pdf.destroy();
  }
};

// Saves a blob as a file download
export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
