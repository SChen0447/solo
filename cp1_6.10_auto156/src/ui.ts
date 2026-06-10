import { JointName, JOINT_NAMES, JOINT_DISPLAY_NAMES } from './skeleton'

export interface Pose {
  id: number
  name: string
  angles: Record<JointName, number>
}

export type UpdateJointCallback = (name: JointName, angle: number) => void
export type PlaySequenceCallback = () => void
export type StopSequenceCallback = () => void
export type ApplyPoseCallback = (pose: Pose) => void

const STORAGE_KEY = 'joint_simulator_poses'
const MAX_POSES = 5

export class UI {
  private onUpdateJoint: UpdateJointCallback
  private onPlaySequence: PlaySequenceCallback
  private onStopSequence: StopSequenceCallback
  private onApplyPose: ApplyPoseCallback

  private jointControls: Record<JointName, {
    slider: HTMLInputElement
    label: HTMLElement
  }>

  private posesContainer: HTMLElement
  private savePoseBtn: HTMLElement
  private playSequenceBtn: HTMLElement
  private stopSequenceBtn: HTMLElement
  private progressBar: HTMLElement

  private poses: Pose[]
  private longPressTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    onUpdateJoint: UpdateJointCallback,
    onPlaySequence: PlaySequenceCallback,
    onStopSequence: StopSequenceCallback,
    onApplyPose: ApplyPoseCallback
  ) {
    this.onUpdateJoint = onUpdateJoint
    this.onPlaySequence = onPlaySequence
    this.onStopSequence = onStopSequence
    this.onApplyPose = onApplyPose

    this.jointControls = {} as Record<JointName, { slider: HTMLInputElement; label: HTMLElement }>

    const jointControlsEl = document.getElementById('joint-controls')!
    this.posesContainer = document.getElementById('poses-container')!
    this.savePoseBtn = document.getElementById('save-pose-btn')!
    this.playSequenceBtn = document.getElementById('play-sequence-btn')!
    this.stopSequenceBtn = document.getElementById('stop-sequence-btn')!
    this.progressBar = document.getElementById('progress-bar')!

    this.poses = []

    this.buildJointControls(jointControlsEl)
    this.bindEvents()
    this.loadPoses()
    this.renderPoses()
  }

  private buildJointControls(container: HTMLElement): void {
    JOINT_NAMES.forEach(name => {
      const controlDiv = document.createElement('div')
      controlDiv.className = 'joint-control'

      const header = document.createElement('div')
      header.className = 'joint-header'

      const nameLabel = document.createElement('span')
      nameLabel.className = 'joint-name'
      nameLabel.textContent = JOINT_DISPLAY_NAMES[name]

      const angleLabel = document.createElement('span')
      angleLabel.className = 'joint-angle'
      angleLabel.textContent = '0°'

      header.appendChild(nameLabel)
      header.appendChild(angleLabel)

      const sliderContainer = document.createElement('div')
      sliderContainer.className = 'slider-container'

      const slider = document.createElement('input')
      slider.type = 'range'
      slider.min = '-90'
      slider.max = '90'
      slider.step = '1'
      slider.value = '0'

      sliderContainer.appendChild(slider)
      controlDiv.appendChild(header)
      controlDiv.appendChild(sliderContainer)
      container.appendChild(controlDiv)

      this.jointControls[name] = { slider, label: angleLabel }
    })
  }

  private bindEvents(): void {
    JOINT_NAMES.forEach(name => {
      const { slider, label } = this.jointControls[name]
      slider.addEventListener('input', () => {
        const value = parseInt(slider.value, 10)
        label.textContent = `${value}°`
        this.onUpdateJoint(name, value)
      })
    })

    this.playSequenceBtn.addEventListener('click', () => {
      this.playSequenceBtn.style.display = 'none'
      this.stopSequenceBtn.style.display = 'inline-block'
      this.onPlaySequence()
    })

    this.stopSequenceBtn.addEventListener('click', () => {
      this.stopSequenceBtn.style.display = 'none'
      this.playSequenceBtn.style.display = 'inline-block'
      this.onStopSequence()
    })

    this.savePoseBtn.addEventListener('click', () => {
      this.saveCurrentPose()
    })
  }

  public updateJointAngle(name: JointName, angle: number): void {
    const { slider, label } = this.jointControls[name]
    const rounded = Math.round(angle)
    if (parseInt(slider.value, 10) !== rounded) {
      slider.value = rounded.toString()
    }
    label.textContent = `${rounded}°`
  }

  public setProgress(progress: number): void {
    this.progressBar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`
  }

  public resetPlayButtons(): void {
    this.stopSequenceBtn.style.display = 'none'
    this.playSequenceBtn.style.display = 'inline-block'
  }

  public getCurrentAnglesFromUI(): Record<JointName, number> {
    const angles = {} as Record<JointName, number>
    JOINT_NAMES.forEach(name => {
      angles[name] = parseInt(this.jointControls[name].slider.value, 10)
    })
    return angles
  }

  private saveCurrentPose(): void {
    if (this.poses.length >= MAX_POSES) {
      alert(`最多只能保存 ${MAX_POSES} 组姿势`)
      return
    }

    const angles = this.getCurrentAnglesFromUI()
    const newPose: Pose = {
      id: Date.now(),
      name: `姿势${this.poses.length + 1}`,
      angles
    }

    this.poses.push(newPose)
    this.savePoses()
    this.renderPoses()

    this.savePoseBtn.classList.add('saved')
    setTimeout(() => {
      this.savePoseBtn.classList.remove('saved')
    }, 200)
  }

  private loadPoses(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.poses = JSON.parse(stored)
      }
    } catch (e) {
      console.error('加载姿势失败:', e)
      this.poses = []
    }
  }

  private savePoses(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.poses))
    } catch (e) {
      console.error('保存姿势失败:', e)
    }
  }

  private renderPoses(): void {
    this.posesContainer.innerHTML = ''

    if (this.poses.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty-poses'
      empty.textContent = '暂无保存的姿势'
      this.posesContainer.appendChild(empty)
      return
    }

    this.poses.forEach((pose, index) => {
      const card = document.createElement('div')
      card.className = 'pose-card'
      card.textContent = pose.name

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'pose-delete-btn'
      deleteBtn.textContent = '×'
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.deletePose(index)
      })
      card.appendChild(deleteBtn)

      card.addEventListener('click', () => {
        if (!card.classList.contains('show-delete')) {
          this.onApplyPose(pose)
        }
      })

      card.addEventListener('mousedown', (e) => {
        this.longPressTimer = setTimeout(() => {
          card.classList.add('show-delete')
          setTimeout(() => {
            card.classList.remove('show-delete')
          }, 3000)
        }, 500)
      })

      card.addEventListener('mouseup', () => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer)
          this.longPressTimer = null
        }
      })

      card.addEventListener('mouseleave', () => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer)
          this.longPressTimer = null
        }
        card.classList.remove('show-delete')
      })

      card.addEventListener('touchstart', (e) => {
        this.longPressTimer = setTimeout(() => {
          card.classList.add('show-delete')
          setTimeout(() => {
            card.classList.remove('show-delete')
          }, 3000)
        }, 500)
      })

      card.addEventListener('touchend', () => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer)
          this.longPressTimer = null
        }
      })

      this.posesContainer.appendChild(card)
    })
  }

  private deletePose(index: number): void {
    this.poses.splice(index, 1)
    this.poses.forEach((pose, i) => {
      pose.name = `姿势${i + 1}`
    })
    this.savePoses()
    this.renderPoses()
  }
}
