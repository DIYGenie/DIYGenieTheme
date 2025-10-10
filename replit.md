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
- **Project Details Display**: Shows real-time project info with a 16:9 preview image (with "Save image" overlay button), gradient CTA button "Open Detailed Build Plan", and 5 focused expandable sections using the `SectionCard` component:
  1. **Overview**: Skill level (beginner/intermediate/advanced), time/cost estimates, and safety warnings
  2. **Materials + Tools**: Combined shopping list with definite material prices and tool rental pricing ("if needed" notes)
  3. **Cut List**: Exact dimensions with copy-to-clipboard functionality (only shown if cuts exist)
  4. **Build Steps**: Interactive checkboxes for progress tracking, visual progress bar showing % complete, time estimates per step, strikethrough on completed items, auto-save to backend
  5. **Finishing**: Final touches section (only shown if finishing steps exist)
  
  Features depth with shadows, animated chevron rotation, #F8F7FF card backgrounds on #F5F3FF surface. Each section header navigates to DetailedInstructions with section anchor, chevron toggles expand/collapse. Includes offline mode indicator (green "OFFLINE ✓" badge when plan is cached), copy-to-clipboard actions for all sections, and progress persistence.
- **Plan Viewing**: 
  - `ProjectDetails`: At-a-glance expandable summary with interactive progress tracking. Features 3-4 main sections (Overview combines project info + time/cost/skill; Materials + Tools; Cut List; Build Steps) with checkboxes, progress bar, and copy-to-clipboard actions.
  - `DetailedInstructions`: Comprehensive visual builder's guide with rich formatting. Features purple header with stats, white card sections (Overview, Materials, Tools, Cut List), and visual step cards with:
    - Step numbers in purple circles with time estimates
    - Photo placeholders (200px) for visual guides
    - "What you're building" context in blue callouts
    - Per-step materials/tools callouts with icons
    - Pro tips in blue highlighted boxes
    - Quality checks in green highlighted boxes
    - Common mistakes/pitfalls in red highlighted boxes
    - Progress indicators (arrows) between steps
    - Save-to-photos functionality (captures each section individually)
- **Local Plan Storage & Fallback**: Utilizes AsyncStorage for plan caching, offering instant loading and fallback plans. Offline mode indicator shows when plan is available without internet connection.
- **Progress Tracking**: Database-backed progress tracking with `completed_steps` (array of completed step indices) and `current_step_index` fields. API endpoints at `/api/projects/:id/progress` (GET/POST) allow fetching and updating build progress. Frontend displays interactive checkboxes, visual progress bar, and "Start Building" / "Continue Building" CTAs.
- **Authentication**: Supabase email/password authentication via `AuthGate Provider` with sign-in, sign-up, and sign-out functionality.
- **AR Scan Event System**: Provides helpers for saving AR scan data (ROI) and managing the room scanning flow, integrating with the New Project Photo section.

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
- **Node.js/Express**: Backend API server with progress tracking endpoints.

### Database Schema (Supabase)
- **projects table**: Includes `completed_steps` (integer array) and `current_step_index` (integer) for progress tracking
- **Progress tracking**: Step completion state persists across sessions, allowing users to resume builds where they left off

### Platform Support
- **iOS, Android, Web**: Cross-platform deployment via Expo.