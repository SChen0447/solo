import { toPng } from 'html-to-image';

export async function exportAsWallpaper(element: HTMLElement): Promise<void> {
  const dataUrl = await toPng(element, {
    width: 1080,
    height: 1920,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#FFF8E7'
  });
  downloadImage(dataUrl, `travelogue-wallpaper-${Date.now()}.png`);
}

export async function exportAsSquare(element: HTMLElement): Promise<void> {
  const dataUrl = await toPng(element, {
    width: 1080,
    height: 1080,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#FFF8E7'
  });
  downloadImage(dataUrl, `travelogue-share-${Date.now()}.png`);
}

function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
