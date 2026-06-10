export interface Party {
  name: string
  email: string
}

export interface Signature {
  party: 'partyA' | 'partyB'
  dataUrl: string
  signedAt: string
}

export interface SignRecord {
  id: string
  party: 'partyA' | 'partyB'
  signerName: string
  signerEmail: string
  action: string
  timestamp: string
}

export type ContractStatus = 'unsigned' | 'partial' | 'completed'

export interface Contract {
  id: string
  title: string
  partyA: Party
  partyB: Party
  content: string
  status: ContractStatus
  signatures: Signature[]
  signRecords: SignRecord[]
  createdAt: string
  updatedAt: string
}

export interface ContractFormData {
  title: string
  partyAName: string
  partyAEmail: string
  partyBName: string
  partyBEmail: string
  content: string
}
