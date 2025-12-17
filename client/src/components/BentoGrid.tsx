import React from 'react'
import { FileText, Users, Bell, Award, MessageSquare, Calendar } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Assignment Management',
    desc: 'Create, distribute, and grade assignments with ease. Track submissions and provide feedback instantly.',
    span: 'col-span-2',
  },
  {
    icon: Users,
    title: 'Community Spaces',
    desc: 'Build learning communities where students collaborate and share knowledge.',
    span: 'col-span-1',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Stay updated with intelligent alerts for deadlines, announcements, and activity.',
    span: 'col-span-1',
  },
  {
    icon: MessageSquare,
    title: 'Discussion Forums',
    desc: 'Foster engagement with threaded discussions, reactions, and rich text formatting.',
    span: 'col-span-1',
  },
  {
    icon: Award,
    title: 'Achievement System',
    desc: 'Gamify learning with badges and achievements to motivate students.',
    span: 'col-span-1',
  },
  {
    icon: Calendar,
    title: 'Schedule & Calendar',
    desc: 'Organize classes, deadlines, and events in a unified calendar view.',
    span: 'col-span-2',
  },
]

const BentoGrid: React.FC = () => {
  return (
    <section className="ps-bento-section" id="features">
      <div className="ps-container">
        <div className="ps-section-header">
          <h2>Powerful Features for Modern Education</h2>
          <p>Everything you need to create an engaging learning experience</p>
        </div>
        
        <div className="ps-bento-grid">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article className={`ps-bento-card ${feature.span}`} key={feature.title}>
                <div className="ps-bento-icon">
                  <Icon size={28} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default BentoGrid
