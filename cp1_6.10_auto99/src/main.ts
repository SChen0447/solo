import { FaceMeshDetector, type ExpressionWeights } from './faceMeshDetector';
import { CharacterRenderer, type CharacterStatus } from './characterRenderer';
import { UIController } from './uiController';

const videoEl = document.getElementById('camera-video') as HTMLVideoElement;
const canvasEl = document.getElementById('character-canvas') as HTMLCanvasElement;
const recordBtnEl = document.getElementById('record-btn') as HTMLElement;
const playbackBtnEl = document.getElementById('playback-btn') as HTMLElement;
const indicatorContainer = document.getElementById('expression-indicators') as HTMLElement;
const statusTextEl = document.getElementById('status-text') as HTMLElement;

if (!videoEl || !canvasEl || !recordBtnEl || !playbackBtnEl || !indicatorContainer || !statusTextEl) {
  console.error('缺少必要的 DOM 元素');
  throw new Error('页面结构不完整');
}

const detector = new FaceMeshDetector();
const renderer = new CharacterRenderer(canvasEl);
const ui = new UIController(videoEl, recordBtnEl, playbackBtnEl, indicatorContainer, statusTextEl);

let lastFrameTime = performance.now();
let expressionUpdateAccumulator = 0;
const EXPRESSION_UPDATE_INTERVAL = 1000 / 15;

function getExpressionFromWeights(weights: ExpressionWeights): keyof ExpressionWeights {
  const entries = Object.entries(weights) as [keyof ExpressionWeights, number][];
  let maxExpr: keyof ExpressionWeights = 'neutral';
  let maxVal = -1;
  entries.forEach(([key, val]) => {
    if (val > maxVal) {
      maxVal = val;
      maxExpr = key;
    }
  });
  return maxExpr;
}

function extractStatusFromWeights(weights: ExpressionWeights): CharacterStatus {
  const happy = weights.happy;
  const sad = weights.sad;
  const angry = weights.angry;
  const surprised = weights.surprised;
  const disgusted = weights.disgusted;

  const expression = getExpressionFromWeights(weights);

  const eyeScale =
    1 * weights.neutral +
    0.6 * happy +
    0.9 * sad +
    0.85 * angry +
    1.5 * surprised +
    0.8 * disgusted;

  const mouthCurve =
    0 * weights.neutral +
    25 * happy +
    -15 * sad +
    -5 * angry +
    8 * surprised +
    -10 * disgusted;

  const browAngle =
    0 * weights.neutral +
    -3 * happy +
    8 * sad +
    15 * angry +
    -20 * surprised +
    12 * disgusted;

  const browYOffset =
    0 * weights.neutral +
    0 * happy +
    2 * sad +
    6 * angry +
    -14 * surprised +
    3 * disgusted;

  const cheekBlush =
    0 * weights.neutral +
    0.15 * happy +
    0 * sad +
    0 * angry +
    0 * surprised +
    0 * disgusted;

  const mouthOpen =
    0 * weights.neutral +
    0.05 * happy +
    0.02 * sad +
    0 * angry +
    1 * surprised +
    0.2 * disgusted;

  return {
    expression,
    eyeScale: Math.max(0.5, Math.min(1.6, eyeScale)),
    mouthCurve: Math.max(-25, Math.min(35, mouthCurve)),
    browAngle: Math.max(-25, Math.min(20, browAngle)),
    browYOffset: Math.max(-15, Math.min(10, browYOffset)),
    cheekBlush: Math.max(0, Math.min(0.4, cheekBlush)),
    mouthOpen: Math.max(0, Math.min(1, mouthOpen))
  };
}

ui.onRecordClick(() => {
  if (ui.isPlaybackActive()) return;

  if (ui.isRecording()) {
    ui.stopRecording();
    ui.setStatusText('录制完成，点击回放按钮查看');
  } else {
    ui.startRecording();
    ui.setStatusText('正在录制表情序列...');
  }
});

ui.onPlaybackClick(() => {
  if (!ui.hasRecording()) return;

  if (ui.isPlaybackActive()) {
    ui.stopPlayback({
      onStatus: () => {},
      onFinish: () => {
        ui.setStatusText('回放已停止');
      }
    });
  } else {
    ui.setStatusText('正在回放表情序列...');
    ui.startPlayback({
      onStatus: (status: CharacterStatus) => {
        renderer.setTargetStatus(status);
      },
      onFinish: () => {
        ui.setStatusText('回放完成');
      }
    });
  }
});

async function init(): Promise<void> {
  ui.setStatusText('正在加载 FaceMesh 模型库...');

  try {
    await FaceMeshDetector.waitForLibraries();
    ui.setStatusText('正在请求摄像头权限...');
    await detector.startDetection(videoEl);
    ui.setStatusText('就绪，请对着摄像头做出表情！');

    requestAnimationFrame(animate);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    ui.setStatusText(`初始化失败: ${errorMsg}`);
    console.error('初始化失败:', err);
  }
}

function animate(now: number): void {
  const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;

  if (!ui.isPlaybackActive()) {
    expressionUpdateAccumulator += deltaTime * 1000;

    if (expressionUpdateAccumulator >= EXPRESSION_UPDATE_INTERVAL) {
      expressionUpdateAccumulator = 0;
      const weights = detector.getCurrentExpression();
      const status = extractStatusFromWeights(weights);
      const dominantExpr = detector.getDominantExpression();

      ui.updateExpressionIndicators(dominantExpr);
      renderer.setTargetStatus(status);

      if (ui.isRecording()) {
        ui.recordFrame(status);
      }
    }
  }

  renderer.drawCharacter(deltaTime);
  requestAnimationFrame(animate);
}

window.addEventListener('beforeunload', () => {
  detector.destroy();
});

init();
