import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

interface Idea {
  id: string;
  name: string;
  description: string;
  scores: {
    feasibility: number;
    innovation: number;
    marketPotential: number;
    cost: number;
  };
}

interface Session {
  id: string;
  title: string;
  ideas: Idea[];
  weights: {
    feasibility: number;
    innovation: number;
    marketPotential: number;
    cost: number;
  };
  createdAt: number;
}

const sessions = new Map<string, Session>();

interface IdeaInput {
  name: string;
  description: string;
}

interface CreateSessionRequest {
  title: string;
  ideas: IdeaInput[];
}

app.post('/api/session', (req, res) => {
  const { title, ideas } = req.body as CreateSessionRequest;

  if (!title || !ideas || ideas.length < 5 || ideas.length > 10) {
    return res.status(400).json({ error: '需要输入会议标题和5-10个创意' });
  }

  const sessionIdeas: Idea[] = ideas.map((idea) => ({
    id: uuidv4(),
    name: idea.name,
    description: idea.description,
    scores: {
      feasibility: 5,
      innovation: 5,
      marketPotential: 5,
      cost: 5,
    },
  }));

  const session: Session = {
    id: uuidv4(),
    title,
    ideas: sessionIdeas,
    weights: {
      feasibility: 0.3,
      innovation: 0.25,
      marketPotential: 0.25,
      cost: 0.2,
    },
    createdAt: Date.now(),
  };

  sessions.set(session.id, session);
  res.json(session);
});

interface ScoreUpdate {
  ideaId: string;
  dimension: 'feasibility' | 'innovation' | 'marketPotential' | 'cost';
  score: number;
}

interface SubmitScoresRequest {
  scores: ScoreUpdate[];
  weights?: {
    feasibility: number;
    innovation: number;
    marketPotential: number;
    cost: number;
  };
}

app.post('/api/session/:id/score', (req, res) => {
  const { id } = req.params;
  const { scores, weights } = req.body as SubmitScoresRequest;

  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: '会议不存在' });
  }

  if (scores) {
    scores.forEach(({ ideaId, dimension, score }) => {
      const idea = session.ideas.find((i) => i.id === ideaId);
      if (idea && score >= 1 && score <= 10) {
        idea.scores[dimension] = score;
      }
    });
  }

  if (weights) {
    const total = weights.feasibility + weights.innovation + weights.marketPotential + weights.cost;
    if (Math.abs(total - 1) < 0.01) {
      session.weights = weights;
    }
  }

  res.json(session);
});

interface IdeaResult {
  id: string;
  name: string;
  description: string;
  scores: {
    feasibility: number;
    innovation: number;
    marketPotential: number;
    cost: number;
  };
  totalScore: number;
  rank: number;
}

interface ResultResponse {
  sessionId: string;
  title: string;
  weights: {
    feasibility: number;
    innovation: number;
    marketPotential: number;
    cost: number;
  };
  results: IdeaResult[];
}

app.get('/api/session/:id/result', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: '会议不存在' });
  }

  const results: IdeaResult[] = session.ideas.map((idea) => {
    const { feasibility, innovation, marketPotential, cost } = idea.scores;
    const totalScore =
      feasibility * session.weights.feasibility +
      innovation * session.weights.innovation +
      marketPotential * session.weights.marketPotential +
      cost * session.weights.cost;

    return {
      id: idea.id,
      name: idea.name,
      description: idea.description,
      scores: { ...idea.scores },
      totalScore: Math.round(totalScore * 100) / 100,
      rank: 0,
    };
  });

  results.sort((a, b) => b.totalScore - a.totalScore);
  results.forEach((r, index) => {
    r.rank = index + 1;
  });

  const response: ResultResponse = {
    sessionId: session.id,
    title: session.title,
    weights: session.weights,
    results,
  };

  res.json(response);
});

app.get('/api/session/:id', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: '会议不存在' });
  }

  res.json(session);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
