import React, { useState, useEffect } from 'react'
import { Student } from '../data/students'
import { QuestionData } from './QuestionEditor'

export type AnswerKey = 'A' | 'B' | 'C' | 'D'

const OPTION_COLORS: Record<AnswerKey, string> = {
  A: '#d63031',
  B: '#0984e3',
  C: '#00b894',
  D: '#fdcb6e'
}

interface StudentCardProps {
  student: Student
  answer?: AnswerKey
  question: QuestionData | null
  onAnswer: (studentId: string, answer: AnswerKey) => void
  index: number
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  answer,
  question,
  onAnswer,
  index
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    if (answer && !showAnswer) {
      const delay = 10 + Math.random() * 40
      const timer = setTimeout(() => {
        setIsAnimating(true)
        setShowAnswer(true)
        setTimeout(() => setIsAnimating(false), 300)
      }, delay * index)
      return () => clearTimeout(timer)
    }
    if (!answer) {
      setShowAnswer(false)
    }
  }, [answer, showAnswer, index])

  const handleAvatarClick = () => {
    if (!question || !question.published) return
    if (!answer) {
      const options = question.options
      const randomOption = options[Math.floor(Math.random() * options.length)]
      onAnswer(student.id, randomOption.label as AnswerKey)
    }
  }

  const ringColor = answer
    ? OPTION_COLORS[answer]
    : 'rgba(255,255,255,0.2)'

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        transform: isAnimating ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        cursor: question?.published && !answer ? 'pointer' : 'default',
        boxShadow: isAnimating ? `0 0 20px ${ringColor}60` : 'none'
      }}
      onClick={handleAvatarClick}
    >
      <div
        style={{
          position: 'relative',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: student.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}
      >
        {student.avatar}
        <svg
          style={{
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            width: '56px',
            height: '56px',
            transform: 'rotate(-90deg)'
          }}
        >
          <circle
            cx="28"
            cy="28"
            r="25"
            fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeDasharray={answer ? '157' : '5 10'}
            strokeLinecap="round"
            style={{
              transition: 'all 0.4s ease'
            }}
          />
        </svg>
      </div>

      <div
        style={{
          color: '#dfe6e9',
          fontSize: '13px',
          fontWeight: '500',
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {student.nickname}
      </div>

      <div
        style={{
          minHeight: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {showAnswer && answer && (
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: OPTION_COLORS[answer],
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: showAnswer ? 1 : 0,
              transform: showAnswer ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
          >
            {answer}
          </div>
        )}
      </div>
    </div>
  )
}

interface StudentGridProps {
  students: Student[]
  answers: Record<string, AnswerKey>
  question: QuestionData | null
  onAnswer: (studentId: string, answer: AnswerKey) => void
}

const StudentGrid: React.FC<StudentGridProps> = ({
  students,
  answers,
  question,
  onAnswer
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '12px',
        padding: '16px',
        height: '100%',
        overflow: 'auto',
        alignContent: 'start'
      }}
    >
      {students.map((student, index) => (
        <StudentCard
          key={student.id}
          student={student}
          answer={answers[student.id]}
          question={question}
          onAnswer={onAnswer}
          index={index}
        />
      ))}
    </div>
  )
}

export default StudentGrid
