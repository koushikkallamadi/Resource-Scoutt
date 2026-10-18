export function tryExportCanvas(canvas: HTMLCanvasElement): { dataUrl?: string; isTainted: boolean } {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    return { dataUrl, isTainted: false };
  } catch (err) {
    // CORS tainted canvas
    return { isTainted: true };
  }
}
