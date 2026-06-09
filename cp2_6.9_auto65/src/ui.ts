export interface UIParams {
  moistureSeed: number
  nutrientSeed: number
  consumptionRate: number
  branchInterval: number
}

export interface UICallbacks {
  onMoistureSeedChange: (value: number) => void
  onNutrientSeedChange: (value: number) => void
  onConsumptionRateChange: (value: number) => void
  onBranchIntervalChange: (value: number) => void
  onToggle: () => void
  onReset: () => void
}

export class UI {
  private moistureSeedSlider: HTMLInputElement
  private moistureSeedValue: HTMLElement
  private nutrientSeedSlider: HTMLInputElement
  private nutrientSeedValue: HTMLElement
  private consumptionRateSlider: HTMLInputElement
  private consumptionRateValue: HTMLElement
  private branchIntervalSlider: HTMLInputElement
  private branchIntervalValue: HTMLElement
  private toggleBtn: HTMLButtonElement
  private resetBtn: HTMLButtonElement
  private totalLengthEl: HTMLElement
  private branchCountEl: HTMLElement
  private waterConsumptionEl: HTMLElement

  constructor(callbacks: UICallbacks) {
    this.moistureSeedSlider = document.getElementById('moistureSeed') as HTMLInputElement
    this.moistureSeedValue = document.getElementById('moistureSeedValue') as HTMLElement
    this.nutrientSeedSlider = document.getElementById('nutrientSeed') as HTMLInputElement
    this.nutrientSeedValue = document.getElementById('nutrientSeedValue') as HTMLElement
    this.consumptionRateSlider = document.getElementById('consumptionRate') as HTMLInputElement
    this.consumptionRateValue = document.getElementById('consumptionRateValue') as HTMLElement
    this.branchIntervalSlider = document.getElementById('branchInterval') as HTMLInputElement
    this.branchIntervalValue = document.getElementById('branchIntervalValue') as HTMLElement
    this.toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
    this.totalLengthEl = document.getElementById('totalLength') as HTMLElement
    this.branchCountEl = document.getElementById('branchCount') as HTMLElement
    this.waterConsumptionEl = document.getElementById('waterConsumption') as HTMLElement

    this.moistureSeedSlider.addEventListener('input', () => {
      const v = parseInt(this.moistureSeedSlider.value)
      this.moistureSeedValue.textContent = String(v)
      callbacks.onMoistureSeedChange(v)
    })

    this.nutrientSeedSlider.addEventListener('input', () => {
      const v = parseInt(this.nutrientSeedSlider.value)
      this.nutrientSeedValue.textContent = String(v)
      callbacks.onNutrientSeedChange(v)
    })

    this.consumptionRateSlider.addEventListener('input', () => {
      const v = parseFloat(this.consumptionRateSlider.value)
      this.consumptionRateValue.textContent = v.toFixed(2)
      callbacks.onConsumptionRateChange(v)
    })

    this.branchIntervalSlider.addEventListener('input', () => {
      const v = parseInt(this.branchIntervalSlider.value)
      this.branchIntervalValue.textContent = String(v)
      callbacks.onBranchIntervalChange(v)
    })

    this.toggleBtn.addEventListener('click', callbacks.onToggle)
    this.resetBtn.addEventListener('click', callbacks.onReset)
  }

  setToggleButtonState(running: boolean): void {
    this.toggleBtn.textContent = running ? '暂停生长' : '开始生长'
  }

  updateStatus(totalLength: number, branchCount: number, avgWaterConsumption: number): void {
    this.totalLengthEl.textContent = `${Math.round(totalLength)} px`
    this.branchCountEl.textContent = String(branchCount)
    this.waterConsumptionEl.textContent = avgWaterConsumption.toFixed(3)
  }

  getParams(): UIParams {
    return {
      moistureSeed: parseInt(this.moistureSeedSlider.value),
      nutrientSeed: parseInt(this.nutrientSeedSlider.value),
      consumptionRate: parseFloat(this.consumptionRateSlider.value),
      branchInterval: parseInt(this.branchIntervalSlider.value)
    }
  }
}
