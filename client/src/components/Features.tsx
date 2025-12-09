import React from 'react'

const features = [
  {
    title: 'Organized Classrooms',
    desc: 'No more whatsapp groups, create and manage class spaces that keep content organized for teachers and students.',
  },
  { title: 'Assignments & Grading', desc: 'Post assignments, collect submissions, and give feedback quickly.' },
  { title: 'File Sharing', desc: 'Upload resources and attachments for easy access.' },
  { title: 'Discussion & Announcements', desc: 'Keep students informed and engaged with posts and comments.' },
]

const Features: React.FC = () => {
  return (
    <section className="ps-features" id="features">
      <div className="ps-container">
        <h2>Powerful, simple tools for teaching and learning</h2>
        <div className="ps-feature-grid">
          {features.map((f) => (
            <article className="ps-feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
