import * as THREE from 'three'
import { getFlowerById } from '@/data/flowerCatalog'

export const createFlower = (
  flowerType: string,
  stemHeight: number,
  scale: number = 0.02
): THREE.Group => {
  const flowerData = getFlowerById(flowerType)
  const group = new THREE.Group()

  const stemHeightScaled = stemHeight * scale
  const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, stemHeightScaled, 8)
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a7c4e,
    roughness: 0.8,
    metalness: 0.1
  })
  const stem = new THREE.Mesh(stemGeometry, stemMaterial)
  stem.position.y = stemHeightScaled / 2
  stem.castShadow = true
  group.add(stem)

  if (flowerType === 'eucalyptus') {
    addEucalyptusLeaves(group, stemHeightScaled)
  } else {
    const receptacleGeometry = new THREE.SphereGeometry(0.12, 16, 16)
    const receptacleMaterial = new THREE.MeshStandardMaterial({
      color: flowerData ? flowerData.color : 0xffffff,
      roughness: 0.5
    })
    const receptacle = new THREE.Mesh(receptacleGeometry, receptacleMaterial)
    receptacle.position.y = stemHeightScaled
    receptacle.castShadow = true
    group.add(receptacle)

    const petalCount = flowerData?.petalCount || 12
    const petalColor = flowerData?.color || '#ffffff'
    addPetals(group, petalCount, petalColor, stemHeightScaled)
  }

  return group
}

const addPetals = (
  group: THREE.Group,
  petalCount: number,
  color: string,
  stemHeight: number
) => {
  const petalColor = new THREE.Color(color)
  
  const petalGeometry = createPetalGeometry()
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: petalColor,
    roughness: 0.6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  })

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2
    const petal = new THREE.Mesh(petalGeometry, petalMaterial.clone())
    
    const sizeVariation = 0.85 + Math.random() * 0.3
    petal.scale.set(sizeVariation, sizeVariation, sizeVariation)
    
    petal.position.set(
      Math.cos(angle) * 0.15,
      stemHeight + 0.05,
      Math.sin(angle) * 0.15
    )
    
    petal.rotation.y = -angle
    petal.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3
    petal.rotation.x = Math.PI / 4 + Math.random() * 0.2
    
    petal.castShadow = true
    group.add(petal)
  }

  for (let i = 0; i < Math.floor(petalCount * 0.6); i++) {
    const angle = (i / Math.floor(petalCount * 0.6)) * Math.PI * 2 + Math.PI / petalCount
    const petal = new THREE.Mesh(petalGeometry, petalMaterial.clone())
    
    const sizeVariation = 0.6 + Math.random() * 0.2
    petal.scale.set(sizeVariation, sizeVariation, sizeVariation)
    
    petal.position.set(
      Math.cos(angle) * 0.1,
      stemHeight + 0.1,
      Math.sin(angle) * 0.1
    )
    
    petal.rotation.y = -angle
    petal.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.2
    petal.rotation.x = Math.PI / 3 + Math.random() * 0.3
    
    petal.castShadow = true
    group.add(petal)
  }

  const centerGeometry = new THREE.SphereGeometry(0.08, 12, 12)
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.7
  })
  const center = new THREE.Mesh(centerGeometry, centerMaterial)
  center.position.y = stemHeight + 0.08
  center.castShadow = true
  group.add(center)
}

const createPetalGeometry = (): THREE.ShapeGeometry => {
  const shape = new THREE.Shape()
  
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.1, 0.05, 0.15, 0.2, 0, 0.35)
  shape.bezierCurveTo(-0.15, 0.2, -0.1, 0.05, 0, 0)
  
  const geometry = new THREE.ShapeGeometry(shape, 16)
  
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const z = Math.sin(y * Math.PI) * 0.05
    positions.setZ(i, z)
  }
  geometry.computeVertexNormals()
  
  return geometry
}

const addEucalyptusLeaves = (group: THREE.Group, stemHeight: number) => {
  const leafGeometry = createEucalyptusLeaf()
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b8e6b,
    roughness: 0.7,
    side: THREE.DoubleSide
  })

  const leafCount = 8
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
    const heightRatio = 0.3 + (i / leafCount) * 0.6
    const y = stemHeight * heightRatio
    
    const angle = (i / leafCount) * Math.PI * 2 + Math.random() * 0.3
    const radius = 0.05 + Math.random() * 0.05
    
    leaf.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    )
    
    leaf.rotation.y = -angle + Math.PI / 2
    leaf.rotation.z = (Math.random() - 0.5) * 0.5
    leaf.rotation.x = Math.PI / 6 + Math.random() * 0.3
    
    const scale = 0.8 + Math.random() * 0.4
    leaf.scale.set(scale, scale, scale)
    
    leaf.castShadow = true
    group.add(leaf)
  }
}

const createEucalyptusLeaf = (): THREE.ShapeGeometry => {
  const shape = new THREE.Shape()
  
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(0.15, 0.1, 0, 0.25)
  shape.quadraticCurveTo(-0.15, 0.1, 0, 0)
  
  return new THREE.ShapeGeometry(shape, 12)
}

export const createSelectionRing = (): THREE.Mesh => {
  const ringGeometry = new THREE.RingGeometry(0.3, 0.35, 32)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = -Math.PI / 2
  return ring
}
