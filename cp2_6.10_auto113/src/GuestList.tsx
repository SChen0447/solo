import { useState } from 'react'
import type { Guest } from './types'

interface GuestListProps {
  guests: Guest[]
  onDragStart: (guestId: string) => void
}

export default function GuestList({ guests, onDragStart }: GuestListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDragStart = (e: React.DragEvent, guest: Guest) => {
    if (guest.assigned) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('guestId', guest.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(guest.id)
  }

  return (
    <div className="guest-panel">
      <h2>来宾列表</h2>
      <input
        type="text"
        className="search-box"
        placeholder="搜索来宾..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="guest-list">
        {filteredGuests.map((guest) => (
          <div
            key={guest.id}
            className={`guest-card${guest.assigned ? ' assigned' : ''}`}
            draggable={!guest.assigned}
            onDragStart={(e) => handleDragStart(e, guest)}
          >
            <div className="guest-avatar">{guest.avatar}</div>
            <span className="guest-name">{guest.name}</span>
          </div>
        ))}
        {filteredGuests.length === 0 && (
          <div style={{ color: '#636e72', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            未找到匹配的来宾
          </div>
        )}
      </div>
    </div>
  )
}
