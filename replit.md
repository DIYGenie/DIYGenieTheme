# DIY Genie

## Overview
DIY Genie is a React Native mobile application built with Expo, designed to assist users with DIY projects. Following the tagline "Wish. See. Build.", it offers a gradient-based interface with a welcome screen and three core sections: Home, Projects, and Profile. The application targets cross-platform deployment (iOS, Android, and Web) leveraging modern React Native development practices and aims to provide an intuitive and engaging user experience for DIY enthusiasts. The business vision is to empower users to visualize and execute their DIY projects efficiently.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a component-based React Native architecture.
- **Navigation**: Employs React Navigation v7 with a hybrid stack and tab navigation approach, starting with a welcome screen. Projects tab uses a nested stack navigator (ProjectsStack) containing ProjectsList and ProjectDetails screens, ensuring the tab bar remains visible when viewing project details. Built with @react-navigation/native-stack for nested navigation within tabs.
- **UI Framework**: Built on Expo SDK 54 for rapid cross-platform development.
- **Design System**: Features a centralized theme system for consistent styling across colors, typography, and spacing.
- **State Management**: Primarily uses React's built-in state management (useState, useEffect), with potential for more advanced solutions as the app grows.
- **Font Management**: Integrates Expo Google Fonts (Manrope and Inter) with asynchronous loading.

