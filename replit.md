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
- **Project Details Display**: Shows real-time project info with a 16:9 preview image (with "Save image" overlay button and caption), dynamic header, single "Open Detailed Build Plan" CTA button, and an expandable summary list (Overview, Steps, Materials, Tools, Cuts, Time & Cost) using the `PlanSummaryList` component. Each block features #F3E8FF purple tint backgrounds, subtle shadows, and tap-to-expand inline summaries. Includes data caching, AI preview generation, and save-to-photos functionality.
- **Plan Viewing**: `ProjectDetails` provides an at-a-glance expandable summary list, while `DetailedInstructionsScreen` offers a full document-style linear guide using DocAtoms components with save-to-photos functionality.
- **Local Plan Storage & Fallback**: Utilizes AsyncStorage for plan caching, offering instant loading and fallback plans.
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
- **Node.js/Express**: Backend API server.

### Platform Support
- **iOS, Android, Web**: Cross-platform deployment via Expo.