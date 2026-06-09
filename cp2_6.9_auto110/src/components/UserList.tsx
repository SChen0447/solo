import { User } from '../types'

interface UserListProps {
  users: User[]
  currentUserId?: string
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export default function UserList({ users, currentUserId }: UserListProps) {
  return (
    <div className="user-list glass">
      <div className="user-list-title">
        在线用户 ({users.length})
      </div>
      <div className="user-list-scroll">
        {users.map((user) => (
          <div
            key={user.id}
            className="user-item"
            style={
              user.id === currentUserId
                ? { border: '1px solid rgba(255,255,255,0.3)' }
                : undefined
            }
          >
            <div
              className="user-avatar"
              style={{ background: user.color }}
            >
              {getInitial(user.name)}
            </div>
            <span className="user-name">
              {user.name}
              {user.id === currentUserId && ' (我)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
