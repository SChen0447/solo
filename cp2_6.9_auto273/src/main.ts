import { Cauldron } from './cauldron'
import { PotionShelf } from './potionShelf'
import { getRandomRecipe, type Potion, type Recipe, type ReactionResult, POTIONS } from './recipeBook'

const MAX_POTIONS = 3

class Game {
  private cauldron!: Cauldron
  private shelf!: PotionShelf
  private score: number = 0
  private combo: number = 0
  private targetRecipe!: Recipe
  private cauldronCanvas!: HTMLCanvasElement
  private scoreEl!: HTMLElement
  private comboEl!: HTMLElement
  private recipeNameEl!: HTMLElement
  private recipeColorsEl!: HTMLElement
  private progressEl!: HTMLElement
  private progressTextEl!: HTMLElement
  private resetBtn!: HTMLElement
  private messageEl!: HTMLElement

  init(): void {
    this.cauldronCanvas = document.getElementById('cauldron-canvas') as HTMLCanvasElement
    this.scoreEl = document.getElementById('score') as HTMLElement
    this.comboEl = document.getElementById('combo') as HTMLElement
    this.recipeNameEl = document.getElementById('recipe-name') as HTMLElement
    this.recipeColorsEl = document.getElementById('recipe-colors') as HTMLElement
    this.progressEl = document.getElementById('progress-bar') as HTMLElement
    this.progressTextEl = document.getElementById('progress-text') as HTMLElement
    this.resetBtn = document.getElementById('reset-btn') as HTMLElement
    this.messageEl = document.getElementById('message') as HTMLElement

    this.cauldron = new Cauldron(this.cauldronCanvas)
    this.cauldron.setOnReactionComplete(this.onReactionComplete.bind(this))
    this.cauldron.start()

    const shelfContainer = document.getElementById('shelf') as HTMLElement
    this.shelf = new PotionShelf(shelfContainer)
    this.shelf.setOnPotionSelected(this.onPotionSelected.bind(this))
    this.shelf.setCauldronZoneChecker(this.checkCauldronZone.bind(this))

    this.resetBtn.addEventListener('click', () => this.reset())
    this.resetBtn.addEventListener('mousedown', (e) => {
      (e.currentTarget as HTMLElement).classList.add('pressed')
    })
    this.resetBtn.addEventListener('mouseup', () => {
      this.resetBtn.classList.remove('pressed')
    })
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.classList.remove('pressed')
    })

    this.targetRecipe = getRandomRecipe()
    this.updateUI()
  }

  private checkCauldronZone(x: number, y: number): boolean {
    const rect = this.cauldronCanvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const rx = 160 * (rect.width / 320)
    const ry = 160 * (rect.height / 320)
    const dx = (x - cx) / rx
    const dy = (y - cy) / ry
    return dx * dx + dy * dy <= 1
  }

  private onPotionSelected(potion: Potion): void {
    if (this.cauldron.getPotions().length >= MAX_POTIONS) return

    this.cauldron.addPotion(potion)
    this.updateUI()

    const potions = this.cauldron.getPotions()
    if (potions.length >= 2) {
      const result = this.cauldron.processReaction()
      if (result && !result.matched && potions.length >= 2) {
        this.showMessage('咕嘟咕嘟...没反应', 'fail')
      }
    }
  }

  private onReactionComplete(result: ReactionResult): void {
    if (result.matched && result.recipeName) {
      const isTarget = result.recipeName === this.targetRecipe.name
      if (isTarget) {
        this.score += 100
        this.combo += 1
        if (this.combo > 1) {
          this.score += 50
        }
        this.showMessage(`✨ ${result.recipeName} 炼成成功！+${this.combo > 1 ? 150 : 100}分`, 'success')
        setTimeout(() => {
          this.cauldron.reset()
          this.targetRecipe = getRandomRecipe()
          this.updateUI()
        }, 1200)
      } else {
        this.combo = 0
        this.showMessage(`炼成了 ${result.recipeName}，但不是目标配方`, 'warn')
        setTimeout(() => {
          this.cauldron.reset()
          this.updateUI()
        }, 1500)
      }
    } else if (result.animationType === 'bubble' && this.cauldron.getPotions().length === 1) {
      // 单瓶倒入完成气泡
    } else if (!result.matched && this.cauldron.getPotions().length >= 2) {
      this.combo = 0
      this.showMessage('咕嘟咕嘟...没反应', 'fail')
      setTimeout(() => {
        this.cauldron.reset()
        this.updateUI()
      }, 1000)
    }
  }

  private showMessage(text: string, type: 'success' | 'fail' | 'warn'): void {
    this.messageEl.textContent = text
    this.messageEl.className = 'message visible ' + type
    if (type === 'fail') {
      this.messageEl.classList.add('shake')
    }
    setTimeout(() => {
      this.messageEl.classList.remove('visible', 'shake')
    }, type === 'fail' ? 800 : 1500)
  }

  private reset(): void {
    this.cauldron.reset()
    this.score = 0
    this.combo = 0
    this.targetRecipe = getRandomRecipe()
    this.updateUI()
    this.showMessage('🔄 已重置，新的配方挑战开始！', 'warn')
  }

  private updateUI(): void {
    this.scoreEl.textContent = this.score.toString()
    if (this.combo > 1) {
      this.comboEl.textContent = `${this.combo} 连击！`
      this.comboEl.style.display = 'block'
    } else {
      this.comboEl.style.display = 'none'
    }

    this.recipeNameEl.textContent = `目标：${this.targetRecipe.name}`
    this.recipeColorsEl.innerHTML = ''
    this.targetRecipe.colors.forEach(color => {
      const dot = document.createElement('span')
      dot.className = 'color-dot'
      dot.style.backgroundColor = color
      this.recipeColorsEl.appendChild(dot)
    })

    const count = this.cauldron.getPotions().length
    const percent = (count / MAX_POTIONS) * 100
    this.progressEl.style.width = percent + '%'
    this.progressTextEl.textContent = `${count}/${MAX_POTIONS}`
  }
}

const game = new Game()
document.addEventListener('DOMContentLoaded', () => {
  game.init()
  void POTIONS
})
