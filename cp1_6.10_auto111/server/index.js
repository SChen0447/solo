import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
const PORT = 3001;
const SECRET_KEY = 'ART_QR_TICKET_SECRET_2024';
const MAX_TICKETS = 50;

app.use(cors());
app.use(bodyParser.json());

const tickets = new Map();

function generateTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'TKT-';
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 4; j++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i === 0) id += '-';
  }
  return id;
}

function computeHash(ticketId) {
  return crypto
    .createHash('sha256')
    .update(ticketId + SECRET_KEY)
    .digest('hex');
}

app.get('/generate-ticket', (req, res) => {
  if (tickets.size >= MAX_TICKETS) {
    return res.status(400).json({
      success: false,
      message: 'Ticket storage limit reached (max 50)'
    });
  }

  let ticketId;
  let attempts = 0;
  do {
    ticketId = generateTicketId();
    attempts++;
  } while (tickets.has(ticketId) && attempts < 100);

  if (tickets.has(ticketId)) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate unique ticket ID'
    });
  }

  const hash = computeHash(ticketId);
  tickets.set(ticketId, {
    ticketId,
    hash,
    status: 'unused',
    createdAt: Date.now()
  });

  res.json({
    success: true,
    ticketId,
    hash
  });
});

app.post('/verify', (req, res) => {
  const startTime = Date.now();
  const { ticketId, hash } = req.body;

  if (!ticketId || !hash) {
    return res.json({
      success: false,
      message: 'Missing ticketId or hash'
    });
  }

  const ticket = tickets.get(ticketId);

  if (!ticket) {
    return res.json({
      success: false,
      message: 'Ticket not found'
    });
  }

  const expectedHash = computeHash(ticketId);
  if (ticket.hash !== hash || hash !== expectedHash) {
    return res.json({
      success: false,
      message: 'Invalid ticket hash'
    });
  }

  if (ticket.status === 'used') {
    return res.json({
      success: false,
      message: 'Ticket already verified'
    });
  }

  ticket.status = 'used';
  ticket.verifiedAt = Date.now();
  tickets.set(ticketId, ticket);

  const elapsed = Date.now() - startTime;
  if (elapsed > 200) {
    console.warn(`Verification took ${elapsed}ms, exceeds 200ms limit`);
  }

  res.json({
    success: true,
    verified: true,
    message: 'Ticket verified successfully'
  });
});

app.get('/tickets', (_req, res) => {
  res.json({
    count: tickets.size,
    max: MAX_TICKETS,
    tickets: Array.from(tickets.values()).map(({ ticketId, status, createdAt }) => ({
      ticketId,
      status,
      createdAt
    }))
  });
});

app.listen(PORT, () => {
  console.log(`Ticket server running on http://localhost:${PORT}`);
  console.log(`  GET  /generate-ticket  - Generate new ticket`);
  console.log(`  POST /verify           - Verify ticket`);
  console.log(`  GET  /tickets          - List all tickets`);
});
