import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { isAuthenticated } from '../utils/auth'

const FinalCTA: React.FC = () => {
  return (
    <section className="ps-final-cta" id="cta">
      <div className="ps-container">
        <div className="ps-cta-content">
          <div className="ps-cta-badge">
            <Sparkles size={20} />
            <span>Join thousands of educators and students</span>
          </div>
          
          <h2>Ready to Transform Your Classroom?</h2>
          <p>
            Start creating engaging learning experiences today. No credit card required.
          </p>
          
          <div className="ps-cta-actions">
            {isAuthenticated() ? (
              <Link to="/explore" className="btn-cta-primary">
                <span>Go to Dashboard</span>
                <ArrowRight size={24} />
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-cta-primary">
                  <span>Get Started Free</span>
                  <ArrowRight size={24} />
                </Link>
                <Link to="/login" className="btn-cta-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default FinalCTA
