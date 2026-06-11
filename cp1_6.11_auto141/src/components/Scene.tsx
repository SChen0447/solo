import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useSnapshot } from 'valtio'
import { appState, updateFlowerPosition, selectFlower } from '@/store/appState'
import { createVaseGeometry, createVaseMaterial, getVaseTopY, getVaseOpeningRadius } from '@/utils/vaseUtils'
import { createFlower, createSelectionRing } from '@/utils/flowerUtils'
import gsap from 'gsap'

interface FlowerMeshData {
  mesh: THREE.Group
  flowerId: string
  targetPosition: THREE.Vector3
}

const Scene = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const vaseMeshRef = useRef<THREE.Mesh | null>(null)
  const flowerMeshesRef = useRef<Map<string, FlowerMeshData>>(new Map())
  const selectionRingRef = useRef<THREE.Mesh | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const isDraggingRef = useRef(false)
  const draggedFlowerIdRef = useRef<string | null>(null)
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane())
  const animationIdRef = useRef<number>(0)

  const snap = useSnapshot(appState)

  const initScene = useCallback(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfaf3e0)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 1, 5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 15
    controls.maxPolarAngle = Math.PI / 2 + 0.3
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(3, 5, 3)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 20
    mainLight.shadow.camera.left = -5
    mainLight.shadow.camera.right = 5
    mainLight.shadow.camera.top = 5
    mainLight.shadow.camera.bottom = -5
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xfff0e0, 0.4)
    fillLight.position.set(-3, 2, -2)
    scene.add(fillLight)

    const pointLight = new THREE.PointLight(0xffeedd, 0.5, 10)
    pointLight.position.set(0, 2, 2)
    scene.add(pointLight)

    const groundGeometry = new THREE.CircleGeometry(8, 64)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8dcc8,
      roughness: 0.9
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1.2
    ground.receiveShadow = true
    scene.add(ground)

    const vaseGeometry = createVaseGeometry(snap.vaseType)
    const vaseMaterial = createVaseMaterial()
    const vase = new THREE.Mesh(vaseGeometry, vaseMaterial)
    vase.position.y = -1.0
    vase.castShadow = true
    vase.receiveShadow = true
    scene.add(vase)
    vaseMeshRef.current = vase

    const selectionRing = createSelectionRing()
    selectionRing.visible = false
    scene.add(selectionRing)
    selectionRingRef.current = selectionRing

    snap.flowers.forEach(flower => {
      addFlowerMesh(flower.id, flower.flowerType, flower.stemHeight, flower.position.x, flower.position.z, flower.rotation)
    })

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationIdRef.current)
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  const addFlowerMesh = useCallback((
    flowerId: string,
    flowerType: string,
    stemHeight: number,
    x: number,
    z: number,
    rotation: number
  ) => {
    if (!sceneRef.current) return

    const flowerGroup = createFlower(flowerType, stemHeight, 0.02)
    const topY = getVaseTopY(snap.vaseType)
    flowerGroup.position.set(x, topY, z)
    flowerGroup.rotation.y = (rotation * Math.PI) / 180
    flowerGroup.userData.flowerId = flowerId

    flowerGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.flowerId = flowerId
      }
    })

    sceneRef.current.add(flowerGroup)
    flowerMeshesRef.current.set(flowerId, {
      mesh: flowerGroup,
      flowerId,
      targetPosition: new THREE.Vector3(x, topY, z)
    })

    flowerGroup.scale.set(0, 0, 0)
    gsap.to(flowerGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.6,
      ease: 'back.out(1.7)'
    })
  }, [snap.vaseType])

  const removeFlowerMesh = useCallback((flowerId: string) => {
    const flowerData = flowerMeshesRef.current.get(flowerId)
    if (flowerData && sceneRef.current) {
      gsap.to(flowerData.mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          if (sceneRef.current) {
            sceneRef.current.remove(flowerData.mesh)
          }
          flowerMeshesRef.current.delete(flowerId)
        }
      })
    }
  }, [])

  const updateVase = useCallback(() => {
    if (!vaseMeshRef.current || !sceneRef.current) return

    const oldVase = vaseMeshRef.current
    
    const rippleGeometry = new THREE.RingGeometry(0.1, 0.15, 64)
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)
    ripple.rotation.x = -Math.PI / 2
    ripple.position.copy(oldVase.position)
    ripple.position.y += getVaseTopY(snap.vaseType) + 0.1
    sceneRef.current.add(ripple)

    gsap.to(ripple.scale, {
      x: 5,
      y: 5,
      z: 5,
      duration: 0.6,
      ease: 'power2.out'
    })
    gsap.to(rippleMaterial, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        if (sceneRef.current) {
          sceneRef.current.remove(ripple)
        }
      }
    })

    gsap.to(oldVase.scale, {
      x: 0.8,
      y: 0.8,
      z: 0.8,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        const newGeometry = createVaseGeometry(snap.vaseType)
        oldVase.geometry.dispose()
        oldVase.geometry = newGeometry

        gsap.to(oldVase.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.25,
          ease: 'back.out(1.5)'
        })

        const topY = getVaseTopY(snap.vaseType)
        flowerMeshesRef.current.forEach((data, flowerId) => {
          const flower = snap.flowers.find(f => f.id === flowerId)
          if (flower) {
            gsap.to(data.mesh.position, {
              y: topY,
              duration: 0.5,
              ease: 'power2.out'
            })
            data.targetPosition.y = topY
          }
        })
      }
    })
  }, [snap.vaseType, snap.flowers])

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

    const flowerMeshes = Array.from(flowerMeshesRef.current.values()).map(d => d.mesh)
    const intersects = raycasterRef.current.intersectObjects(flowerMeshes, true)

    if (intersects.length > 0) {
      let flowerId: string | null = null
      for (const intersect of intersects) {
        let obj: THREE.Object3D | null = intersect.object
        while (obj) {
          if (obj.userData.flowerId) {
            flowerId = obj.userData.flowerId
            break
          }
          obj = obj.parent
        }
        if (flowerId) break
      }

      if (flowerId) {
        selectFlower(flowerId)
        isDraggingRef.current = true
        draggedFlowerIdRef.current = flowerId
        controlsRef.current!.enabled = false

        const topY = getVaseTopY(snap.vaseType)
        dragPlaneRef.current.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, topY, 0)
        )

        const flowerData = flowerMeshesRef.current.get(flowerId)
        if (flowerData && selectionRingRef.current) {
          selectionRingRef.current.position.copy(flowerData.mesh.position)
          selectionRingRef.current.position.y += 0.05
          selectionRingRef.current.visible = true
        }
      }
    } else {
      selectFlower(null)
      if (selectionRingRef.current) {
        selectionRingRef.current.visible = false
      }
    }
  }, [snap.vaseType])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !isDraggingRef.current || !draggedFlowerIdRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

    const intersectPoint = new THREE.Vector3()
    raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint)

    if (intersectPoint) {
      const maxRadius = getVaseOpeningRadius(snap.vaseType)
      const distance = Math.sqrt(intersectPoint.x ** 2 + intersectPoint.z ** 2)
      
      let finalX = intersectPoint.x
      let finalZ = intersectPoint.z
      
      if (distance > maxRadius) {
        const scale = maxRadius / distance
        finalX *= scale
        finalZ *= scale
      }

      updateFlowerPosition(draggedFlowerIdRef.current, finalX, finalZ)

      const flowerData = flowerMeshesRef.current.get(draggedFlowerIdRef.current)
      if (flowerData) {
        flowerData.mesh.position.x = finalX
        flowerData.mesh.position.z = finalZ
        flowerData.targetPosition.x = finalX
        flowerData.targetPosition.z = finalZ
      }

      if (selectionRingRef.current && selectionRingRef.current.visible) {
        selectionRingRef.current.position.x = finalX
        selectionRingRef.current.position.z = finalZ
      }
    }
  }, [snap.vaseType])

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      draggedFlowerIdRef.current = null
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }
  }, [])

  const updateViewMode = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return

    if (snap.viewMode === 'top') {
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 8,
        z: 0.01,
        duration: 0.8,
        ease: 'power2.inOut'
      })
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.inOut'
      })
    } else {
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 1,
        z: 5,
        duration: 0.8,
        ease: 'power2.inOut'
      })
      gsap.to(controlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.inOut'
      })
    }
  }, [snap.viewMode])

  useEffect(() => {
    const cleanup = initScene()
    return cleanup
  }, [initScene])

  useEffect(() => {
    if (!containerRef.current) return
    
    const canvas = rendererRef.current?.domElement
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

  useEffect(() => {
    const currentIds = new Set(snap.flowers.map(f => f.id))
    const existingIds = new Set(flowerMeshesRef.current.keys())

    existingIds.forEach(id => {
      if (!currentIds.has(id)) {
        removeFlowerMesh(id)
      }
    })

    snap.flowers.forEach(flower => {
      if (!existingIds.has(flower.id)) {
        addFlowerMesh(flower.id, flower.flowerType, flower.stemHeight, flower.position.x, flower.position.z, flower.rotation)
      }
    })
  }, [snap.flowers, addFlowerMesh, removeFlowerMesh])

  useEffect(() => {
    snap.flowers.forEach(flower => {
      const flowerData = flowerMeshesRef.current.get(flower.id)
      if (flowerData) {
        flowerData.mesh.position.x = flower.position.x
        flowerData.mesh.position.z = flower.position.z
        flowerData.mesh.rotation.y = (flower.rotation * Math.PI) / 180
        flowerData.targetPosition.set(flower.position.x, flowerData.targetPosition.y, flower.position.z)
      }
    })
  }, [snap.flowers])

  useEffect(() => {
    updateVase()
  }, [snap.vaseType, updateVase])

  useEffect(() => {
    updateViewMode()
  }, [snap.viewMode, updateViewMode])

  useEffect(() => {
    if (selectionRingRef.current) {
      if (snap.selectedFlowerId) {
        const flowerData = flowerMeshesRef.current.get(snap.selectedFlowerId)
        if (flowerData) {
          selectionRingRef.current.position.copy(flowerData.mesh.position)
          selectionRingRef.current.position.y += 0.05
          selectionRingRef.current.visible = true
          gsap.fromTo(
            selectionRingRef.current.scale,
            { x: 0.5, y: 0.5, z: 0.5 },
            { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2)' }
          )
        }
      } else {
        selectionRingRef.current.visible = false
      }
    }
  }, [snap.selectedFlowerId])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: 'radial-gradient(ellipse at center, #faf3e0 0%, #e8dcc8 100%)'
      }} 
    />
  )
}

export default Scene
