import { ref, reactive, onMounted, onUnmounted } from 'vue'

export interface Team {
  name: string
  score: number
  rounds: number
  color: string
}

export interface KillEvent {
  id: number
  killer: string
  victim: string
  team: 'blue' | 'red'
  weapon: string
  timestamp: number
  headshot: boolean
}

export interface MapPosition {
  x: number
  y: number
  player: string
  team: 'blue' | 'red'
  alive: boolean
}

export interface Player {
  id: number
  name: string
  hero: string
  health: number
  maxHealth: number
  team: 'blue' | 'red'
  alive: boolean
}

export interface StatusData {
  ping: number
  signalLevel: number
  matchTime: number
}

const HERO_NAMES = ['暗影刺客', '烈焰战士', '冰霜法师', '雷霆射手', '神圣牧师', '幽灵忍者', '巨石守卫', '风暴召唤师']
const WEAPONS = ['AK-47', 'AWP', 'M4A1', 'Desert Eagle', 'UMP-45', 'P90', 'M9 Bayonet']
const PLAYER_NAMES_BLUE = ['Blue_Alpha', 'Blue_Bravo', 'Blue_Charlie', 'Blue_Delta']
const PLAYER_NAMES_RED = ['Red_Alpha', 'Red_Bravo', 'Red_Charlie', 'Red_Delta']

let killIdCounter = 0
let animationFrameId: number | null = null

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

