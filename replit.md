# DIY Genie

## Overview
DIY Genie is a React Native mobile application built with Expo, designed to assist users with DIY projects. Following the tagline "Wish. See. Build.", it offers a gradient-based interface with a welcome screen and three core sections: Home, Projects, and Profile. The application targets cross-platform deployment (iOS, Android, and Web) leveraging modern React Native development practices and aims to provide an intuitive and engaging user experience for DIY enthusiasts. The business vision is to empower users to visualize and execute their DIY projects efficiently.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a component-based React Native architecture.
- **Navigation**: Employs React Navigation v7 with a hybrid stack and tab navigation approach, starting with a welcome screen.
- **UI Framework**: Built on Expo SDK 54 for rapid cross-platform development.
- **Design System**: Features a centralized theme system for consistent styling across colors, typography, and spacing.
- **State Management**: Primarily uses React's built-in state management (useState, useEffect), with potential for more advanced solutions as the app grows.
- **Font Management**: Integrates Expo Google Fonts (Manrope and Inter) with asynchronous loading.

### Visual Design Architecture
- **Color Scheme**: A purple-to-blue gradient theme (#8B5CF6 to #3B82F6) with orange accents (#F97316) for CTAs.
- **Layout System**: Uses SafeAreaView and consistent spacing tokens for responsive and scalable design.
- **Icon Strategy**: Leverages Ionicons for consistent iconography.

### Component Architecture
- **Screen Organization**: Screens are self-contained modules handling their own styling and basic state.
- **Reusable Styling**: Employs consistent base styling patterns across screens using LinearGradient backgrounds and text hierarchies.

### Technical Implementations
- **Backend API Integration**: Includes an Express.js backend server (`server.js`) running on port 3001 with CORS support for managing projects and user entitlements.
- **API Wrapper**: Dual API approach - axios-based client (`app/lib/apiClient.ts`) for simple requests, and fetch-based wrapper (`app/lib/api.ts`) for complex operations with timeout/error handling.
- **Entitlements**: Direct axios.get to `/me/entitlements/:userId` returns `{ok, tier, quota, remaining, previewAllowed}` for gating features.
- **Modal System**: Dropdowns for Budget and Skill utilize React Native Modals to ensure correct z-index rendering.
- **Image Upload**: Server-side upload using multer (memoryStorage) with FormData key 'image'. Images are uploaded to Supabase Storage bucket via backend API endpoint POST /api/projects/:id/image. Version-safe image picker handles different Expo SDK versions, supporting platform-specific differences for web and native. Backend also supports direct_url parameter for automated testing. No auto-actions after upload.
- **Preview Generation**: Explicit user action via "Generate AI Preview" button → POST /api/projects/:id/preview → immediate navigation to Projects list (no polling). Preview button enabled only if previewAllowed=true AND image uploaded.
- **Build Without Preview**: Explicit user action via button → POST /api/projects/:id/build-without-preview → immediate navigation to Projects list. Button enabled if form valid (description ≥10 chars, budget, skill) and project created.
- **Project Details Screen**: Displays comprehensive project information including name, status badge, budget/skill metadata, description, room photo, AI preview (if available), and "Open Plan" button when plan is ready. Includes subtle progress indicators for items in preview_requested or plan_requested states. Uses GET /api/projects/:id endpoint with fetchProject() helper from api.ts.
- **Plan Screen**: Renders complete build plans with expandable step-by-step instructions, required tools and materials lists, safety notes, and pro tips. Features summary cards showing estimated cost, time, and difficulty. Includes stub "Share/Export" button for future functionality. All plan data comes from project.plan object returned by backend.
- **Authentication**: Uses Supabase Auth for user authentication, with a fallback to a development mode for entitlements if no user is authenticated or the API is unreachable.
- **Test Mode Bypass**: Backend includes TEST_MODE flag (enabled when NODE_ENV=development) that bypasses quota checks for allowlisted test users during development and automated testing. Prevents quota exhaustion from blocking feature development.
- **Error Handling**: Comprehensive API and storage error handling, including network error detection and structured error responses.
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