import html2canvas from 'html2canvas';

export async function exportPosterAsPNG(
  canvasElement: HTMLCanvasElement,
  scale: number = 2
): Promise<void> {
  const canvas = await html2canvas(canvasElement, {
    scale: scale,
    useCORS: true,
    backgroundColor: null,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const blob = dataURLtoBlob(dataUrl);
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `poster-${timestamp}.png`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
