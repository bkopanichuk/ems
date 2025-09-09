PRD

0) Objective

Deliver a clean, production-grade skeleton of a web application to be extended later. Requirements:

Backend: Node.js + Express.js + TypeScript.

Frontend: Vue (Nuxt.js) + shadcn + TypeScript; Composition API; FSD inside components/.

Database: PostgreSQL with Prisma as the ORM.

Deployment: docker-compose for both dev and prod.

Code: maintainable, tested, and written to industry standards.

1) Personas & Roles

User

Logs in by login (username) and password (no email).

Sees an empty screen with a top toolbar and an empty left menu.

Profile icon (top-right) → Profile page: can set/change display name and password.

Admin

Credentials (login + password) are set via env.

After login: empty screen with top toolbar and a left menu.

Profile icon (top-right) → Profile page: can set/change display name.

Left menu includes User Management:

View users.

Create user (set login and password).

Delete user.

Block/unblock user.

Assign role to user.

Constraints

No self-registration. Only login. Users are created by Admin.

Authentication uses login (username), not email.

2) In-Scope Features (MVP)
2.1 Authentication

Login form: login (username) + password.

Deny access to blocked users.

No registration UI.

2.2 User Shell (both roles)

After login: empty main view.

Top toolbar with profile icon (top-right).

Left menu:

User: empty.

Admin: includes User Management.

2.3 Profile Page

User: update display name; change password.

Admin: update display name.

2.4 User Management (Admin only)

List users.

Create user (login + password).

Delete user.

Block/unblock user.

Assign role to user.

3) Non-Functional Requirements

Maintainability: clear structure; code readability suitable for long-term growth.

Testing: automated tests present (backend and frontend) to an industry-quality level.

Standards: follow best industry patterns across backend, frontend, and project layout.

4) Tech Stack (Fixed)

Backend: Node.js, Express.js, TypeScript.

Frontend: Nuxt.js (Vue), shadcn, TypeScript, Composition API, FSD within components/.

Database & ORM: PostgreSQL with Prisma.

Deployment: docker-compose for dev and prod environments.

5) Acceptance Criteria
Authentication

Logging in requires login (username) and password.

No email field anywhere in auth.

Blocked users cannot access the app.

User Shell & Navigation

Post-login shell shows top toolbar and left menu.

For User role: left menu is empty.

For Admin role: left menu includes User Management.

Profile

Clicking the profile icon opens the Profile page.

User can change display name and password.

Admin can change display name.

User Management (Admin)

Page shows a table/list of users.

Admin can create a user by specifying login and password.

Admin can delete a user.

Admin can block/unblock a user.

Admin can assign a role to a user.

Deployment

The application can be started for dev and prod via docker-compose.

Admin credentials are consumed from environment variables.

Prisma is used as the ORM with PostgreSQL.