export const EXAMPLES: Record<string, string> = {
  ifelse: `function checkNumber(n) {
  if (n > 0) {
    console.log("正数");
    return "positive";
  } else if (n < 0) {
    console.log("负数");
    return "negative";
  } else {
    console.log("零");
    return "zero";
  }
}`,

  forloop: `function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum = sum + arr[i];
  }
  return sum;
}`,

  recursive: `function factorial(n) {
  if (n <= 1) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}`
};

export interface EditorPanelCallbacks {
  onGenerate: (code: string) => void;
}

export class EditorPanel {
  private textarea: HTMLTextAreaElement;
  private generateBtn: HTMLButtonElement;
  private exampleBtns: NodeListOf<HTMLButtonElement>;
  private callbacks: EditorPanelCallbacks;

  constructor(callbacks: EditorPanelCallbacks) {
    const textarea = document.getElementById('codeEditor') as HTMLTextAreaElement;
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    const exampleBtns = document.querySelectorAll('.examples button') as NodeListOf<HTMLButtonElement>;

    if (!textarea || !generateBtn) {
      throw new Error('Editor elements not found');
    }

    this.textarea = textarea;
    this.generateBtn = generateBtn;
    this.exampleBtns = exampleBtns;
    this.callbacks = callbacks;

    this.setupEventListeners();
    this.loadExample('ifelse');
  }

  private setupEventListeners(): void {
    this.generateBtn.addEventListener('click', () => {
      this.callbacks.onGenerate(this.textarea.value);
    });

    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.callbacks.onGenerate(this.textarea.value);
      }
    });

    this.exampleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const example = btn.dataset.example;
        if (example) {
          this.loadExample(example);
        }
      });
    });
  }

  public loadExample(name: string): void {
    const code = EXAMPLES[name];
    if (code) {
      this.textarea.value = code;
    }
  }

  public getCode(): string {
    return this.textarea.value;
  }

  public setCode(code: string): void {
    this.textarea.value = code;
  }
}
