import React, { useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

interface Point {
    x: number;
    y: number;
    originX: number;
    originY: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}

const InteractiveDots: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isDarkMode } = useTheme();

    // Configuration
    const DOT_SPACING = 30;
    const DOT_SIZE = 2;
    const MOUSE_RADIUS = 100;
    const REPEL_FORCE = 2; // Reduced from 5 for softer effect
    const RETURN_SPEED = 0.02; // Reduced from 0.05 for slower return
    const DAMPING = 0.9;

    // Colors
    const COLORS = isDarkMode
        ? ['#3b82f6', '#ec4899', '#8b5cf6']
        : ['#3b82f6', '#ec4899', '#60a5fa'];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let points: Point[] = [];
        let animationFrameId: number;
        // Track mouse position relative to canvas
        let mouseX = -1000;
        let mouseY = -1000;

        // Initialize points grid
        const initPoints = () => {
            points = [];
            const width = canvas.width;
            const height = canvas.height;

            // Calculate offset to center grid
            const cols = Math.ceil(width / DOT_SPACING);
            const rows = Math.ceil(height / DOT_SPACING);
            const offsetX = (width - cols * DOT_SPACING) / 2;
            const offsetY = (height - rows * DOT_SPACING) / 2;

            for (let x = 0; x < width; x += DOT_SPACING) {
                for (let y = 0; y < height; y += DOT_SPACING) {
                    // Add some randomness to initial position for organic feel
                    // Use offset to center the grid pattern
                    const originX = x + offsetX;
                    const originY = y + offsetY;

                    points.push({
                        x: originX,
                        y: originY,
                        originX: originX,
                        originY: originY,
                        vx: 0,
                        vy: 0,
                        size: Math.random() < 0.3 ? DOT_SIZE * 1.5 : DOT_SIZE, // Variation in size
                        color: COLORS[Math.floor(Math.random() * COLORS.length)]
                    });
                }
            }
        };

        const handleResize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                initPoints();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            mouseX = (e.clientX - rect.left) * scaleX;
            mouseY = (e.clientY - rect.top) * scaleY;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        };

        // Add mouse leave listener
        window.addEventListener('mouseout', handleMouseLeave);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const time = Date.now() * 0.001;

            points.forEach(point => {
                // Ambient motion (floating) using sine waves based on time and position
                const floatX = Math.sin(time + point.originY * 0.05) * 5;
                const floatY = Math.cos(time + point.originX * 0.05) * 5;

                // Target position is origin + float
                const targetX = point.originX + floatX;
                const targetY = point.originY + floatY;

                // Calculate distance from mouse
                const dx = mouseX - point.x;
                const dy = mouseY - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let forceX = 0;
                let forceY = 0;

                // Repel force
                if (distance < MOUSE_RADIUS) {
                    const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
                    const angle = Math.atan2(dy, dx);
                    forceX = -Math.cos(angle) * force * REPEL_FORCE;
                    forceY = -Math.sin(angle) * force * REPEL_FORCE;
                }

                // Spring force towards target
                const homeDx = targetX - point.x;
                const homeDy = targetY - point.y;

                forceX += homeDx * RETURN_SPEED;
                forceY += homeDy * RETURN_SPEED;

                // Apply forces to velocity
                point.vx += forceX;
                point.vy += forceY;

                // Apply damping
                point.vx *= DAMPING;
                point.vy *= DAMPING;

                // Update position
                point.x += point.vx;
                point.y += point.vy;

                // Draw dot
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                ctx.fillStyle = point.color;

                ctx.globalAlpha = 0.4; // Base opacity
                if (distance < MOUSE_RADIUS) {
                    ctx.globalAlpha = 0.8; // Highlight near mouse
                }

                ctx.fill();
                ctx.globalAlpha = 1.0;
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        // Setup
        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isDarkMode]);

    return (
        <canvas
            ref={canvasRef}
            className="shape-dots-interactive"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0, // Behind shapes but part of background
                opacity: 0.6,
                pointerEvents: 'none' // Let clicks pass through
            }}
        />
    );
};

export default InteractiveDots;
