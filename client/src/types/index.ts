/**
 * Type definitions for the PeerSpace application
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export type UserRole = 'student' | 'instructor' | 'admin';

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface SignupCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface RoleConfig {
  id: UserRole;
  name: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  gradient: string;
}

export interface Feature {
  title: string;
  subtitle: string;
  type: 'progress' | 'collaboration' | 'todo' | 'community';
  screenContent: ScreenContent;
}

export interface ScreenContent {
  header: string;
  items?: CourseItem[];
  messages?: Message[];
  tasks?: Task[];
  stats?: Stat[];
  members?: number;
}

export interface CourseItem {
  title: string;
  progress: number;
  due: string;
}

export interface Message {
  user: string;
  text: string;
  time: string;
}

export interface Task {
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface Stat {
  label: string;
  value: string;
}