export function useScoreboard() {
  const blueTeam = reactive<Team>({
    name: '蓝队',
    score: 0,
    rounds: 0,
    color: '#00aaff'
  })

  const redTeam = reactive<Team>({
    name: '红队',
    score: 0,
    rounds: 0,
    color: '#ff4466'
  })

  const killEvents = ref<KillEvent[]>([])

  const mapPositions = ref<MapPosition[]>([])

  const players = ref<Player[]>([])

  const status = reactive<StatusData>({
    ping: 32,
    signalLevel: 4,
    matchTime: 1800
  })

  const scoreFlash = reactive({
    blue: false,
    red: false
  })

  function initPlayers(): void {
    const allPlayers: Player[] = []
    PLAYER_NAMES_BLUE.forEach((name, idx) => {
      allPlayers.push({
        id: idx,
        name,
        hero: randomPick(HERO_NAMES),
        health: 100,
        maxHealth: 100,
        team: 'blue',
        alive: true
      })
    })
    PLAYER_NAMES_RED.forEach((name, idx) => {
      allPlayers.push({
        id: idx + 4,
        name,
        hero: randomPick(HERO_NAMES),
        health: 100,
        maxHealth: 100,
        team: 'red',
        alive: true
      })
    })
    players.value = allPlayers
  }

  function initMapPositions(): void {
    const positions: MapPosition[] = []
    const usedPositions = new Set<string>()

    players.value.forEach((player) => {
      let x: number, y: number
      let key: string
      do {
        if (player.team === 'blue') {
          x = randomInt(0, 2)
          y = randomInt(0, 5)
        } else {
          x = randomInt(3, 5)
          y = randomInt(0, 5)
        }
        key = `${x},${y}`
      } while (usedPositions.has(key))
      usedPositions.add(key)

      positions.push({
        x,
        y,
        player: player.name,
        team: player.team,
        alive: player.alive
      })
    })

    mapPositions.value = positions
  }

  function generateKillEvent(): void {
    const aliveBlue = players.value.filter((p) => p.team === 'blue' && p.alive)
    const aliveRed = players.value.filter((p) => p.team === 'red' && p.alive)

    if (aliveBlue.length === 0 || aliveRed.length === 0) return

    const isBlueKilling = Math.random() > 0.5
    const killerTeam = isBlueKilling ? aliveBlue : aliveRed
    const victimTeam = isBlueKilling ? aliveRed : aliveBlue

    const killer = randomPick(killerTeam)
    const victim = randomPick(victimTeam)

    const event: KillEvent = {
      id: ++killIdCounter,
      killer: killer.name,
      victim: victim.name,
      team: isBlueKilling ? 'blue' : 'red',
      weapon: randomPick(WEAPONS),
      timestamp: Date.now(),
      headshot: Math.random() > 0.7
    }

    killEvents.value.unshift(event)
    if (killEvents.value.length > 5) {
      killEvents.value = killEvents.value.slice(0, 5)
    }

    victim.health = Math.max(0, victim.health - randomInt(30, 60))
    if (victim.health <= 0) {
      victim.alive = false
    }

    if (isBlueKilling) {
      blueTeam.score += randomInt(10, 25)
      scoreFlash.blue = true
      setTimeout(() => {
        scoreFlash.blue = false
      }, 800)
    } else {
      redTeam.score += randomInt(10, 25)
      scoreFlash.red = true
      setTimeout(() => {
        scoreFlash.red = false
      }, 800)
    }
  }

  function updateMapPositions(): void {
    const usedPositions = new Set<string>()

    mapPositions.value.forEach((pos) => {
      let newX = pos.x + randomInt(-1, 1)
      let newY = pos.y + randomInt(-1, 1)

      newX = Math.max(0, Math.min(5, newX))
      newY = Math.max(0, Math.min(5, newY))

      if (pos.team === 'blue') {
        newX = Math.min(2, newX)
      } else {
        newX = Math.max(3, newX)
      }

      const key = `${newX},${newY}`
      if (!usedPositions.has(key)) {
        usedPositions.add(key)
        pos.x = newX
        pos.y = newY
      } else {
        usedPositions.add(`${pos.x},${pos.y}`)
      }

      const player = players.value.find((p) => p.name === pos.player)
      if (player) {
        pos.alive = player.alive
      }
    })
  }

  function updatePlayerHealth(): void {
    players.value.forEach((player) => {
      if (player.alive && Math.random() > 0.6) {
        const delta = randomInt(-15, 10)
        player.health = Math.max(0, Math.min(100, player.health + delta))
        if (player.health <= 0) {
          player.alive = false
        }
      }
    })
  }

  function updateStatus(): void {
    status.ping = 25 + randomInt(0, 20)
    status.signalLevel = randomInt(2, 5)
    if (status.matchTime > 0) {
      status.matchTime -= 1
    }
  }

  function checkRoundEnd(): void {
    const aliveBlue = players.value.filter((p) => p.team === 'blue' && p.alive).length
    const aliveRed = players.value.filter((p) => p.team === 'red' && p.alive).length

    if (aliveBlue === 0 || aliveRed === 0) {
      if (aliveBlue === 0) {
        redTeam.rounds += 1
      } else {
        blueTeam.rounds += 1
      }

      players.value.forEach((p) => {
        p.health = 100
        p.alive = true
      })

      initMapPositions()
    }
  }

  let scoreTimer: ReturnType<typeof setInterval> | null = null
  let mapTimer: ReturnType<typeof setInterval> | null = null
  let statusTimer: ReturnType<typeof setInterval> | null = null

  function startSimulation(): void {
    initPlayers()
    initMapPositions()

    scoreTimer = setInterval(() => {
      generateKillEvent()
      updatePlayerHealth()
      checkRoundEnd()
    }, 5000)

    mapTimer = setInterval(() => {
      updateMapPositions()
    }, 10000)

    statusTimer = setInterval(() => {
      updateStatus()
    }, 1000)
  }

  function stopSimulation(): void {
    if (scoreTimer) clearInterval(scoreTimer)
    if (mapTimer) clearInterval(mapTimer)
    if (statusTimer) clearInterval(statusTimer)
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
  }

  onMounted(() => {
    startSimulation()
  })

  onUnmounted(() => {
    stopSimulation()
  })

  return {
    blueTeam,
    redTeam,
    killEvents,
    mapPositions,
    players,
    status,
    scoreFlash
  }
}
