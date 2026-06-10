declare module '*.glsl' {
  export const vertexShader: string;
  export const fragmentShader: string;
  const shader: string;
  export default shader;
}

declare module '*.glsl?raw' {
  const content: string;
  export default content;
}
