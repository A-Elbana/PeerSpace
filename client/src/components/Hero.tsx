import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

interface HeroProps {
  theme: 'theme-light' | 'theme-dark';
}

const Hero: React.FC<HeroProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const heroElement = canvas.closest('.ps-hero') as HTMLElement
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = heroElement?.clientHeight || window.innerHeight)

    const isDark = theme === 'theme-dark'

    // Configuration based on theme
    const config = {
      particleColor: isDark
        ? { hMin: 200, hMax: 260, lMin: 65, lMax: 95 }
        : { hMin: 230, hMax: 290, lMin: 40, lMax: 60 }, // Darker/Stronger colors for light mode
      lineColor: isDark
        ? 'rgba(100, 150, 255, 0.15)'
        : 'rgba(100, 100, 255, 0.08)',
      bgGradient: isDark
        ? { start: 'rgba(103, 138, 194, 0.25)', end: 'rgba(0,0,0,0)' }
        : { start: 'rgba(139, 92, 246, 0.15)', end: 'rgba(255,255,255,0)' }
    }

    const mouse = { x: w / 2, y: h / 2 }
    const target = { x: w / 2, y: h / 2 }

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      hue: config.particleColor.hMin + Math.random() * (config.particleColor.hMax - config.particleColor.hMin),
      connections: 0,
    }))

    function onMove(e: MouseEvent) {
      target.x = e.clientX
      target.y = e.clientY
    }

    function resize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = heroElement?.clientHeight || window.innerHeight
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('resize', resize)

    let raf = 0
    function draw() {
      mouse.x += (target.x - mouse.x) * 0.05
      mouse.y += (target.y - mouse.y) * 0.05

      ctx.clearRect(0, 0, w, h)

      // Background Gradient
      const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 400)
      g.addColorStop(0, config.bgGradient.start)
      g.addColorStop(1, config.bgGradient.end)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // Reset connections
      particles.forEach((p) => (p.connections = 0))

      // Repel and update particles
      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          const force = (200 - dist) / 200
          p.vx += (dx / dist) * force * 0.4
          p.vy += (dy / dist) * force * 0.4
        }

        const cdx = p.x - w / 2
        const cdy = p.y - h / 2
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1
        if (cdist < 150) {
          const force = (150 - cdist) / 150
          p.vx += (cdx / cdist) * force * 0.15
          p.vy += (cdy / cdist) * force * 0.15
        }

        p.x += p.vx
        p.y += p.vy

        // Bounce off walls
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1

        if (Math.abs(p.vx) > 1) p.vx *= 0.8
        if (Math.abs(p.vy) > 1) p.vy *= 0.8
      }

      // Draw connections
      ctx.strokeStyle = config.lineColor
      ctx.lineWidth = 1

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            const midX = (p1.x + p2.x) / 2
            const midY = (p1.y + p2.y) / 2
            const distToCenter = Math.sqrt((midX - w / 2) ** 2 + (midY - h / 2) ** 2)

            if (distToCenter > 100) {
              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.stroke()
              p1.connections++
              p2.connections++
            }
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath()

        // Dynamic lightness
        const baseL = config.particleColor.lMin
        const addedL = Math.min(p.connections * 5, config.particleColor.lMax - config.particleColor.lMin)
        const lightness = baseL + addedL

        const opacity = Math.min(0.6 + p.connections * 0.08, 1)

        ctx.fillStyle = `hsla(${p.hue}, 70%, ${lightness}%, ${opacity})`

        if (p.connections > 2) {
          ctx.shadowBlur = p.connections * 2
          ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, 0.6)`
        } else {
          ctx.shadowBlur = 0
        }

        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
    }
  }, [theme])

  return (
    <section className="ps-hero" id="hero">
      <canvas ref={canvasRef} className="ps-hero-canvas" />
      <div className="ps-hero-content">
        <h1>PeerSpace — Classrooms for the modern student</h1>
        <p>
          Create classes, share materials, assign work, and collaborate — all
          in one friendly workspace.
        </p>
        <div className="ps-hero-cta">
          {isAuthenticated() ? (
            <Link to="/dashboard" className="btn-primary">Open Dashboard</Link>
          ) : (
            <Link to="/signup" className="btn-primary">Join Now</Link>
          )}
          <a className="btn-ghost" href="#features">
            Learn More
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
