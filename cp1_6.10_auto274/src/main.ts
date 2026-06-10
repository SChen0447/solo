import { NoteManager, LANE_KEYS, type GameState } from './noteManager'
import { Renderer } from './renderer'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const scoreEl = document.getElementById('score') as HTMLDivElement
const comboEl = document.getElementById('combo') as HTMLDivElement
const phaseBarEl = document.getElementById('phase-bar') as HTMLDivElement
const phaseLabelEl = document.getElementById('phase-label') as HTMLDivElement
const gameOverEl = document.getElementById('game-over') as HTMLDivElement
const finalScoreEl = document.getElementById('final-score') as HTMLDivElement
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement
const keyBoxes = document.querySelectorAll('.key-box') as NodeListOf<HTMLDivElement>

const initialState: GameState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  consecutiveMisses: 0,
  phase: 1,
  phaseTime: 0,
  gameOver: false,
  notes: [],
  particles: [],
  effects: [],
  keyStates: { a: false, s: false, d: false, f: false },
  lastScoreMilestone: 0
}

const noteManager = new NoteManager({ ...initialState, notes: [], particles: [], effects: [], keyStates: { ...initialState.keyStates } })
const renderer = new Renderer(canvas)
noteManager.setJudgeLineY(renderer.getJudgeLineY())

let lastTime = 0
let rafId = 0

function updateHUD(): void {
  const state = noteManager.getState()
  scoreEl.textContent = state.score.toString()
  comboEl.textContent = `Combo: ${state.combo}`
  if (state.combo > 10) {
    scoreEl.classList.add('gold')
  } else {
    scoreEl.classList.remove('gold')
  }
  const phaseProgress = Math.min(100, (state.phaseTime / 30000) * 100)
  phaseBarEl.style.width = phaseProgress + '%'
  phaseLabelEl.textContent = `阶段 ${state.phase}`

  if (state.gameOver) {
    gameOverEl.classList.add('visible')
    finalScoreEl.textContent = `最终分数: ${state.score}`
  } else {
    gameOverEl.classList.remove('visible')
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = lastTime === 0 ? 16 : currentTime - lastTime
  lastTime = currentTime

  noteManager.update(deltaTime, currentTime)
  renderer.render(noteManager.getState(), currentTime)
  updateHUD()

  rafId = requestAnimationFrame(gameLoop)
}

function onKeyDown(e: KeyboardEvent): void {
  const key = e.key.toLowerCase()
  if (!LANE_KEYS.includes(key as typeof LANE_KEYS[number])) return
  if (noteManager.getState().keyStates[key]) return

  noteManager.getState().keyStates[key] = true
  noteManager.handleKeyPress(key)

  keyBoxes.forEach(box => {
    if (box.dataset.key === key) {
      box.classList.add(`active-${key}`)
    }
  })
}

function onKeyUp(e: KeyboardEvent): void {
  const key = e.key.toLowerCase()
  if (!LANE_KEYS.includes(key as typeof LANE_KEYS[number])) return

  noteManager.getState().keyStates[key] = false
  noteManager.handleKeyRelease(key)

  keyBoxes.forEach(box => {
    if (box.dataset.key === key) {
      box.classList.remove(`active-${key}`)
    }
  })
}

function onRestart(): void {
  noteManager.reset()
  noteManager.setJudgeLineY(renderer.getJudgeLineY())
  lastTime = 0
  keyBoxes.forEach(box => {
    LANE_KEYS.forEach(k => box.classList.remove(`active-${k}`))
  })
}

window.addEventListener('keydown', onKeyDown)
window.addEventListener('keyup', onKeyUp)
restartBtn.addEventListener('click', onRestart)

rafId = requestAnimationFrame(gameLoop)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    restartBtn.removeEventListener('click', onRestart)
  })
}
