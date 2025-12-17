import React from 'react'

const technologies = [
  { name: 'React', color: '#61DAFB' },
  { name: 'TypeScript', color: '#3178C6' },
  { name: 'Node.js', color: '#339933' },
  { name: 'PostgreSQL', color: '#4169E1' },
  { name: 'Prisma', color: '#2D3748' },
  { name: 'Express', color: '#000000' },
  { name: 'Tailwind CSS', color: '#06B6D4' },
  { name: 'Socket.io', color: '#010101' },
]

const TechStack: React.FC = () => {
  return (
    <section className="ps-tech-section" id="tech">
      <div className="ps-container">
        <div className="ps-section-header">
          <h2>Built With Modern Technology</h2>
          <p>Leveraging the best tools for performance, scalability, and developer experience</p>
        </div>
        
        <div className="ps-tech-ticker">
          <div className="ps-tech-track">
            {[...technologies, ...technologies].map((tech, index) => (
              <div className="ps-tech-item" key={`${tech.name}-${index}`}>
                <div 
                  className="ps-tech-badge" 
                  style={{ 
                    borderColor: tech.color,
                    boxShadow: `0 0 20px ${tech.color}20`
                  }}
                >
                  <span style={{ color: tech.color }}>{tech.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TechStack
