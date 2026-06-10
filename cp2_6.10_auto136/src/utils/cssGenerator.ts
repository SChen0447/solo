import { AnimationElement } from '../types'

const generateKeyframeName = (elementId: string, index: number): string => {
  return `anim_${elementId.replace(/-/g, '_')}_${index}`
}

export const generateCSS = (elements: AnimationElement[]): string => {
  let css = '/* CSS Keyframes 动画代码 - 由编辑器自动生成 */\n\n'
  const keyframes: string[] = []

  elements.forEach((element, index) => {
    const keyframeName = generateKeyframeName(element.id, index)
    const className = `element-${element.id.slice(0, 8)}`

    css += `/* ${element.name} */\n`
    css += `.${className} {\n`
    css += `  position: absolute;\n`
    css += `  width: 80px;\n`
    css += `  height: 80px;\n`
    css += `  border-radius: 12px;\n`
    css += `  background-color: ${element.color};\n`
    css += `  transform: translate(-50%, -50%);\n`
    css += `  animation-name: ${keyframeName};\n`
    css += `  animation-duration: ${element.duration}s;\n`
    css += `  animation-delay: ${element.delay}s;\n`
    css += `  animation-timing-function: ${element.easing};\n`
    css += `  animation-iteration-count: ${element.iterationCount};\n`
    css += `  animation-fill-mode: both;\n`
    css += `}\n\n`

    const nodes = element.pathNodes
    let keyframe = `@keyframes ${keyframeName} {\n`
    nodes.forEach((node, i) => {
      const percent = nodes.length === 1 ? 100 : Math.round((i / (nodes.length - 1)) * 100)
      keyframe += `  ${percent}% {\n`
      keyframe += `    transform: translate(${node.x}px, ${node.y}px) translate(-50%, -50%);\n`
      keyframe += `  }\n`
    })
    keyframe += `}\n\n`
    keyframes.push(keyframe)
  })

  css += keyframes.join('')

  return css
}
