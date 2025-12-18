# Project Context

## Purpose
XPMN Explorer is a comprehensive BPMN/XPMN diagram editor built on Vue 3 and TypeScript. The project enables users to create, edit, and visualize business process diagrams with full XPMN 2.0 support. It provides a modern, intuitive interface for workflow modeling with features like custom context pads, properties panels, and real-time diagram editing.

## Tech Stack
- **Frontend Framework**: Vue 3 with Composition API
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **BPMN Engine**: bpmn-js v11.5.0
- **BPMN Library**: vue-bpmn v0.3.0
- **Properties Panel**: bpmn-js-properties-panel, @bpmn-io/properties-panel
- **Diagram Engine**: diagram-js v15.4.0
- **Router**: Vue Router v4.6.3
- **XML Processing**: xml2js, xml-formatter
- **Testing**: Jest with @vue/test-utils, ts-jest
- **Package Manager**: npm

## Project Conventions

### Code Style
- Use TypeScript strict mode with explicit types
- Prefer Composition API over Options API for Vue components
- Use kebab-case for component file names and element names
- Use PascalCase for component names in imports
- Use camelCase for variables and functions
- File path aliases: `@/` maps to `src/`
- Include type definitions for all function parameters and returns
- Use async/await for asynchronous operations
- Include JSDoc comments for complex functions

### Architecture Patterns
- **Component Structure**: Single File Components (SFC) with `<template>`, `<script setup>`, `<style scoped>`
- **State Management**: Reactive refs and computed properties (no Vuex/Pinia currently)
- **Service Layer**: Separate service files for business logic (e.g., `localStorageService.ts`, `llmService.ts`)
- **Extension System**: Modular extensions under `src/extensions/` for custom BPMN features
- **Adapter Pattern**: BpmnAdapter for converting between XPMN and BPMN formats
- **Router**: Vue Router for navigation between views
- **Type Safety**: Centralized type definitions in `src/types/index.ts`
- **Separation of Concerns**: UI components in `src/components/`, business logic in `src/services/`

### Testing Strategy
- Unit tests using Jest and @vue/test-utils
- Test files located in `__tests__/` directories alongside source files
- Test file naming: `*.test.ts`
- Run tests with: `npm test`
- Watch mode: `npm run test:watch`
- Coverage reports: `npm run test:coverage`
- Focus on testing service layer and adapter logic
- Component tests for complex UI interactions

### Git Workflow
- **Main Branch**: `master`
- **Feature Branches**: `feature/[feature-name]`
- **Current Branch**: `feature/futu`
- Commit messages should be descriptive and follow conventional format
- Use meaningful branch names that describe the feature or fix
- Keep commits atomic and focused on single concerns

## Domain Context
- **BPMN 2.0**: Business Process Model and Notation standard for workflow diagrams
- **XPMN**: Extended Process Modeling Notation, a variant/extension of BPMN
- **Diagram Elements**: Start events, tasks, end events, sequence flows, gateways
- **Context Pad**: UI element that appears when selecting diagram elements, provides quick actions
- **Properties Panel**: Right-side panel for editing element attributes
- **Palette**: Left-side panel with available diagram elements
- **Modeler**: The core bpmn-js component that handles diagram rendering and editing
- **XML Format**: BPMN diagrams are stored as XML with specific namespace conventions
- **Format Conversion**: The project converts between XPMN (namespace-less) and BPMN (namespaced) formats
- **BpmnAdapter**: Core component in `src/extensions/xflow/BpmnAdapter/` that handles bidirectional conversion between XPMN and BPMN formats

## Important Constraints
- BPMN diagrams must be valid XML conforming to BPMN 2.0 specification
- File size limit for uploads: 10MB
- Supported file formats: .bpmn, .xml, .xpmn
- Browser compatibility: Modern browsers with ES6+ support
- Local storage used for auto-save functionality
- XPMN format uses non-namespaced elements while BPMN uses `bpmn:` prefix
- XPMN file's DTD is located at `xpmn.dtd`
- XFlow extensions use `xflow:` prefix and must be wrapped in `bpmn:extensionElements`

## External Dependencies
- **bpmn-js**: Core BPMN rendering and modeling library from bpmn.io
- **diagram-js**: Low-level diagramming framework used by bpmn-js
- **vue-bpmn**: Vue 3 wrapper for bpmn-js integration
- **Local Storage**: Browser storage for diagram persistence
- **File System API**: For file upload/download operations
- **No external backend**: Currently a client-side only application
