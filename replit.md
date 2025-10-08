# DIY Genie

## Overview
DIY Genie is a React Native mobile application built with Expo, designed to assist users with DIY projects. Following the tagline "Wish. See. Build.", it offers a gradient-based interface with a welcome screen and three core sections: Home, Projects, and Profile. The application targets cross-platform deployment (iOS, Android, and Web) leveraging modern React Native development practices and aims to provide an intuitive and engaging user experience for DIY enthusiasts. The business vision is to empower users to visualize and execute their DIY projects efficiently.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a component-based React Native architecture with React Navigation v7 for navigation, featuring a hybrid stack and tab navigation. It is built on Expo SDK 54, employs a centralized theme system for consistent styling, and primarily uses React's built-in state management.

**Navigation Structure:**
- **AppNavigator** (root stack): Manages top-level screens including Welcome, Auth, Scan modals, and the main tab container
- **RootTabs** (`app/navigation/RootTabs.tsx`): Bottom tab navigator with typed navigation for Home, NewProject, Projects (nested stack), and Profile
- **ProjectsNavigator** (`app/navigation/ProjectsNavigator.tsx`): Nested stack within Projects tab containing ProjectsList, ProjectDetails, and BuildPlan screens
- **Typed Navigation**: Uses TypeScript composite navigation types to enable type-safe navigation from tab screens to nested stack screens (e.g., NewProject → Projects → ProjectDetails)

