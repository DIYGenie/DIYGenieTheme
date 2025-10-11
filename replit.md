# DIY Genie

## Overview
DIY Genie is a React Native mobile application built with Expo, designed to assist users with DIY projects. Its purpose is to empower users to visualize and execute their DIY projects efficiently, following the tagline "Wish. See. Build.". The application offers a gradient-based interface with a welcome screen and three core sections: Home, Projects, and Profile, targeting cross-platform deployment (iOS, Android, and Web).

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a component-based React Native architecture with React Navigation v7 for navigation (hybrid stack and tab navigation), built on Expo SDK 54. It features a centralized theme system, React's built-in state management, and typed navigation for type-safe routing.

### Visual Design
The design is modern and clean, utilizing white backgrounds, dark text, and a purple brand primary color (#7C3AED / purple-600) for CTAs and gradients. A centralized UI kit (`app/ui/`) provides reusable components, theme tokens, and a unified button system. Layouts use `SafeAreaView` and consistent spacing with `Ionicons` for iconography.

### Core Features & Technical Implementations
- **Navigation**: Structured with `AppNavigator` (root stack), `RootTabs` (bottom tab navigator), and `ProjectsNavigator` (nested stack).
- **Backend Integration**: Uses an Express.js backend for project and entitlement management, with direct fetch calls.
- **Image Upload**: Supports server-side multer for project images and client-side Supabase Storage for room scans, including signed URLs and metadata tracking.
- **New Project Workflow**: Guides users through project creation with form validation, versioned draft persistence to AsyncStorage, and smart navigation. Includes robust error handling and project name sanitization.
- **Build with AI on NewProject**: Features primary (visual mockup) and secondary (plan only) CTAs for building projects, displaying loading states and graceful error handling.
- **Visual AI Preview Integration**: Live preview generation system for "Build with visual mockup" button, with parallel plan and preview job execution, plan-first polling, and background preview completion. Preview URLs persist in project records. Cache warming ensures ProjectDetails loads populated on first arrival. Projects are automatically marked as 'active' when plan is ready.
- **Immediate Plan Loading**: Plan content loads instantly on first arrival to ProjectDetails, with `useFocusEffect` triggering `loadPlanIfNeeded()` and cache-busting for fresh data.
- **Project Details Display**: Shows real-time project info with a single hero image system (`preview_url` → scan image → skeleton if queued/processing → nothing`) and 5 focused expandable sections using `SectionCard` (Overview, Materials + Tools, Cut List, Build Steps, Finishing). Includes progress tracking, preview status polling, always-fresh plan refetch on focus, and an icon-only "Save to Photos" button (44px tap target).
- **Plan Viewing**:
    - `ProjectDetails`: At-a-glance expandable summary with interactive progress tracking.
    - `DetailedInstructions`: Comprehensive visual builder's guide with rich formatting, including step numbers, photo placeholders, context callouts, pro tips, quality checks, and common pitfalls.
- **Local Plan Storage & Fallback**: Utilizes AsyncStorage for plan caching, offering instant loading and fallback plans, with an offline mode indicator.
- **Progress Tracking**: Database-backed progress tracking with `completed_steps` and `current_step_index` fields via `/api/projects/:id/progress` endpoints.
- **Authentication**: Supabase email/password authentication via `AuthGate Provider`, with sign-in, sign-up, and sign-out functionality, and authentication guards in the project creation flow.
- **AR Scan Event System**: Provides helpers for saving AR scan data (ROI) and managing the room scanning flow.
- **AR Session Scaffolding**: iOS AR preparation with ARKit permissions and a lightweight AR session facade.
- **AR Measurement Flow (FEATURE_MEASURE)**: End-to-end measurement system for processing AR scans and displaying dimensions, including API helpers for starting and polling measurement status, and UI states for "Measuring…" and completed measurements.
- **AR ROI Gesture System**: Enhanced touch handling for a draggable ROI overlay in ScanScreen, with bounds measurement, `pointerEvents` attributes, corner handles for resizing, and full rect dragging for repositioning. Includes a Save Snapshot feature.

## External Dependencies

### Core Framework Dependencies
- **Expo SDK 54**
- **React Navigation v7**
- **React Native 0.80**

### UI and Design Dependencies
- **Expo Linear Gradient**
- **Expo Google Fonts**
- **Expo Vector Icons (Ionicons)**
- **React Native Safe Area Context**
- **Expo Haptics**
- **Expo Clipboard**
- **React Native View Shot**
- **Expo Media Library**

### Data and Backend Integration
- **Supabase (@supabase/supabase-js, @supabase/functions-js)**: Database, authentication, and storage.
- **Node.js/Express**: Backend API server with progress tracking endpoints and project status management.
- **Project Status Management**: Automatic status promotion from draft to 'active' when plan is ready, with frontend filtering on ProjectsScreen (All/Active/Completed tabs).

### Database Schema (Supabase)
- **projects table**: Includes `completed_steps` (integer array) and `current_step_index` (integer) for progress tracking.

### Platform Support
- **iOS, Android, Web**: Cross-platform deployment via Expo.