import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LOGIN_FEATURES, FEATURE_CYCLE_INTERVAL } from '../../constants/features';
import { useMouseTracker } from '../../hooks/useMouseTracker';
import InteractiveDots from '../InteractiveDots';

const FeatureShowcase: React.FC = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const { mousePosition, containerRef } = useMouseTracker();

  // Auto-cycle through features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev: number) => (prev + 1) % LOGIN_FEATURES.length);
    }, FEATURE_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const currentFeatureData = LOGIN_FEATURES[currentFeature];

  return (
    <div
      className="login-right-panel"
      ref={containerRef}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      } as React.CSSProperties}
    >
      {/* Geometric Background Shapes */}
      <div className="geometric-shapes">
        <div className="shape shape-triangle-1"></div>
        <div className="shape shape-triangle-2"></div>
        <div className="shape shape-circle-1"></div>
        <div className="shape shape-circle-2"></div>
        <div className="shape shape-half-circle"></div>
        {/* Interactive Scattering Dots */}
        <InteractiveDots />
      </div>

      {/* Device Illustration */}
      <div className="device-illustration">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFeature}
            className="laptop-device"
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -50 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div className="laptop-screen">
              <div className="screen-content">
                <div className="screen-header">{currentFeatureData.screenContent.header}</div>

                {/* Progress Tracking View */}
                {currentFeatureData.type === 'progress' && (
                  <div className="progress-view">
                    {currentFeatureData.screenContent.items?.map((item, index) => (
                      <div key={index} className="course-item">
                        <div className="course-thumb"></div>
                        <div className="course-info">
                          <div className="course-title">{item.title}</div>
                          <div className="course-progress">
                            <div className="progress-bar">
                              <motion.div
                                className="progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                              ></motion.div>
                            </div>
                          </div>
                          <div className="course-meta">{item.due}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Collaboration/Chat View */}
                {currentFeatureData.type === 'collaboration' && (
                  <div className="chat-view">
                    <div className="chat-header-info">
                      <div className="chat-group-avatar">
                        <div className="avatar-dot"></div>
                        <div className="avatar-dot"></div>
                        <div className="avatar-dot"></div>
                      </div>
                      <div className="chat-group-info">
                        <div className="chat-group-name">Study Community</div>
                        <div className="chat-group-members">{currentFeatureData.screenContent.members} members</div>
                      </div>
                    </div>
                    <div className="chat-messages">
                      {currentFeatureData.screenContent.messages?.map((msg, index) => (
                        <motion.div
                          key={index}
                          className={`chat-message ${msg.user === 'You' ? 'own-message' : ''}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="message-user">{msg.user}</div>
                          <div className="message-bubble">
                            <div className="message-text">{msg.text}</div>
                            <div className="message-time">{msg.time}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="chat-input">
                      <div className="input-placeholder">Type a message...</div>
                    </div>
                  </div>
                )}

                {/* Todo Task List View */}
                {currentFeatureData.type === 'todo' && currentFeatureData.screenContent.tasks && (
                  <div className="todo-view">
                    {currentFeatureData.screenContent.tasks.map((task, index) => (
                      <motion.div
                        key={index}
                        className={`todo-item ${task.completed ? 'completed' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="todo-checkbox">
                          {task.completed && <span className="checkmark">✓</span>}
                        </div>
                        <div className="todo-content">
                          <div className="todo-text">{task.text}</div>
                          <div className={`todo-priority priority-${task.priority}`}>{task.priority}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="laptop-base"></div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Text Content */}
      <div className="right-panel-text">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <h1 className="panel-title">{currentFeatureData.title}</h1>
            <p className="panel-subtitle">{currentFeatureData.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Dots */}
      <div className="nav-dots">
        {LOGIN_FEATURES.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`dot ${index === currentFeature ? 'active' : ''}`}
            onClick={() => setCurrentFeature(index)}
            aria-label={`Go to feature ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureShowcase;
