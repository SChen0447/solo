import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { parse } from 'csv-parse'
import { v4 as uuidv4 } from 'uuid'
import { Readable } from 'stream'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const storage = multer.memoryStorage()
const upload = multer({ storage })

interface SurveyData {
  id: string
  questions: string[]
  records: Record<string, string>[]
}

let surveyData: SurveyData | null = null

interface DistributionItem {
  value: string
  count: number
  percentage: number
}

interface QuestionDistribution {
  question: string
  type: 'single' | 'multiple'
  distribution: DistributionItem[]
}

function isMultipleChoice(answers: string[]): boolean {
  const separatorPattern = /[,，;；、|\/]/
  const multiCount = answers.filter(a => separatorPattern.test(a)).length
  return multiCount > answers.length * 0.3
}

function splitAnswers(answer: string): string[] {
  return answer
    .split(/[,，;；、|\/]/)
    .map(a => a.trim())
    .filter(a => a.length > 0)
}

function calculateDistributions(
  questions: string[],
  records: Record<string, string>[]
): QuestionDistribution[] {
  return questions.map(question => {
    const answers = records.map(r => r[question] || '').filter(a => a.length > 0)
    const isMulti = isMultipleChoice(answers)

    const countMap = new Map<string, number>()

    if (isMulti) {
      answers.forEach(answer => {
        const parts = splitAnswers(answer)
        parts.forEach(p => {
          countMap.set(p, (countMap.get(p) || 0) + 1)
        })
      })
    } else {
      answers.forEach(answer => {
        countMap.set(answer, (countMap.get(answer) || 0) + 1)
      })
    }

    const total = records.length
    const distribution = Array.from(countMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)

    return {
      question,
      type: isMulti ? 'multiple' : 'single',
      distribution
    }
  })
}

function filterRecords(
  records: Record<string, string>[],
  filterQuestion: string,
  filterValue: string
): Record<string, string>[] {
  return records.filter(record => {
    const answer = record[filterQuestion] || ''
    const answers = splitAnswers(answer)
    return answers.includes(filterValue)
  })
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' })
    }

    const fileContent = req.file.buffer.toString('utf-8')
    const records: Record<string, string>[] = []
    let questions: string[] = []
    let isFirstRow = true

    const parser = parse({
      delimiter: ',',
      columns: false,
      skip_empty_lines: true
    })

    parser.on('readable', () => {
      let record: string[] | null
      while ((record = parser.read() as string[] | null) !== null) {
        const currentRecord = record
        if (isFirstRow) {
          questions = currentRecord.map((q: string) => q.trim())
          isFirstRow = false
        } else {
          const row: Record<string, string> = {}
          questions.forEach((q, i) => {
            row[q] = (currentRecord[i] || '').trim()
          })
          records.push(row)
        }
      }
    })

    parser.on('end', () => {
      if (questions.length === 0) {
        return res.status(400).json({ error: 'CSV文件格式错误，缺少问题行' })
      }

      surveyData = {
        id: uuidv4(),
        questions,
        records
      }

      const distributions = calculateDistributions(questions, records)

      res.json({
        success: true,
        surveyId: surveyData.id,
        total: records.length,
        questions,
        distributions
      })
    })

    parser.on('error', (err) => {
      console.error('CSV解析错误:', err)
      res.status(400).json({ error: 'CSV文件解析失败' })
    })

    Readable.from(fileContent).pipe(parser)
  } catch (error) {
    console.error('上传错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

app.get('/api/survey', (req, res) => {
  try {
    if (!surveyData) {
      return res.status(404).json({ error: '暂无数据，请先上传CSV文件' })
    }

    const filterQuestion = req.query.filterQuestion as string | undefined
    const filterValue = req.query.filterValue as string | undefined

    let filteredRecords = surveyData.records

    if (filterQuestion && filterValue && surveyData.questions.includes(filterQuestion)) {
      filteredRecords = filterRecords(surveyData.records, filterQuestion, filterValue)
    }

    const distributions = calculateDistributions(surveyData.questions, filteredRecords)

    res.json({
      total: filteredRecords.length,
      questions: surveyData.questions,
      distributions,
      filter: filterQuestion && filterValue ? { question: filterQuestion, value: filterValue } : null
    })
  } catch (error) {
    console.error('获取数据错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

interface CrossAnalysisResult {
  question1: string
  question2: string
  values1: string[]
  values2: string[]
  data: number[][]
  totals: { row: number[]; col: number[]; grand: number }
}

app.get('/api/cross', (req, res) => {
  try {
    if (!surveyData) {
      return res.status(404).json({ error: '暂无数据，请先上传CSV文件' })
    }

    const q1 = req.query.q1 as string
    const q2 = req.query.q2 as string

    if (!q1 || !q2) {
      return res.status(400).json({ error: '请提供两个问题参数 q1 和 q2' })
    }

    if (!surveyData.questions.includes(q1) || !surveyData.questions.includes(q2)) {
      return res.status(400).json({ error: '问题不存在' })
    }

    const dist1 = calculateDistributions([q1], surveyData.records)[0]
    const dist2 = calculateDistributions([q2], surveyData.records)[0]

    const values1 = dist1.distribution.map(d => d.value)
    const values2 = dist2.distribution.map(d => d.value)

    const data: number[][] = values2.map(() => values1.map(() => 0))

    const isMulti1 = dist1.type === 'multiple'
    const isMulti2 = dist2.type === 'multiple'

    surveyData.records.forEach(record => {
      const ans1 = record[q1] || ''
      const ans2 = record[q2] || ''

      const answers1 = isMulti1 ? splitAnswers(ans1) : (ans1 ? [ans1] : [])
      const answers2 = isMulti2 ? splitAnswers(ans2) : (ans2 ? [ans2] : [])

      answers1.forEach(a1 => {
        const i1 = values1.indexOf(a1)
        if (i1 === -1) return

        answers2.forEach(a2 => {
          const i2 = values2.indexOf(a2)
          if (i2 === -1) return
          data[i2][i1]++
        })
      })
    })

    const rowTotals = data.map(row => row.reduce((sum, val) => sum + val, 0))
    const colTotals = values1.map((_, i) => data.reduce((sum, row) => sum + row[i], 0))
    const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0)

    const result: CrossAnalysisResult = {
      question1: q1,
      question2: q2,
      values1,
      values2,
      data,
      totals: {
        row: rowTotals,
        col: colTotals,
        grand: grandTotal
      }
    }

    res.json(result)
  } catch (error) {
    console.error('交叉分析错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
