# DIY Genie

## Overview
DIY Genie is a React Native mobile application built with Expo, designed to assist users with DIY projects. Its purpose is to empower users to visualize and execute their DIY projects efficiently, following the tagline "Wish. See. Build.". The application offers a gradient-based interface with a welcome screen and three core sections: Home, Projects, and Profile, targeting cross-platform deployment (iOS, Android, and Web).

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a component-based React Native architecture with React Navigation v7 for navigation (hybrid stack and tab navigation), built on Expo SDK 54. It features a centralized theme system, React's built-in state management, and typed navigation for type-safe routing. A `useSafeBack` hook provides intelligent back navigation.

### Visual Design
The design is modern and clean, utilizing white backgrounds, dark text, and a **purple brand primary color (#7C3AED / purple-600)** for CTAs and gradients. A centralized UI kit (`app/ui/`) provides reusable components, theme tokens, and a unified button system. Layouts use `SafeAreaView` and consistent spacing with `Ionicons` for iconography.

### Core Features & Technical Implementations
- **Navigation**: Structured with `AppNavigator` (root stack), `RootTabs` (bottom tab navigator), and `ProjectsNavigator` (nested stack). Canonical route names are centralized for consistency.
- **Component Reusability**: Key components include `AccordionCard`, `SuggestionsBox`, `PromptCoach`, and `PlanTabs` (for displaying project plan data).
- **Backend Integration**: Uses an Express.js backend for project and entitlement management, with direct fetch calls. `fetchMyProjects()` provides a unified, session-aware project loader.
- **Data Refresh**: Automatic refetching on screen focus (`useFocusEffect`) and native pull-to-refresh (`RefreshControl`) ensure data currency.
- **Image Upload**: Dual system with server-side multer for project images and client-side Supabase Storage for room scans, including signed URLs and metadata tracking. Features loading states, permission-free photo picker, and Supabase client configured for session persistence.
- **New Project Workflow**: Guides users through project creation with form validation, draft persistence to AsyncStorage, and smart navigation to `ProjectDetails`. Features guided field validation with shake animations and scrolling.
- **Project Details Display**: Shows real-time project info, latest scan, and a dynamic header. Fetches markdown plan via `fetchProjectPlanMarkdown()`, parses it with `parsePlanMarkdown()` from `app/lib/plan.ts`, and displays via `PlanTabs` component (Overview, Materials, Cuts, Tools, Steps, Time & Cost) with real API data.
- **Plan Viewing**: `OpenPlanScreen` offers a comprehensive single-page scrollable plan view with "Save to Photos" functionality. `DetailedInstructionsScreen` fetches and parses markdown plan data, provides a linear saveable guide with section-by-section capture. Both use `parsePlanMarkdown()` to transform API markdown into structured `Plan` objects.
- **Plan Waiting Screen**: `PlanWaiting` screen with auto-polling (2-second intervals) that navigates to ProjectDetails when plan is ready. All project card taps (Home and Projects list) check plan readiness via `fetchProjectPlanMarkdown()` before routing - if 409 (not ready), routes to PlanWaiting; if 200 (ready), routes to ProjectDetails. NewProject routes to PlanWaiting after build trigger. ProjectDetails header badge shows "Plan ready" only when `planObj` exists (actual parsed data), not just status field.
- **Authentication**: Supabase email/password authentication enforced by `AuthGate Provider`, blocking app access until a session exists. Includes sign-in, sign-up with email confirmation, and sign-out.
- **Error Handling**: Comprehensive API and storage error handling.
- **Profile & Billing**: Manages user entitlements and integrates with Stripe for subscription management.
- **UX Enhancements**: Custom toast notifications, debounce hook, haptic feedback (`PressableScale` component), detailed loading states (skeletons), and an empty state component. Includes a pre-permission bottom sheet for camera access and a health ping system.
- **Room Scanning**: Uses `expo-camera` for live preview, photo capture, and review. Integrates with NewProject via an event bridge. ROI region persistence saves normalized rectangle coordinates to the database using a `DraggableRect` component.
- **New Project Photo Section**: Simple upload-only interface for V1, displaying "Scan room" and "Upload Photo" options.
- **Home Screen "How it works"**: Features a 2x2 grid of reusable `HowItWorksTile` components with micro-interactions and accessibility features, deep-linking to relevant sections.

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

### Data and Backend Integration
- **Supabase (@supabase/supabase-js, @supabase/functions-js)**: Database, authentication, and storage.
- **Node.js/Express**: Backend API server.

### Development and Performance Dependencies
- **React Native Screens**
- **Expo Status Bar**

### Platform Support
- **iOS, Android, Web**: Cross-platform deployment via Expo.