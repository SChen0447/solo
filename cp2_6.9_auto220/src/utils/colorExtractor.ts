export function extractDominantColor(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      try {
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 128) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        if (count === 0) {
          resolve('#8B5E3C');
          return;
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const hex = '#' + [r, g, b].map(x => {
          const h = x.toString(16);
          return h.length === 1 ? '0' + h : h;
        }).join('').toUpperCase();

        resolve(hex);
      } catch (e) {
        resolve('#8B5E3C');
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

export function getComplementaryColor(hex: string): { bg: string; text: string; accent: string; line: string } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  if (brightness > 180) {
    const textR = Math.max(0, r - 80);
    const textG = Math.max(0, g - 80);
    const textB = Math.max(0, b - 80);
    const textHex = '#' + [textR, textG, textB].map(x => x.toString(16).padStart(2, '0')).join('');

    return {
      bg: hex + '15',
      text: textHex,
      accent: hex,
      line: hex + '50'
    };
  } else if (brightness > 100) {
    return {
      bg: hex + '20',
      text: '#2C1810',
      accent: hex,
      line: hex + '60'
    };
  } else {
    const bgR = Math.min(255, r + 180);
    const bgG = Math.min(255, g + 180);
    const bgB = Math.min(255, b + 180);
    const bgHex = '#' + [bgR, bgG, bgB].map(x => x.toString(16).padStart(2, '0')).join('');

    return {
      bg: bgHex,
      text: '#2C3E50',
      accent: hex,
      line: hex + '80'
    };
  }
}
