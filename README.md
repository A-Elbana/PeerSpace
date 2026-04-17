<div align="center">

<img src="./client/src/assets/PeerSpace_PNG_LOGO.png" alt="PeerSpace Logo" width="200"/>

# 🎓 PeerSpace

### *The Modern Academic Collaboration Platform*

**Empowering students, instructors, and administrators with seamless communication, intelligent content management, and real-time collaboration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-4.1-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 🌟 Overview

**PeerSpace** is a next-generation learning management platform designed to bridge the gap between students, instructors, and administrators. With a focus on performance, accessibility, and delightful user experience, PeerSpace transforms traditional educational workflows into modern, efficient, and engaging interactions.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React SPA]
        B[Tailwind v4 Styling]
        C[React Router]
        D[Context API]
    end

    subgraph "API Layer"
        E[Express Server]
        F[JWT Authentication]
        G[REST API Endpoints]
        H[Socket.IO Server]
    end

    subgraph "Business Logic"
        I[Student Controller]
        J[Instructor Controller]
        K[Admin Controller]
        L[Post Controller]
        M[Community Controller]
    end

    subgraph "Data Layer"
        N[Prisma ORM]
        O[(PostgreSQL)]
    end

    subgraph "External Services"
        P[Cloudinary Storage]
        Q[File Upload Service]
    end

    A --> E
    B --> A
    C --> A
    D --> A
    
    E --> F
    E --> G
    E --> H
    
    G --> I
    G --> J
    G --> K
    G --> L
    G --> M
    
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N
    
    N --> O
    
    L --> P
    M --> P
    Q --> P

    style A fill:#61DAFB,stroke:#333,stroke-width:2px
    style E fill:#339933,stroke:#333,stroke-width:2px
    style O fill:#336791,stroke:#333,stroke-width:2px
    style P fill:#3448C5,stroke:#333,stroke-width:2px
```

---

## 👥 User Flow Diagram

```mermaid
flowchart TD
    Start([User Visits PeerSpace]) --> Auth{Authenticated?}
    
    Auth -->|No| Login[Login/Signup Page]
    Login --> RoleSelect{Select Role}
    
    RoleSelect -->|Student| StudentDash[Student Dashboard]
    RoleSelect -->|Instructor| InstructorDash[Instructor Dashboard]
    RoleSelect -->|Admin| AdminDash[Admin Dashboard]
    
    Auth -->|Yes| RoleCheck{Check Role}
    RoleCheck -->|Student| StudentDash
    RoleCheck -->|Instructor| InstructorDash
    RoleCheck -->|Admin| AdminDash
    
    %% Student Flow
    StudentDash --> S1[Explore Feed]
    StudentDash --> S2[View Assignments]
    StudentDash --> S3[Manage Tasks]
    StudentDash --> S4[Join Communities]
    
    S1 --> S1A[Filter by Type]
    S1A --> S1B[Read Posts]
    S1B --> S1C[Comment & Discuss]
    
    S2 --> S2A[Submit Assignment]
    S2A --> S2B[Upload Files]
    S2B --> S2C[View Grades]
    
    S3 --> S3A[Create Task]
    S3A --> S3B[Track Progress]
    
    S4 --> S4A[Search Communities]
    S4A --> S4B[Enroll]
    
    %% Instructor Flow
    InstructorDash --> I1[Manage Content]
    InstructorDash --> I2[Create Assignments]
    InstructorDash --> I3[Grade Submissions]
    InstructorDash --> I4[Manage Community]
    
    I1 --> I1A[Post Announcement]
    I1 --> I1B[Upload Materials]
    I1 --> I1C[Create Discussion]
    
    I2 --> I2A[Set Deadline]
    I2A --> I2B[Attach Files]
    
    I3 --> I3A[Review Submissions]
    I3A --> I3B[Provide Feedback]
    I3B --> I3C[Assign Grades]
    
    I4 --> I4A[Manage Members]
    I4A --> I4B[View Analytics]
    
    %% Admin Flow
    AdminDash --> A1[User Management]
    AdminDash --> A2[Community Oversight]
    AdminDash --> A3[Platform Analytics]
    AdminDash --> A4[System Settings]
    
    A1 --> A1A[View All Users]
    A1A --> A1B[Assign Roles]
    
    A2 --> A2A[Monitor Communities]
    A2A --> A2B[Moderate Content]
    
    A3 --> A3A[View Metrics]
    A3A --> A3B[Generate Reports]

    style StudentDash fill:#10b981,stroke:#333,stroke-width:2px,color:#fff
    style InstructorDash fill:#3b82f6,stroke:#333,stroke-width:2px,color:#fff
    style AdminDash fill:#8b5cf6,stroke:#333,stroke-width:2px,color:#fff
