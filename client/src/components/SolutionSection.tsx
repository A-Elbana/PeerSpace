import React from 'react'
import { CheckCircle2, Zap, Shield } from 'lucide-react'

const SolutionSection: React.FC = () => {
  return (
    <section className="ps-solution-section" id="solution">
      <div className="ps-container">
        <div className="ps-solution-content">
          <div className="ps-solution-text">
            <h2>One Platform. Everything You Need.</h2>
            <p className="ps-solution-lead">
              PeerSpace eliminates the complexity of managing multiple tools by bringing 
              all your educational needs into one unified, intuitive platform.
            </p>
            
            <div className="ps-solution-features">
              <div className="ps-solution-feature">
                <CheckCircle2 size={24} className="ps-solution-check" />
                <div>
                  <h4>Centralized Communication</h4>
                  <p>All announcements, discussions, and updates in one place</p>
                </div>
              </div>
              
              <div className="ps-solution-feature">
                <Zap size={24} className="ps-solution-check" />
                <div>
                  <h4>Instant Collaboration</h4>
                  <p>Real-time interactions between students and instructors</p>
                </div>
              </div>
              
              <div className="ps-solution-feature">
                <Shield size={24} className="ps-solution-check" />
                <div>
                  <h4>Secure & Organized</h4>
                  <p>Your data is protected with enterprise-grade security</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ps-solution-visual">
            <div className="ps-dashboard-mockup">
              <div className="ps-mockup-header">
                <div className="ps-mockup-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="ps-mockup-title">PeerSpace Dashboard</div>
              </div>
              <div className="ps-mockup-body">
                <div className="ps-mockup-sidebar">
                  <div className="ps-mockup-item"></div>
                  <div className="ps-mockup-item"></div>
                  <div className="ps-mockup-item"></div>
                  <div className="ps-mockup-item"></div>
                </div>
                <div className="ps-mockup-main">
                  <div className="ps-mockup-card"></div>
                  <div className="ps-mockup-card"></div>
                  <div className="ps-mockup-card"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SolutionSection
