import {
  LayoutDashboard,
  Compass,
  ClipboardList,
  FileCheck,
  Megaphone,
  Book,
  CheckSquare,
  User,
  Settings,
} from "lucide-react";

type UserRole = "student" | "instructor" | "admin";

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  path?: string;
  badge?: number;
  roleRestriction?: UserRole[];
}

export const mainNavItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  { id: "explore", label: "Explore", icon: Compass, path: "/explore" },
  {
    id: "assignments",
    label: "Assignments",
    icon: ClipboardList,
    path: "/assignments",
    roleRestriction: ["student", "instructor"],
  },
  {
    id: "submissions",
    label: "My Submissions",
    icon: FileCheck,
    path: "/submissions",
    roleRestriction: ["student", "instructor"],
  },
  {
    id: "announcements",
    label: "Announcements",
    icon: Megaphone,
    path: "/announcements",
    roleRestriction: ["student", "instructor"],
  },
  { id: "notes", label: "Notes", icon: Book, path: "/notes" },
  {
    id: "tasks",
    label: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
    roleRestriction: ["student"],
  },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

export const secondaryNavItems: NavItem[] = [
  { id: "settings", label: "Edit Profile", icon: Settings, path: "/settings" },
];

export type { UserRole };
