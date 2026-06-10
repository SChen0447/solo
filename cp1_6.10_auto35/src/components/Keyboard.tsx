import { useEffect, useCallback } from 'react'

interface KeyboardProps {
  pressedKeys: Set<string>
  octave: number
  onNotePlay: (pitch: string) => void
  onOctaveChange: (delta: number) => void
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEY_MAP: Record<string, string> = {
  'C': 'C#', 'D': 'D#', 'F': 'F#', 'G': 'G#', 'A': 'A#',
}
const KEY_TO_NOTE: Record<string, { note: string; isBlack: boolean }> = {
  'a': { note: 'C', isBlack: false },
  'w': { note: 'C#', isBlack: true },
  's': { note: 'D', isBlack: false },
  'e': { note: 'D#', isBlack: true },
  'd': { note: 'E', isBlack: false },
  'f': { note: 'F', isBlack: false },
  't': { note: 'F#', isBlack: true },
  'g': { note: 'G', isBlack: false },
  'y': { note: 'G#', isBlack: true },
  'h': { note: 'A', isBlack: false },
  'u': { note: 'A#', isBlack: true },
  'j': { note: 'B', isBlack: false },
  'k': { note: 'C2', isBlack: false },
  'o': { note: 'C#2', isBlack: true },
  'l': { note: 'D2', isBlack: false },
}

const DISPLAY_KEY_MAP: Record<string, string> = {
  'C': 'A', 'C#': 'W', 'D': 'S', 'D#': 'E', 'E': 'D',
  'F': 'F', 'F#': 'T', 'G': 'G', 'G#': 'Y', 'A': 'H',
  'A#': 'U', 'B': 'J',
}

export function Keyboard({ pressedKeys, octave, onNotePlay, onOctaveChange }: KeyboardProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return
    const key = e.key.toLowerCase()

    if (key === 'z') {
      onOctaveChange(-1)
      return
    }
    if (key === 'x') {
      onOctaveChange(1)
      return
    }

    const mapping = KEY_TO_NOTE[key]
    if (mapping) {
      let pitch: string
      if (mapping.note.endsWith('2')) {
        pitch = mapping.note.replace('2', '') + (octave + 1)
      } else {
        pitch = mapping.note + octave
      }
      onNotePlay(pitch)
    }
  }, [octave, onNotePlay, onOctaveChange])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const whiteKeyWidth = 52
  const whiteKeys = WHITE_KEYS.map(note => note + octave)
  const extraWhiteKeys = ['C' + (octave + 1), 'D' + (octave + 1)]
  const allWhiteKeys = [...whiteKeys, ...extraWhiteKeys]

  const handleWhiteKeyClick = (pitch: string) => {
    onNotePlay(pitch)
  }

  const handleBlackKeyClick = (pitch: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onNotePlay(pitch)
  }

  return (
    <div className="keyboard-container">
      <div className="octave-indicator">八度: {octave} (Z/X 切换)</div>
      <div className="keyboard">
        {allWhiteKeys.map((pitch, index) => {
          const displayNote = pitch.replace(String(octave), '').replace(String(octave + 1), '')
          const isPressed = pressedKeys.has(pitch)
          return (
            <div
              key={pitch}
              className={`piano-key white ${isPressed ? 'pressed' : ''}`}
              onClick={() => handleWhiteKeyClick(pitch)}
              style={{ position: 'relative' }}
            >
              <span className="key-label">{DISPLAY_KEY_MAP[displayNote] || ''}</span>
              {BLACK_KEY_MAP[displayNote] && displayNote !== 'E' && displayNote !== 'B' && (
                <div
                  className={`piano-key black ${pressedKeys.has(BLACK_KEY_MAP[displayNote] + octave) ? 'pressed' : ''}`}
                  style={{
                    left: '100%',
                    top: 0,
                  }}
                  onClick={(e) => handleBlackKeyClick(BLACK_KEY_MAP[displayNote] + octave, e)}
                >
                  <span className="key-label">{DISPLAY_KEY_MAP[BLACK_KEY_MAP[displayNote]] || ''}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
