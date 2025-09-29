# DIY Genie

## Overview

DIY Genie is a React Native mobile application built with Expo that helps users with DIY projects. The app follows the tagline "Wish. See. Build." and provides a clean, gradient-based interface with a welcome screen and three main sections: Home, Projects, and Profile. The application is designed for cross-platform deployment (iOS, Android, and Web) using modern React Native development practices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application follows a component-based React Native architecture with the following key decisions:

**Navigation Structure**: Uses React Navigation v7 with a hybrid approach combining stack and tab navigation. The app starts with a welcome screen and then transitions to a tab-based main interface, providing an intuitive user onboarding flow.

**UI Framework**: Built on Expo SDK 54 for rapid development and easy deployment across multiple platforms. This choice enables hot reloading, simplified build processes, and access to native device features without ejecting.

**Design System**: Implements a centralized theme system with separate modules for colors, typography, and spacing. This modular approach ensures consistent styling across components and makes global design changes manageable.

**State Management**: Currently uses React's built-in state management (useState, useEffect). The simple structure suggests the app is in early development stages and may require more sophisticated state management (Redux, Zustand, or Context API) as complexity grows.

**Font Management**: Uses Expo Google Fonts with Manrope and Inter font families, loaded asynchronously with a loading screen fallback to ensure proper font rendering before app initialization.

