export function setupControls(onReset: () => void, onExport: () => void): void {
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      btnReset.textContent = '重置中...';
      btnReset.classList.add('disabled');

      setTimeout(() => {
        onReset();

        setTimeout(() => {
          btnReset.textContent = '重置织机';
          btnReset.classList.remove('disabled');
        }, 500);
      }, 300);
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const originalText = btnExport.textContent;
      btnExport.textContent = '导出中...';
      btnExport.classList.add('disabled');

      setTimeout(() => {
        onExport();
        btnExport.textContent = '已导出 ✓';

        setTimeout(() => {
          btnExport.textContent = originalText;
          btnExport.classList.remove('disabled');
        }, 1500);
      }, 200);
    });
  }
}