```

---

## 🚀 Feature Matrix

<table>
<tr>
<th width="33%">👨‍🎓 Students</th>
<th width="33%">👨‍🏫 Instructors</th>
<th width="33%">👨‍💼 Administrators</th>
</tr>
<tr>
<td valign="top">

**Explore & Learn**
- 📚 Interactive feed with post-type filtering
- 📥 Material downloads & document viewer
- 📢 Filtered announcements feed
- 🔍 Mutual community discovery
- 💬 Threaded discussions with approval system

**Assignments & Tasks**
- 📝 Assignment submission with file uploads
- ✅ Personal task management
- 📊 Grade tracking & dashboard
- 🏆 Achievement badges

**Social & Community**
- 👥 User profiles with avatars
- 🔗 Community enrollment
- 💡 Comment & reply system
- 🎯 Mutual connection search

</td>
<td valign="top">

**Content Management**
- 📢 Announcement creation & distribution
- 📚 Material uploads & organization
- 📝 Post creation (Discussions, Materials, Announcements)
- 🗂️ File management with Cloudinary

**Teaching Tools**
- 📊 Dashboard analytics & insights
- 📝 Assignment creation & management
- ✍️ Grading flow with feedback
- 👨‍🎓 Student submission review

**Community Control**
- 🏫 Community management dashboard
- 📈 Unresolved posts tracking
- ✅ Comment approval system
- 📋 Enrollment management

</td>
<td valign="top">

**Platform Oversight**
- 👥 User management (CRUD)
- 🏫 Community management
- 📊 Global analytics dashboard
- 🔍 Advanced search & filtering

**System Administration**
- 📝 Post moderation tools
- 🔐 Role assignment
- 📋 Activity logs
- 🛡️ Security settings

**Reporting**
- 📈 Platform-wide metrics
- 👨‍🎓 User statistics
- 📚 Content analytics
- 🎯 Engagement tracking

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2 + TypeScript
- **Styling**: Tailwind CSS v4 with custom design system
- **Routing**: React Router v7
- **State Management**: React hooks + Context API
- **UI Components**: Radix UI primitives
- **Rich Text**: TipTap editor with Markdown support
- **Notifications**: Sonner toast system
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build Tool**: Vite 7

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express 5
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **File Storage**: Cloudinary
- **Real-time**: Socket.IO
- **API Docs**: Swagger/OpenAPI
- **Security**: bcrypt, CORS, rate limiting

---

## 🚀 Live Demo

**Experience PeerSpace now!**

🌐 **[Visit PeerSpace](https://peer-space-mocha.vercel.app)**

---

## 🤝 Meet the Team

<table>
<tr>
<td align="center" width="200">

<br />
<b>Ahmed Elnaggar</b>

<br />
<a href="https://github.com/The-Naggar">GitHub</a>
</td>
<td align="center" width="200">

<br />
<b>Ahmed Wagih</b>

<br />
<a href="https://github.com/Ahmed-WaGiiH">GitHub</a>
</td>
<td align="center" width="200">

<br />
<b>Abdelrahaman Elbana</b>

<br />
<a href="https://github.com/A-Elbana">GitHub</a>
</td>
<td align="center" width="200">

<br />
<b>Ahmed Kamal</b>

<br />
<a href="https://github.com/Ahmed-Mahmoud-Kamal">GitHub</a>
</td>
</tr>
</table>

---

## 📸 Screenshots

<details>
<summary><b>🖼️ Click to view screenshots</b></summary>

### Student Dashboard
![Dashboard Preview](./client/src/assets/dashboard-screenshot.png)

### Explore Feed - Light Mode
![Feed Preview](./client/src/assets/feed-light-screenshot.png)

### Explore Feed - Dark Mode
![Dark Mode](./client/src/assets/feed-dark-screenshot.png)

</details>

---

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/) for the amazing styling framework
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Prisma](https://www.prisma.io/) for the elegant database toolkit
- [Cloudinary](https://cloudinary.com/) for media management
- The open-source community for inspiration and support

---

<div align="center">

**Made with ❤️ by the PeerSpace Team**

[⭐ Star us on GitHub](https://github.com/A-Elbana/peerspace) • [🐛 Report Bug](https://github.com/A-Elbana/peerspace/issues) • [✨ Request Feature](https://github.com/A-Elbana/peerspace/issues)

</div>
