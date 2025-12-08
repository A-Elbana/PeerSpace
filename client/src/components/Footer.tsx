import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="ps-footer">
      <div className="ps-container ps-footer-inner">
        <div>© {new Date().getFullYear()} PeerSpace</div>
        <div className="ps-footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
