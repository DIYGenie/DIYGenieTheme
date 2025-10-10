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
- **New Project Workflow**: Guides users through project creation with form validation, versioned draft persistence to AsyncStorage (`newProjectDraft:v1`), and smart navigation to `ProjectDetails`. Features guided field validation with shake animations, scrolling, and auto-save with 250ms debounce. Draft hydrates once on mount and persists on change with full form preservation when navigating to/from scan screens. **Form Preservation**: NewProject tab uses `unmountOnBlur: false` to keep screen alive; ScanScreen navigates back with `merge: true` to preserve state; draft is explicitly persisted before scan/upload navigation; savedScan handler only updates scan card without re-hydration or form reset; no auto-clear on blur - user must explicitly tap "Clear Form" to reset. Unified project creation via `ensureProjectForDraft()` helper used before scan/upload/build actions: validates inputs (name ≥3 chars, description ≥10 chars, budget: $|$$|$$$, skill: Beginner|Intermediate|Advanced), creates project via `createProjectAndReturnId()` API helper that handles all server response shapes (body.id, body.item.id, body.project_id, body.project.id, body.data.id, body.data.project_id), shows real server error messages via Alert with e.userMessage, persists projectId to AsyncStorage on success, and never clears draft. All handlers (onScanRoom, onUploadPhoto, generatePreview, onBuildWithoutPreview) use this helper for consistent error messaging and guaranteed project ID retrieval. **Name Sanitization & Fallback**: Project names are automatically sanitized before server submission using `sanitizeProjectName()` which removes emojis, control characters, and limits to A-Za-z0-9 space _.-' (max 60 chars). If sanitization yields empty/invalid result (e.g., emoji-only input), automatically generates fallback name: "DIY Project YYYY-MM-DD HH:MM:SS" or uses first 3 words from description + timestamp. If server returns 422 invalid_name, automatically retries once with fresh timestamp-based fallback. Shows clear error message: "Project title has characters the server does not accept. Use letters, numbers, spaces, and -_. (3–60 chars)." Sanitized/fallback name is persisted to draft so UI reflects clean version. **Robust Error Handling**: `createProjectAndReturnId()` in `app/lib/api.ts` guarantees project ID or throws actionable error with actual server message - never shows generic "Server did not return a project id" error.
- **Build with AI on NewProject**: Two primary CTA buttons on NewProject screen for building projects. **CTAButton Component**: Inline component with title/subtitle layout, primary (purple #6D28D9) and secondary (white with purple border) variants, proper disabled states. **Build with visual mockup** (primary): Requests preview via `requestProjectPreview()` then builds plan with `pollProjectReady()` - auto-navigates to ProjectDetails when ready. **Build plan only** (secondary): Builds plan directly without preview request. Both buttons disabled until form is valid (title ≥3, description ≥10, budget, skill level). **Graceful Error Handling**: Handles 409 "preview_already_used" with friendly alert and navigation; treats 404/422 as soft success. **Loading Banner**: When building (`isBuilding` state), displays purple-themed loading banner above CTA buttons with "Building your plan…" message, disables all inputs/buttons with `pointerEvents: 'none'` and 0.6 opacity, shows timeout alert after 60 seconds if plan doesn't complete. **Form Clearing**: After successful build, clears all form fields including `lastScan` (AR scan card disappears), persisted draft, and in-memory state before auto-navigating to ProjectDetails via `CommonActions.reset()`. Uses `clearingRef` to prevent auto-save conflicts during clear operation.
- **Project Details Display**: Shows real-time project info, latest scan, and a dynamic header. Displays five accordion cards (Materials, Cuts, Tools, Steps, Time & Cost) with smooth animations. Materials open by default, others collapsed. Fetches and parses plan via `parsePlanMarkdown()` from `app/lib/plan.ts`. **AI Preview Generation**: "Generate AI Preview" CTA button appears when project exists and preview isn't ready or building. Calls `requestProjectPreview()` API function (POST to `/api/projects/:id/preview`), shows toast feedback, and refreshes project state. Button uses purple brand color (#7C3AED) with disabled state during loading.
- **Plan Viewing**: `ProjectDetails` displays at-a-glance accordion cards (Materials, Cuts, Tools, Steps, Time & Cost) with Materials open by default. `DetailedInstructionsScreen` provides a deep, linear guide with rich document-style formatting using DocAtoms components. Both use `parsePlanMarkdown()` to transform API markdown into structured `Plan` objects.
- **Plan Auto-Navigation**: All project card taps (Home and Projects list) check plan readiness via `fetchProjectPlanMarkdown()` before routing - if 409 (not ready) or 200 (ready), routes directly to ProjectDetails which handles its own loading state. NewProject uses in-place loading banner - polls status with `pollProjectReady()` and auto-navigates to ProjectDetails when complete. ProjectDetails header badge shows "Plan ready" only when `planObj` exists (actual parsed data), not just status field.
- **Local Plan Storage & Fallback**: `app/lib/localPlan.ts` provides AsyncStorage-based plan caching and a generator function for fallback plans. `fetchProjectPlanMarkdown()` checks local storage first before hitting the API. NewProject pre-seeds a local plan immediately after build trigger, allowing instant navigation to ProjectDetails with a usable plan while the real plan builds in the background.
- **Authentication**: Supabase email/password authentication enforced by `AuthGate Provider`, blocking app access until a session exists. Includes sign-in, sign-up with email confirmation, and sign-out.
- **Error Handling**: Comprehensive API and storage error handling.
- **Profile & Billing**: Manages user entitlements and integrates with Stripe for subscription management.
- **UX Enhancements**: Custom toast notifications, debounce hook, haptic feedback (`PressableScale` component), detailed loading states (skeletons), and an empty state component. Includes a pre-permission bottom sheet for camera access and a health ping system.
- **AR Scan Event System**: `app/lib/scanEvents.ts` provides safe scan helpers: `saveArScan()` saves ROI directly to room_scans.roi column (JSONB), inserts with source='ar' and image_url=null (no camera yet), selects id and image_url, and enforces defensive projectId check throwing PROJECT_ID_REQUIRED if missing. Returns scanId, imageUrl, and source:'ar'. ScanScreen navigates back to NewProject with savedScan param, which is consumed via useFocusEffect with force re-hydration to preserve all form fields.
- **Room Scanning Flow**: AR scan scaffolding with placeholder ScanScreen (no camera feed yet). Platform-aware: shows alert on web, navigates to ScanScreen on mobile with projectId param. Form validation guards prevent 422 errors by requiring name ≥3 chars, description ≥10 chars, budget, and skill_level before project creation. Route typing uses 'ScanScreen' key for proper param flow. After scan save, navigates back to NewProject with savedScan param. NewProject consumes param via useFocusEffect, displays "Saved scan (AR)" card, and clears param. No auto-build triggers - plans only generate when user taps "Generate AI Preview" or "Build Plan Without Preview".
- **New Project Photo Section**: Dual photo options - "Scan room" (AR placeholder) and "Upload Photo". Both buttons use guard() wrapper checking isFormValid and enforce field validation (name ≥3, description ≥10, budget, skill_level) before ensureProjectForDraft to prevent incomplete project creation. Scan navigates to ScanScreen with projectId, Upload unchanged.
- **ROI Modal Touch Handling**: ScrollView disables scroll when ROI or Measure modals are open (scrollEnabled={!roiOpen && !measureOpen}) to prevent drag/scroll conflicts during region adjustment.
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