### Visual Design Architecture
- **Color Scheme**: Clean, modern design with white backgrounds (#FFFFFF), dark text (#111827), and orange primary color (#E39A33) for CTAs. Success states use green (#E8F6EE bg, #2E7D32 text), muted states use gray (#F3F4F6 bg, #374151 text).
- **Design System**: Centralized UI kit in `app/ui/` with reusable components (Screen, ScreenScroll, Card, Badge, ButtonPrimary, SectionTitle) and theme tokens (colors, radii, space, shadow, ui styles) from `app/ui/theme.ts` and `app/ui/components.tsx`.
- **Layout System**: Uses SafeAreaView and consistent spacing tokens (xs: 6, sm: 10, md: 14, lg: 20, xl: 28) for responsive and scalable design.
- **Icon Strategy**: Leverages Ionicons for consistent iconography.

### Component Architecture
- **Screen Organization**: Screens are self-contained modules handling their own styling and basic state.
- **Reusable Styling**: Employs consistent base styling patterns across screens using LinearGradient backgrounds and text hierarchies.
- **AccordionCard Component**: Reusable collapsible card component (`app/components/AccordionCard.js`) that displays a title, item count badge, and expandable content list. Shows first 3 items by default with "+N more" indicator. Supports custom rendering via renderItem prop for specialized layouts (e.g., shopping items with prices). Used in ProjectDetailsScreen for plan sections.

### Technical Implementations
- **Backend API Integration**: Includes an Express.js backend server (`server.js`) running on port 3001 with CORS support for managing projects and user entitlements.
- **API Wrapper**: Dual API approach - axios-based client (`app/lib/apiClient.ts`) for simple requests, and fetch-based wrapper (`app/lib/api.ts`) for complex operations with timeout/error handling.
- **Entitlements**: Direct axios.get to `/me/entitlements/:userId` returns `{ok, tier, quota, remaining, previewAllowed}` for gating features.
- **Modal System**: Dropdowns for Budget and Skill utilize React Native Modals to ensure correct z-index rendering.
- **Image Upload**: Server-side upload using multer (memoryStorage) with FormData key 'image'. Images are uploaded to Supabase Storage bucket via backend API endpoint POST /api/projects/:id/image. Version-safe image picker handles different Expo SDK versions, supporting platform-specific differences for web and native. Backend also supports direct_url parameter for automated testing. No auto-actions after upload.
- **File Export**: BuildPlanScreen includes save-to-phone functionality using expo-file-system/legacy API. Web platform downloads files via Blob URL download, while native platforms use FileSystem.writeAsStringAsync with expo-sharing for system share dialog. Legacy API chosen for better compatibility and clear documentation in SDK 54.
- **New Project Screen (NewProject.tsx)**: Primary project creation interface with Smart Suggestions feature. Auto-creates draft project when form is valid (description ≥10 chars, budget, skill), uploads photos, and displays AI-powered suggestions card below the photo. Includes testIDs for QA: np-suggestions-card, np-suggestions-refresh.
    - **Smart Suggestions on Form**: Shows after photo upload with deterministic suggestions from POST /api/projects/:id/suggestions. Features inline loading ("Analyzing your photo…"), 4-5 checkmarked bullets, optional tags, and refresh button. Never blocks form interaction. Includes preview usage hint: "You get 1 visual preview per project. Use suggestions to refine before you render."
- **Preview Generation**: Explicit user action via "Generate AI Preview" button → POST /api/projects/:id/preview → immediate navigation to Projects list (no polling). Preview button enabled only if previewAllowed=true AND image uploaded.
- **Build Without Preview**: Explicit user action via button → POST /api/projects/:id/build-without-preview → immediate navigation to Projects list. Button enabled if form valid (description ≥10 chars, budget, skill) and project created.
- **Project Details Screen**: Simplified view displaying project information with expandable accordion cards. Shows project name, status badge, room photo, and a summary card with description, budget, skill, status, and photo metadata. Features **AccordionCard** component for collapsible plan sections (Overview, Materials, Steps, Shopping). Each accordion shows first 3 items by default with "+N more" indicator, expands on tap to show all items. Shopping section includes custom rendering for item names and prices. Uses normalizePlan() helper with fallback stub data when plan is not available from backend.
    - **Smart Suggestions (beta)**: Displays AI-powered project tips in a card below the room photo. Fetches deterministic suggestions from POST /api/projects/:id/suggestions endpoint. Shows 4-5 checkmarked bullet points with optional tags. Includes refresh button for re-fetching suggestions with loading states and error handling.
    - **Preview Gating**: Visual indicator pill "Preview used for this project" overlays photo when preview_url exists or status is 'preview_ready'. The previewUsed flag is available for any future preview CTAs to check and disable duplicate preview requests.
- **Plan Tabs Screen**: Modern tabbed interface with 4 swipeable tabs for viewing build plans:
    - **Overview**: Shows project intro text and step-by-step progress list with step numbers
    - **Materials**: Lists required materials with quantities and estimated costs
    - **Tools**: Lists required tools with optional substitutes/alternatives
    - **AI Tips**: Displays bulleted pro tips for better project results
    - **Data Source**: Uses shared stub data from `app/lib/planStubs.ts` - a deterministic content generator based on projectId hash. Ensures Plan Outline and Plan Tabs show matching data without network calls.
    - Uses Material Top Tabs navigator for smooth swipeable experience, consistent with app design system.
- **Plan Screen** (Legacy): Original plan screen with expandable step-by-step instructions. Features summary cards showing estimated cost, time, and difficulty. Includes stub "Share/Export" button for future functionality. All plan data comes from project.plan object returned by backend.
- **Authentication**: Uses Supabase Auth for user authentication, with a fallback to a development mode for entitlements if no user is authenticated or the API is unreachable.
- **Test Mode Bypass**: Backend includes TEST_MODE flag (enabled when NODE_ENV=development) that bypasses quota checks for allowlisted test users during development and automated testing. Prevents quota exhaustion from blocking feature development.
- **Error Handling**: Comprehensive API and storage error handling, including network error detection and structured error responses. NewProjectForm includes specific handling for 403 (permission denied) and {ok:false} responses with user-friendly toast: "Couldn't create your project (permission). Try again or contact support." Includes 409 error handling for duplicate preview requests with friendly message "You've already used the preview for this project." Errors prevent navigation and allow users to retry.
- **ProfileScreen & Billing Integration**: Displays user entitlements, current plan, and subscription management. Features TIER_INFO metadata for tier labels and limits (Free: 2 projects, Casual $5.99/mo: 5 projects + 1 visual preview per project, Pro $14.99/mo: 25 projects + 1 visual preview per project). Includes inline upgrade picker, Stripe checkout/portal integration, sync plan functionality with visible feedback ("Syncing..." → "Synced just now"), and production-ready billing handlers with all interactive elements using Pressable components and testIDs.
- **UX Enhancements**:
    - **Toast Notifications**: Custom `Toast` component for animated success and error messages.
    - **Debounce Hook**: `useDebouncePress` to prevent double-taps on CTAs.
    - **Haptic Feedback**: Integrates `expo-haptics` for tactile feedback on key interactions.
    - **Loading States**: Detailed loading indicators, including spinners and disabled UI elements, during API operations.
    - **Health Ping System**: Periodically pings a `/health` endpoint to verify backend server availability and display a "Can't reach server" banner if unresponsive.

## External Dependencies

### Core Framework Dependencies
- **Expo SDK 54**: Primary development framework.
- **React Navigation v7**: For application navigation.
- **React Native 0.80**: Core mobile framework.

### UI and Design Dependencies
- **Expo Linear Gradient**: For gradient backgrounds.
- **Expo Google Fonts**: For custom typography (Manrope, Inter).
- **Expo Vector Icons**: For iconography (Ionicons).
- **React Native Safe Area Context**: For safe area handling.
- **Expo Haptics**: For tactile feedback.

### Data and Backend Integration
- **Supabase (via @supabase/supabase-js and @supabase/functions-js)**: For database, authentication, and storage services.
- **Node.js/Express**: For the backend API server.

### Development and Performance Dependencies
- **React Native Screens**: For optimized navigation performance.
- **Expo Status Bar**: For status bar control.

### Platform Support
- **iOS, Android, Web**: Cross-platform deployment via Expo.