# Components Structure (Feature-Sliced Design)

This directory follows the Feature-Sliced Design (FSD) architectural pattern:

## Structure

```
components/
├── shared/          # Reusable UI components, utilities, configs
│   ├── ui/         # Generic UI components (buttons, inputs, etc.)
│   ├── lib/        # Shared utilities and helpers
│   └── config/     # Shared configuration
├── entities/        # Business entities
│   ├── user/       # User entity (models, stores, etc.)
│   └── auth/       # Authentication entity
├── features/        # Specific business features
│   ├── auth/
│   │   ├── login/  # Login functionality
│   │   └── profile/ # Profile management
│   └── user-management/ # Admin user management
└── widgets/         # Complex UI widgets
    ├── header/     # Application header
    ├── sidebar/    # Navigation sidebar
    └── layout/     # Layout components
```

## Guidelines

- **shared/**: Generic, reusable components and utilities
- **entities/**: Business logic and data models
- **features/**: Self-contained feature implementations
- **widgets/**: Complex UI components that combine features and entities