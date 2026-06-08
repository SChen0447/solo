import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const ensureDataDir = (): void => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const validateProject = (data: unknown): { valid: boolean; message?: string } => {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, message: 'Invalid project data' };
  }
  const project = data as Record<string, unknown>;
  if (!project.id || typeof project.id !== 'string') {
    return { valid: false, message: 'Project id is required' };
  }
  if (!project.scenes || !Array.isArray(project.scenes)) {
    return { valid: false, message: 'Project scenes must be an array' };
  }
  return { valid: true };
};

router.post('/save', (req: Request, res: Response): void => {
  try {
    ensureDataDir();

    const validation = validateProject(req.body);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.message,
        code: 400,
      });
      return;
    }

    const project = req.body;
    const projectId = project.id as string;
    const filePath = path.join(DATA_DIR, `${projectId}.json`);

    fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');

    res.status(200).json({
      success: true,
      id: projectId,
      message: 'Project saved successfully',
    });
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save project',
      code: 500,
    });
  }
});

router.get('/load/:id', (req: Request, res: Response): void => {
  try {
    const projectId = req.params.id;

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Project id is required',
        code: 400,
      });
      return;
    }

    ensureDataDir();
    const filePath = path.join(DATA_DIR, `${projectId}.json`);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
        code: 404,
      });
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const project = JSON.parse(fileContent);

    res.status(200).json({
      success: true,
      project,
      message: 'Project loaded successfully',
    });
  } catch (error) {
    console.error('Load project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load project',
      code: 500,
    });
  }
});

export default router;
