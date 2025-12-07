/**
 * Role configuration constants
 */

import { GraduationCap, UserCircle, Shield } from 'lucide-react';
import type { RoleConfig } from '../types';

export const ROLES: RoleConfig[] = [
  {
    id: 'student',
    name: 'Student',
    icon: GraduationCap,
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  },
  {
    id: 'instructor',
    name: 'Instructor',
    icon: UserCircle,
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: Shield,
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  },
];

export const BLUE_GRADIENT = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
