/**
 * Feature showcase constants for login and signup pages
 */

import type { Feature } from '../types';

export const LOGIN_FEATURES: Feature[] = [
  {
    title: 'Track your progress',
    subtitle: 'Monitor your learning journey and stay on top of your courses with real-time progress tracking',
    type: 'progress',
    screenContent: {
      header: 'My Courses',
      items: [
        { title: 'Introduction to Web Development', progress: 75, due: 'Due: Jan 15, 2025' },
        { title: 'Data Structures & Algorithms', progress: 45, due: 'Due: Jan 22, 2025' },
      ],
    },
  },
  {
    title: 'Collaborate with peers',
    subtitle: 'Connect with classmates, share ideas, and work together on projects seamlessly',
    type: 'collaboration',
    screenContent: {
      header: 'Study Community',
      messages: [
        { user: 'Sarah', text: 'Can someone help with the assignment?', time: '2m ago' },
        { user: 'Mike', text: 'Sure! I just finished it', time: '1m ago' },
        { user: 'You', text: 'Thanks! That would be great', time: 'Just now' },
      ],
      members: 12,
    },
  },
  {
    title: 'Manage your tasks',
    subtitle: 'Stay organized with a simple todo list to track assignments, deadlines, and personal goals',
    type: 'todo',
    screenContent: {
      header: 'My Tasks',
      tasks: [
        { text: 'Complete Web Dev Assignment 3', completed: false, priority: 'high' },
        { text: 'Study for Algorithms Midterm', completed: false, priority: 'high' },
        { text: 'Review Chapter 5 Notes', completed: true, priority: 'medium' },
        { text: 'Submit Project Proposal', completed: true, priority: 'low' },
      ],
    },
  },
];

export const SIGNUP_FEATURES: Feature[] = [
  {
    title: 'Join a learning community',
    subtitle: 'Connect with peers and instructors to enhance your academic journey',
    type: 'community',
    screenContent: {
      header: 'Welcome to PeerSpace',
      stats: [
        { label: 'Active Students', value: '10,000+' },
        { label: 'Instructors', value: '500+' },
        { label: 'Courses', value: '1,200+' },
      ],
    },
  },
  {
    title: 'Track your progress',
    subtitle: 'Monitor your learning journey and stay on top of your courses',
    type: 'progress',
    screenContent: {
      header: 'My Courses',
      items: [
        { title: 'Introduction to Web Development', progress: 75, due: 'Due: Jan 15, 2025' },
        { title: 'Data Structures & Algorithms', progress: 45, due: 'Due: Jan 22, 2025' },
      ],
    },
  },
  {
    title: 'Collaborate seamlessly',
    subtitle: 'Work together with classmates on projects and assignments',
    type: 'collaboration',
    screenContent: {
      header: 'Study Community',
      messages: [
        { user: 'Sarah', text: 'Can someone help with the assignment?', time: '2m ago' },
        { user: 'Mike', text: 'Sure! I just finished it', time: '1m ago' },
        { user: 'You', text: 'Thanks! That would be great', time: 'Just now' },
      ],
      members: 12,
    },
  },
];

export const FEATURE_CYCLE_INTERVAL = 5000; // 5 seconds
