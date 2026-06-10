import type { Contract, ContractFormData, SignRecord, Signature } from '../contracts'
import { v4 as uuidv4 } from 'uuid'
import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'

const STORAGE_KEY = 'contracts_data'

const getDefaultContracts = (): Contract[] => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  return [
    {
      id: uuidv4(),
      title: '网站设计服务合同',
      partyA: { name: '张三', email: 'zhangsan@example.com' },
      partyB: { name: '李四', email: 'lisi@example.com' },
      content: `<h3>服务内容</h3><p>甲方委托乙方进行企业官网设计开发工作。</p><h3>服务费用</h3><p>合同总金额为人民币 50,000 元整。</p><h3>交付时间</h3><p>乙方应在合同签署后 30 个工作日内完成所有设计开发工作。</p><h3>付款方式</h3><p>合同签署后支付 50% 预付款，项目验收完成后支付剩余 50%。</p>`,
      status: 'completed',
      signatures: [
        { party: 'partyA', dataUrl: '', signedAt: yesterday.toISOString() },
        { party: 'partyB', dataUrl: '', signedAt: now.toISOString() }
      ],
      signRecords: [
        {
          id: uuidv4(),
          party: 'partyA',
          signerName: '张三',
          signerEmail: 'zhangsan@example.com',
          action: '张三签署了合同',
          timestamp: yesterday.toISOString()
        },
        {
          id: uuidv4(),
          party: 'partyB',
          signerName: '李四',
          signerEmail: 'lisi@example.com',
          action: '李四签署了合同',
          timestamp: now.toISOString()
        }
      ],
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: uuidv4(),
      title: '技术咨询服务协议',
      partyA: { name: '王五', email: 'wangwu@example.com' },
      partyB: { name: '赵六', email: 'zhaoliu@example.com' },
      content: `<h3>咨询内容</h3><p>乙方向甲方提供企业数字化转型咨询服务。</p><h3>咨询周期</h3><p>咨询服务为期 3 个月，自合同签署之日起计算。</p><h3>服务费用</h3><p>每月咨询费用为人民币 15,000 元整。</p>`,
      status: 'partial',
      signatures: [
        { party: 'partyA', dataUrl: '', signedAt: yesterday.toISOString() }
      ],
      signRecords: [
        {
          id: uuidv4(),
          party: 'partyA',
          signerName: '王五',
          signerEmail: 'wangwu@example.com',
          action: '王五签署了合同',
          timestamp: yesterday.toISOString()
        }
      ],
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: yesterday.toISOString()
    },
    {
      id: uuidv4(),
      title: '产品销售合同',
      partyA: { name: '孙七', email: 'sunqi@example.com' },
      partyB: { name: '周八', email: 'zhouba@example.com' },
      content: `<h3>产品信息</h3><p>甲方向乙方购买办公设备一批。</p><h3>合同金额</h3><p>合同总金额为人民币 120,000 元整。</p><h3>交货方式</h3><p>乙方应在收到货款后 7 个工作日内安排发货。</p>`,
      status: 'unsigned',
      signatures: [],
      signRecords: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ]
}

const loadContracts = (): Contract[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    const defaults = getDefaultContracts()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  } catch {
    const defaults = getDefaultContracts()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  }
}

