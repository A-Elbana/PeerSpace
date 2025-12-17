import React from 'react'
import { MessageSquareOff, FolderX, Clock } from 'lucide-react'

const problems = [
  {
    icon: MessageSquareOff,
    title: 'Communication Chaos',
    desc: 'Important announcements get lost in endless WhatsApp groups and email threads.',
  },
  {
    icon: FolderX,
    title: 'Scattered Resources',
    desc: 'Course materials, assignments, and discussions spread across multiple platforms.',
  },
  {
    icon: Clock,
    title: 'Time-Consuming Admin',
    desc: 'Hours wasted managing submissions, tracking progress, and organizing content manually.',
  },
]

const ProblemSection: React.FC = () => {
  return (
    <section className="ps-problem-section" id="problem">
      <div className="ps-container">
        <div className="ps-section-header">
          <h2>Teaching Shouldn't Be This Hard</h2>
          <p>We understand the challenges educators and students face every day</p>
        </div>
        <div className="ps-problem-grid">
          {problems.map((problem) => {
            const Icon = problem.icon
            return (
              <article className="ps-problem-card" key={problem.title}>
                <div className="ps-problem-icon">
                  <Icon size={32} />
                </div>
                <h3>{problem.title}</h3>
                <p>{problem.desc}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ProblemSection