### Visual Design Architecture
**Color Scheme**: Implements a purple-to-blue gradient theme (#8B5CF6 to #3B82F6) with orange accent colors (#F97316) for call-to-action elements. This creates a modern, engaging visual hierarchy.

**Layout System**: Uses SafeAreaView for proper device compatibility and consistent spacing tokens for scalable design. The layout system includes predefined spacing values and border radius configurations.

**Icon Strategy**: Leverages Ionicons for consistent iconography across the tab navigation and potential future UI elements.

### Component Architecture
**Screen Organization**: Follows a clear separation between navigation logic and screen components, with each screen being a self-contained module that handles its own styling and basic state.

**Reusable Styling**: Each screen implements similar base styling patterns using LinearGradient backgrounds and consistent text hierarchies, suggesting potential for component abstraction as the app grows.

## Recent Changes (September 29, 2025)

### Backend API Server Implementation (September 29, 2025)
- **Express Server (server.js)**: Created Node.js/Express backend API server running on port 3001 with CORS enabled
- **Supabase Integration**: Server uses SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables to connect to Supabase with service role privileges
- **GET /api/projects?user_id=...**: Lists all projects for a user, ordered by created_at descending. Returns `{ok: true, items: [...]}` with empty array if no projects exist. Validates user_id is provided (400 error if missing).
- **GET /me/entitlements/:userId**: Returns user entitlements with automatic fallback to Free tier default `{ok: true, tier: "Free", quota: 5, remaining: 5}` when no record exists or table is missing. Gracefully handles database schema changes.
- **POST /api/projects**: Creates new project with user_id, name, budget, skill, description. Returns created project.
- **PATCH /api/projects/:id**: Updates existing project fields. Returns 404 if project not found.
- **POST /api/projects/:id/preview**: Triggers preview generation by updating project status to 'preview_requested'.
- **Error Handling**: All endpoints return proper HTTP status codes and JSON responses with `{ok: false, error: <message>}` format on errors. Content-Type: application/json headers on all responses.
- **Workflows**: Added "Backend API Server" workflow to run `node server.js` on port 3001 alongside the Expo app on port 5000

### API Integration & Entitlements System
- **Config Layer (app/config.ts)**: Added typed configuration module that reads EXPO_PUBLIC_* environment variables with validation. Exports BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, and UPLOADS_BUCKET with clear error messages if required variables are missing.
- **API Wrapper (app/lib/api.ts)**: Created fetchJson helper with timeout and error handling, plus getEntitlements(userId) function to fetch user quota/tier/remaining projects from backend endpoint.
- **New Project Gating**: Updated NewProjectForm to fetch entitlements on mount and gate photo upload tiles based on both form validation (description ≥10 chars + budget + skill selected) AND available entitlements (remaining > 0).
- **Helper Text**: Added conditional messaging above photo tiles showing "Complete fields to continue", "Upgrade to continue", or remaining project count based on validation and entitlement state.

### Modal-Based Dropdown System
- **Fixed Overlay Issues**: Converted Budget and Skill dropdowns to use React Native Modal components for proper z-index rendering above all content including photo tiles.
- **Z-Index Hierarchy**: Skill dropdown (3000) > Budget dropdown (2000) > Photo tiles (0) ensures clean dropdown behavior without visual conflicts.

### Project Creation & Image Upload
- **API Extensions (app/lib/api.ts)**: Added createProject() for POST /api/projects and updateProject() for PATCH /api/projects/{id} with graceful 404/405 handling.
- **Storage Layer (app/lib/storage.ts)**: Created Supabase Storage helper with uploadImageAsync() function that uploads images to the 'uploads' bucket and returns public URLs.
- **Upload Flow**: Upload Photo button now creates a project, launches image picker, uploads to Supabase Storage, stores the public URL in component state, and attempts to PATCH the URL to the project record.
- **Loading States**: Added isUploading state with conditional helper text ("Uploading photo...") and disabled tiles during upload operation.
- **Error Handling**: Comprehensive try/catch with Alert.alert for both upload failures and permission denials.
- **Dependencies**: Installed @supabase/supabase-js and @supabase/functions-js for Supabase integration.

**Note**: The Supabase integration requires the following environment variables to be set before the upload functionality will work:
- `EXPO_PUBLIC_BASE_URL` - Backend API base URL
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `EXPO_PUBLIC_UPLOADS_BUCKET` - Storage bucket name (optional, defaults to 'uploads')

### Preview Generation & Project List Display
- **Preview API (app/lib/api.ts)**: Added triggerPreview() to POST to /api/projects/{id}/preview with input image and optional prompt/room_type/design_style. Also added listProjects() to GET /api/projects?user_id={userId} with tolerance for various response shapes.
- **Generate Preview Button (NewProjectForm)**: After successful image upload, displays a "Generate Preview" button with sparkles icon. Button is debounced (300ms) to prevent double-taps and shows "Generating preview..." loading state with sync icon during API call.
- **Navigation Flow**: On successful preview trigger, automatically navigates to Projects screen with refresh parameter to fetch updated project list.
- **Projects Screen Refresh**: Implemented useFocusEffect to detect refresh parameter and reload projects. Also added pull-to-refresh for manual updates.
- **Smart Card Display**: Project cards now display preview thumbnail (Image component) if preview_url exists, skeleton shimmer with ActivityIndicator if status is 'preview_requested' or 'pending', or placeholder if neither. Added "Preview requested" chip for pending previews.
- **Error Handling**: Shows "Preview failed. Try again." toast on API errors with automatic re-enable of the Generate Preview button.

### Auth Integration & Error Handling (September 29, 2025)
- **Real Supabase Auth**: Both NewProjectForm and ProjectsScreen now use `supabase.auth.getUser()` to get the real user ID
- **Dev Fallback**: When no user is authenticated or entitlements endpoint returns 404/network error, automatically falls back to dev mode with default entitlements (tier: Free, quota: 5, remaining: 5)
- **Dev Mode Banner**: Small yellow banner displays "Dev mode: using default entitlements" in NewProjectForm when using fallback
- **Exported Supabase Client**: `app/lib/storage.ts` now exports the supabase client for auth access across the app
- **Improved Fetch Error Handling**: 
  - Normalized BASE_URL handling (removes trailing slashes, ensures leading slash on paths)
  - Network errors (CORS, DNS, connection refused) now return status: 0 with console hint "Network/CORS?"
  - API errors include proper status codes and parsed error messages
  - ApiError class provides structured error information (message, status, data)

### UX Polish & Interaction Improvements (September 29, 2025)
- **Toast Component (app/components/Toast.js)**: Created lightweight toast notification system with animated slide-in from bottom. Supports success (green) and error (red) variants with appropriate icons. Auto-dismisses after 2.5 seconds with fade-out animation.
- **Debounce Hook (app/lib/hooks.js)**: Implemented useDebouncePress custom hook with 300ms delay to prevent double-tap submissions on all primary CTAs (Upload Photo, Generate Preview).
- **Haptic Feedback**: Integrated expo-haptics for tactile feedback on success (Success notification) and error (Error notification) events. Gracefully handles devices without haptic support.
- **Loading State Polish**:
  - Dim entire action section with opacity 0.6 during upload/preview operations
  - Disable pointer events with pointerEvents="none" during loading
  - Added ActivityIndicator spinners to "Uploading photo..." helper text and "Generating preview..." button state
  - Replaced generic text-only loading states with spinner + text combinations
- **Toast Integration**: Replaced Alert.alert with toast notifications for:
  - "Photo uploaded!" (success)
  - "Upload failed" (error)
  - "Permission required" (error)
  - "Preview requested!" (success)
  - "Preview failed" (error)
- **Empty State**: Projects screen already includes centered card with folder icon, "No projects yet" message, and "Start Your First Project" CTA button that navigates to NewProject.
- **Pull-to-Refresh**: Projects screen already includes RefreshControl to reload project list via listProjects API.

## External Dependencies

### Core Framework Dependencies
- **Expo SDK 54**: Primary development framework providing build tools, device APIs, and deployment infrastructure
- **React Navigation v7**: Handles all app navigation with stack and tab navigators
- **React Native 0.80**: Core mobile framework for cross-platform development

### UI and Design Dependencies
- **Expo Linear Gradient**: Creates the signature purple-to-blue gradient backgrounds throughout the app
- **Expo Google Fonts**: Provides Manrope and Inter font families for typography consistency
- **Expo Vector Icons**: Supplies Ionicons for tab navigation and future UI elements
- **React Native Safe Area Context**: Ensures proper layout on devices with notches and safe areas

### Development and Performance Dependencies
- **React Native Screens**: Optimizes navigation performance by using native screen components
- **Expo Status Bar**: Controls device status bar appearance to match the app's design theme

### Platform Support
The application is configured for deployment on iOS, Android, and Web platforms through Expo's unified build system, with platform-specific optimizations for app icons and adaptive icons on Android.