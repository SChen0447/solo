export type EasingType =
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier'
  | 'steps';

export type ExpandDirection = 'down' | 'right' | 'center';

export type TriggerMode = 'click' | 'hover' | 'both';

export interface AnimationConfig {
  easing: EasingType;
  cubicBezierParams?: string;
  stepsParams?: string;
  direction: ExpandDirection;
  duration: number;
  trigger: TriggerMode;
}

export interface PreviewInstance {
  id: string;
  config: AnimationConfig;
  isExpanded: boolean;
  animationProgress: number;
  animationStartTime: number | null;
}

export interface AppState {
  activeConfig: AnimationConfig;
  instances: PreviewInstance[];
  selectedInstanceId: string | null;
}

export const DEFAULT_CONFIG: AnimationConfig = {
  easing: 'ease',
  cubicBezierParams: '0.42, 0, 0.58, 1',
  stepsParams: '4, end',
  direction: 'down',
  duration: 600,
  trigger: 'click'
};

export interface ConfigChangeEventDetail {
  config: AnimationConfig;
}

declare global {
  interface HTMLElementEventMap {
    'config:change': CustomEvent<ConfigChangeEventDetail>;
  }
}