const saveContracts = (contracts: Contract[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
}

export const mockService = {
  async getAllContracts(): Promise<Contract[]> {
    await new Promise(resolve => setTimeout(resolve, 600))
    return loadContracts()
  },

  async getContractById(id: string): Promise<Contract | null> {
    await new Promise(resolve => setTimeout(resolve, 300))
    const contracts = loadContracts()
    return contracts.find(c => c.id === id) || null
  },

  async createContract(data: ContractFormData): Promise<Contract> {
    await new Promise(resolve => setTimeout(resolve, 400))
    const contracts = loadContracts()
    const now = new Date().toISOString()
    const newContract: Contract = {
      id: uuidv4(),
      title: data.title,
      partyA: { name: data.partyAName, email: data.partyAEmail },
      partyB: { name: data.partyBName, email: data.partyBEmail },
      content: data.content,
      status: 'unsigned',
      signatures: [],
      signRecords: [],
      createdAt: now,
      updatedAt: now
    }
    contracts.unshift(newContract)
    saveContracts(contracts)
    return newContract
  },

  async updateContract(id: string, data: ContractFormData): Promise<Contract | null> {
    await new Promise(resolve => setTimeout(resolve, 400))
    const contracts = loadContracts()
    const index = contracts.findIndex(c => c.id === id)
    if (index === -1) return null
    contracts[index] = {
      ...contracts[index],
      title: data.title,
      partyA: { name: data.partyAName, email: data.partyAEmail },
      partyB: { name: data.partyBName, email: data.partyBEmail },
      content: data.content,
      updatedAt: new Date().toISOString()
    }
    saveContracts(contracts)
    return contracts[index]
  },

  async deleteContract(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300))
    const contracts = loadContracts()
    const filtered = contracts.filter(c => c.id !== id)
    saveContracts(filtered)
    return true
  },

  async signContract(
    id: string,
    party: 'partyA' | 'partyB',
    dataUrl: string
  ): Promise<Contract | null> {
    await new Promise(resolve => setTimeout(resolve, 400))
    const contracts = loadContracts()
    const index = contracts.findIndex(c => c.id === id)
    if (index === -1) return null

    const contract = contracts[index]
    const now = new Date()
    const partyInfo = party === 'partyA' ? contract.partyA : contract.partyB

    const existingIndex = contract.signatures.findIndex(s => s.party === party)
    const signature: Signature = {
      party,
      dataUrl,
      signedAt: now.toISOString()
    }

    if (existingIndex >= 0) {
      contract.signatures[existingIndex] = signature
    } else {
      contract.signatures.push(signature)
    }

    const record: SignRecord = {
      id: uuidv4(),
      party,
      signerName: partyInfo.name,
      signerEmail: partyInfo.email,
      action: `${partyInfo.name}签署了合同`,
      timestamp: now.toISOString()
    }
    contract.signRecords.push(record)

    if (contract.signatures.length >= 2) {
      contract.status = 'completed'
    } else if (contract.signatures.length === 1) {
      contract.status = 'partial'
    }

    contract.updatedAt = now.toISOString()
    contracts[index] = contract
    saveContracts(contracts)
    return contract
  },

  async generatePDF(contract: Contract): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = margin

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(contract.title, pageWidth / 2, y, { align: 'center' })
    y += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`合同编号: ${contract.id.substring(0, 8)}`, margin, y)
    y += 8
    doc.text(`创建日期: ${new Date(contract.createdAt).toLocaleDateString('zh-CN')}`, margin, y)
    y += 10

    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('合同双方', margin, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`甲方: ${contract.partyA.name} (${contract.partyA.email})`, margin, y)
    y += 7
    doc.text(`乙方: ${contract.partyB.name} (${contract.partyB.email})`, margin, y)
    y += 12

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('合同条款', margin, y)
    y += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = contract.content
    const plainText = tempDiv.textContent || tempDiv.innerText || ''
    const lines = doc.splitTextToSize(plainText, pageWidth - 2 * margin)
    doc.text(lines, margin, y)
    y += lines.length * 7 + 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('签署信息', margin, y)
    y += 10

    const sigWidth = 60
    const sigHeight = 30
    const gap = (pageWidth - 2 * margin - 2 * sigWidth) / 2

    contract.signatures.forEach((sig, idx) => {
      const x = margin + idx * (sigWidth + gap)
      doc.setDrawColor(150)
      doc.setLineDashPattern([3, 3], 0)
      doc.rect(x, y, sigWidth, sigHeight)
      doc.setLineDashPattern([], 0)

      const partyName = sig.party === 'partyA' ? contract.partyA.name : contract.partyB.name
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`${partyName} (${sig.party === 'partyA' ? '甲方' : '乙方'})`, x, y + sigHeight + 6)
      doc.text(`签署日期: ${new Date(sig.signedAt).toLocaleDateString('zh-CN')}`, x, y + sigHeight + 12)
    })

    if (contract.signatures.length === 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text('尚未签署', margin, y + 10)
    }

    const fileName = `${contract.title}_${new Date().toISOString().split('T')[0]}.pdf`
    const pdfBlob = doc.output('blob')
    saveAs(pdfBlob, fileName)
  }
}
