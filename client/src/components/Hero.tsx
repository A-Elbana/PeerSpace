import React, { useEffect, useRef } from 'react'

const Hero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const heroElement = canvas.closest('.ps-hero') as HTMLElement
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = heroElement?.clientHeight || window.innerHeight)

    const mouse = { x: w / 2, y: h / 2 }
    const target = { x: w / 2, y: h / 2 }

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 2 + Math.random() * 4, // Smaller particles for network look
      vx: (Math.random() - 0.5) * 0.4, // Slower natural drift
      vy: (Math.random() - 0.5) * 0.4,
      hue: 200 + Math.random() * 60,
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
      // smooth mouse movement
      mouse.x += (target.x - mouse.x) * 0.05
      mouse.y += (target.y - mouse.y) * 0.05

      ctx.clearRect(0, 0, w, h)

      // More focused gradient background
      const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 400)
      g.addColorStop(0, 'rgba(103, 138, 194, 0.25)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // Reset connections
      particles.forEach((p) => (p.connections = 0))

      // Repel and update particles
      for (const p of particles) {
        // Repel from mouse
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          const force = (200 - dist) / 200
          p.vx += (dx / dist) * force * 0.4 // Reduced repulsion strength
          p.vy += (dy / dist) * force * 0.4
        }

        // Repel from center
        const cdx = p.x - w / 2
        const cdy = p.y - h / 2
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1
        if (cdist < 150) {
          const force = (150 - cdist) / 150
          p.vx += (cdx / cdist) * force * 0.15
          p.vy += (cdy / cdist) * force * 0.15
        }

        // Return to original speed/randomness
        p.x += p.vx
        p.y += p.vy

        // Bounce off walls
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1

        // Dampen velocity to prevent explosion but keep movement
        // We want them to drift, not stop like before
        if (Math.abs(p.vx) > 1) p.vx *= 0.8
        if (Math.abs(p.vy) > 1) p.vy *= 0.8
      }

      // Draw connections (dense network)
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)'
      ctx.lineWidth = 1

      const centerSafeRadius = 150 // Radius around center to keep clear of edges

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            // Check if edge crosses 'center' area (approximate by checking mid-point distance to center of screen)
            // The prompt says "no edges that cross the center".
            // We can interpret "center" as the screen center.
            const midX = (p1.x + p2.x) / 2
            const midY = (p1.y + p2.y) / 2
            const distToCenter = Math.sqrt(
              (midX - w / 2) ** 2 + (midY - h / 2) ** 2
            )

            if (distToCenter > 100) {
              // Only draw if connection doesn't pass too close to the absolute center
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

      // Draw particles with glow based on connections
      for (const p of particles) {
        ctx.beginPath()
        const lightness = Math.min(65 + p.connections * 5, 95)
        const opacity = Math.min(0.6 + p.connections * 0.08, 1)

        ctx.fillStyle = `hsla(${p.hue}, 70%, ${lightness}%, ${opacity})`

        // Add a glow effect for highly connected nodes
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
  }, [])

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
          <button className="btn-primary">Join Now</button>
          <a className="btn-ghost" href="#features">
            Learn More
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
