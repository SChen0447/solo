import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const RecipeMaterialSchema = z.object({
  materialId: z.string(),
  position: z.object({ x: z.number(), y: z.number() })
});

const OperationParamsSchema = z.object({
  temperature: z.number().min(0).max(100),
  stirSpeed: z.number().min(0).max(10),
  cooling: z.boolean(),
  duration: z.number().positive()
});

const RecipeSchema = z.object({
  id: z.string().uuid().optional(),
  materials: z.array(RecipeMaterialSchema).min(1).max(4),
  operations: OperationParamsSchema,
  success: z.boolean(),
  createdAt: z.coerce.date().optional(),
  userId: z.string().optional()
});

type Recipe = z.infer<typeof RecipeSchema> & { id: string; createdAt: Date };

const recipesStore: Recipe[] = [];

app.get('/api/recipes', (_req, res) => {
  try {
    res.json({ success: true, recipes: recipesStore });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch recipes' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const validated = RecipeSchema.parse(req.body);
    const newRecipe: Recipe = {
      ...validated,
      id: validated.id || uuidv4(),
      createdAt: validated.createdAt || new Date()
    };
    recipesStore.push(newRecipe);
    res.json({ success: true, recipe: newRecipe });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save recipe' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Alchemy Forge API server running on http://localhost:${PORT}`);
});
