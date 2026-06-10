import { ParticleSystem } from './particleSystem'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const particleSystem = new ParticleSystem(canvas)

function animate(): void {
  particleSystem.update()
  particleSystem.draw()
  requestAnimationFrame(animate)
}

animate()

window.addEventListener('resize', () => {
  particleSystem.resize()
  particleSystem.createParticles()
})

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  particleSystem.setMousePosition(e.clientX, e.clientY)
})

canvas.addEventListener('mouseenter', () => {
  particleSystem.setMouseActive(true)
})

canvas.addEventListener('mouseleave', () => {
  particleSystem.setMouseActive(false)
})

canvas.addEventListener('click', (e: MouseEvent) => {
  particleSystem.triggerExplosion(e.clientX, e.clientY)
})

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault()
  if (e.touches.length > 0) {
    particleSystem.setMousePosition(e.touches[0].clientX, e.touches[0].clientY)
  }
}, { passive: false })

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  if (e.touches.length > 0) {
    particleSystem.setMousePosition(e.touches[0].clientX, e.touches[0].clientY)
    particleSystem.setMouseActive(true)
  }
})

canvas.addEventListener('touchend', () => {
  particleSystem.setMouseActive(false)
})
