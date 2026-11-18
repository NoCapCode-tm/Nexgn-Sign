export const delay = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms))

export const DEMO_STATS = {
  total: 128,
  pending: 30,
  signed: 62,
  expired: 21,
  trends: { total: 12, pending: 8, signed: 10, expired: 12 },
}

export const DEMO_PLAN = { name: 'Free', used: 15, limit: 19 }

const base = { name: 'Recent documents', note: 'Send it to client', signer: 'Himanshu Upadhyay', signedAt: '2026-04-10' }

// owner: 'You' or a list of team members
export const DEMO_DOCS = [
  { id: 'd1', ...base, owner: 'You', status: 'pending' },
  { id: 'd2', ...base, owner: 'You', status: 'pending' },
  { id: 'd3', ...base, owner: 'You', status: 'pending' },
  { id: 'd4', ...base, owner: 'You', status: 'signed' },
  { id: 'd5', ...base, owner: ['Gaurav K', 'Tanya S', 'Vikram B', 'Mira P'], status: 'pending' },
  { id: 'd6', ...base, owner: ['Anita R', 'Dev M', 'Sara L', 'Om P'], status: 'pending' },
  { id: 'd7', ...base, owner: 'You', status: 'expired' },
  { id: 'd8', ...base, owner: 'You', status: 'pending' },
]