### Visual Design Architecture
The design features a clean, modern aesthetic with white backgrounds, dark text, and a **purple brand primary color (#7C3AED / purple-600)** for CTAs, using a gradient for accents. A centralized UI kit in `app/ui/` provides reusable components and theme tokens, including a unified button system. Layouts use `SafeAreaView` and consistent spacing tokens, with `Ionicons` for iconography.

### Component Architecture
Key components include:
- **AccordionCard**: A reusable collapsible card for displaying lists, used in `ProjectDetailsScreen`.
- **SuggestionsBox**: A simple component for displaying AI-generated tips.
- **PromptCoach**: A modern chip-based UI for smart project suggestions, dynamically updating based on user input.

### Technical Implementations
- **Backend API Integration**: Uses an Express.js backend server (`server.js`) for managing projects and entitlements, with direct fetch calls for API operations.
- **Image Upload**: Dual upload system: Server-side via multer for project images, and direct client-side upload to Supabase Storage for room scans. Client-side scans use `saveRoomScan` utility (`app/features/scans/saveRoomScan.ts`) to upload to `room-scans` bucket at `${userId}/<timestamp>-<rand>.jpg`, create 7-day signed URLs via `createSignedUrl()`, and track in `public.room_scans` table with metadata (source, device, flow). Upload flow includes loading states (semi-transparent overlay spinner), disabled button states, and "Scan uploaded & saved" toast notification on success. Includes permission-free photo picker using `ImagePicker.launchImageLibraryAsync()` and expo-file-system for base64 conversion. Supabase client (`app/lib/supabase.ts`) configured with AsyncStorage for session persistence, auto token refresh, and cross-platform URL polyfill support.
- **New Project Screen (`NewProject.tsx`)**: Guides users through project creation, including `Smart Suggestions` (context-aware tips based on project details) and `Design Suggestions` (beta). It handles project creation, preview generation, and building without preview, with form validation and reset logic. Supports deep-linking from HomeScreen chips to focus/scroll to specific sections (desc, media, preview, plan). Preview generation enabled when either description ≥10 chars OR room photo exists (with entitlement check). **Draft Persistence**: Form fields (description, budget, skill level) are automatically saved to AsyncStorage (`app/lib/draft.ts`) on every change, and restored on mount. This ensures fields persist across sign-in flows - when users are prompted to authenticate and navigate to Auth screen, they're returned to NewProject with all fields intact. Draft is cleared after successful project creation or when form is manually reset.
- **Project Details Screen**: Displays project information using expandable `AccordionCard` components for plan sections (Overview, Materials, Steps, Shopping). It supports navigation via project ID or object.
- **Plan Tabs Screen**: A modern tabbed interface with swipeable tabs for Overview, Materials, Tools, and AI Tips, using deterministic stub data.
- **Authentication**: Implements Supabase email/password authentication with centralized auth gate. **AuthGate Provider** (`app/providers/AuthGate.tsx`) wraps the app root in `App.js`, providing centralized session state via context to all components. It manages Supabase session via `getSession()` on mount and `onAuthStateChange` subscription, exposing `session` and `loading` state. **RootTabs** consumes AuthGate context to conditionally render tabs: shows only Profile tab (labeled "Sign in") when logged out, displays full tab set (Home, NewProject, Projects, Profile) when authenticated. Loading spinner shown during initial auth check. Auth flow includes sign-in, sign-up with email confirmation handling (shows "Check your inbox to confirm your email" toast if confirmation required, "Signed in" otherwise), and sign-out with toast notifications. ProfileScreen shows loading spinner during auth check, then conditionally renders: sign-in card when logged out, or user email + sign-out button when authenticated. AuthScreen (`app/screens/AuthScreen.tsx`) provides simple email/password form with purple brand styling. NewProject requires authentication via AuthGate to access, validates form completeness (description ≥10 chars, budget, skill level) without ad-hoc sign-in prompts. Supabase client configured with AsyncStorage for session persistence across app restarts.
- **Error Handling**: Comprehensive API and storage error handling, including specific messages for quota and permission errors.
- **ProfileScreen & Billing Integration**: Manages user entitlements, current plans (Free, Casual, Pro), and integrates with Stripe for subscription management, including visual feedback for syncing.
- **UX Enhancements**: Includes custom toast notifications, debounce hook for CTAs, haptic feedback, detailed loading states, and a health ping system for backend availability. Features `PressableScale` component (`app/components/ui/PressableScale.js`) for lightweight micro-interactions with configurable haptic feedback (light/medium/none), scale animation (120ms), and Android ripple effect. Used on: How it works tiles (light haptic), primary CTA (medium haptic, 0.97 scale), and project cards (light haptic). Includes skeleton loading states (`Skeleton.js`, `ProjectCardSkeleton.js`) with 1400ms shimmer animation and empty state component (`EmptyState.js`) for zero-projects view. Camera permission flow with pre-permission bottom sheet (`PrePermissionSheet.js`) explaining camera access before requesting, with fallback to Settings if denied.
- **Room Scanning Flow**: Reliable camera scanning using expo-camera's CameraView and useCameraPermissions hooks. `ScanScreen.tsx` handles permission requests, live camera preview (native only), photo capture, and review within a single screen. Includes web fallback with friendly "Camera not available" message. Integrated with NewProject via event bridge (`scanEvents.js`) - captured photos automatically populate the room photo field with "Room photo added" toast notification.
- **New Project Photo Section**: Displays two side-by-side cards: "Scan room" (primary, purple filled) opens camera scanning flow, "Upload Photo" (secondary, outlined) opens gallery picker. When photo selected, shows preview with "Change photo" option. Event bridge system (`subscribeScanPhoto`/`emitScanPhoto`) enables seamless photo transfer from scan flow to project creation.
- **HomeScreen "How it works"**: Reusable tile component (`HowItWorksTile.js`) with `PressableScale` wrapper in 2×2 grid layout. Tiles feature micro-interactions: light haptic feedback, scale animation (0.98), icon opacity animation (70%→100% on press). Each tile: 48% width, 72px min height, 16px border radius, 14px padding. Colors: background (#F6F3FF), border (#E7DFFF), pressed state (#EEE6FF). Icons (size 22, Ionicons outline): Describe (create-outline), Scan (scan-outline), Preview (sparkles-outline), Build (hammer-outline). Text: 15px, 600 weight, #1F1F1F color. Deep-linking: Describe → desc input focus, Scan → photo picker, Preview → suggestions scroll, Build → action buttons scroll. Spacing: 8px gap from subtitle to title, 10px gap below title, 12px row gap in grid, 20px gap to CTA. Accessibility: Step-based labels ("step 1 of 4", etc.) with button role.

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