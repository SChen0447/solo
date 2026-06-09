import p5 from 'p5';
import { createSketch } from './sketch';

const app = document.getElementById('app');
if (app) {
  new p5(createSketch, app);
}
