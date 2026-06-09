import type { YearSummary } from './data';

export type YearChangeCallback = (year: number) => void;

export class TimelineController {
  private slider: HTMLInputElement;
  private yearDisplay: HTMLElement;
  private summaryDisplay: HTMLElement;
  private yearSummaries: YearSummary[];
  private currentYear: number;
  private typewriterTimer: ReturnType<typeof setTimeout> | null = null;
  private callback: YearChangeCallback | null = null;

  constructor(yearSummaries: YearSummary[]) {
    this.yearSummaries = yearSummaries;
    this.slider = document.getElementById('timeline-slider') as HTMLInputElement;
    this.yearDisplay = document.getElementById('timeline-year') as HTMLElement;
    this.summaryDisplay = document.getElementById('event-summary') as HTMLElement;
    this.currentYear = parseInt(this.slider.value, 10);

    this.init();
  }

  private init(): void {
    this.updateYearDisplay(this.currentYear);
    this.showSummary(this.findClosestSummary(this.currentYear).summary);

    this.slider.addEventListener('input', (e) => {
      const year = parseInt((e.target as HTMLInputElement).value, 10);
      if (year !== this.currentYear) {
        this.currentYear = year;
        this.updateYearDisplay(year);
      }
    });

    this.slider.addEventListener('change', (e) => {
      const year = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentYear = year;
      this.updateYearDisplay(year);
      const summary = this.findClosestSummary(year).summary;
      this.showSummary(summary);
      if (this.callback) {
        this.callback(year);
      }
    });
  }

  private findClosestSummary(year: number): YearSummary {
    let closest = this.yearSummaries[0];
    let minDiff = Math.abs(year - closest.year);

    for (const summary of this.yearSummaries) {
      const diff = Math.abs(year - summary.year);
      if (diff < minDiff) {
        minDiff = diff;
        closest = summary;
      }
    }

    return closest;
  }

  private updateYearDisplay(year: number): void {
    const prefix = year >= 0 ? '公元 ' : '公元前 ';
    const displayYear = year >= 0 ? year : -year;
    this.yearDisplay.textContent = `${prefix}${displayYear} 年`;
  }

  private showSummary(text: string): void {
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }

    this.summaryDisplay.textContent = '';
    let index = 0;

    const type = (): void => {
      if (index < text.length) {
        this.summaryDisplay.textContent += text.charAt(index);
        index++;
        this.typewriterTimer = setTimeout(type, 30);
      }
    };

    type();
  }

  public onYearChange(callback: YearChangeCallback): void {
    this.callback = callback;
  }

  public getCurrentYear(): number {
    return this.currentYear;
  }
}
