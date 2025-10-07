# DIY Genie

## Overview
DIY Genie is a React Native mobile application built with Expo, designed to assist users with DIY projects. Following the tagline "Wish. See. Build.", it offers a gradient-based interface with a welcome screen and three core sections: Home, Projects, and Profile. The application targets cross-platform deployment (iOS, Android, and Web) leveraging modern React Native development practices and aims to provide an intuitive and engaging user experience for DIY enthusiasts. The business vision is to empower users to visualize and execute their DIY projects efficiently.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a component-based React Native architecture with React Navigation v7 for navigation, featuring a hybrid stack and tab navigation. It is built on Expo SDK 54, employs a centralized theme system for consistent styling, and primarily uses React's built-in state management.

### Visual Design Architecture
The design features a clean, modern aesthetic with white backgrounds, dark text, and a **purple brand primary color (#7C3AED / purple-600)** for CTAs, using a gradient for accents. A centralized UI kit in `app/ui/` provides reusable components and theme tokens, including a unified button system. Layouts use `SafeAreaView` and consistent spacing tokens, with `Ionicons` for iconography.

### Component Architecture
Key components include:
- **AccordionCard**: A reusable collapsible card for displaying lists, used in `ProjectDetailsScreen`.
- **SuggestionsBox**: A simple component for displaying AI-generated tips.
- **PromptCoach**: A modern chip-based UI for smart project suggestions, dynamically updating based on user input.

### Technical Implementations
- **Backend API Integration**: Uses an Express.js backend server (`server.js`) for managing projects and entitlements, with direct fetch calls for API operations.
- **Image Upload**: Server-side image upload via multer to Supabase Storage, with a permission-free photo picker using `ImagePicker.launchImageLibraryAsync()`.
- **New Project Screen (`NewProject.tsx`)**: Guides users through project creation, including `Smart Suggestions` (context-aware tips based on project details) and `Design Suggestions` (beta). It handles project creation, preview generation, and building without preview, with form validation and reset logic. Supports deep-linking from HomeScreen chips to focus/scroll to specific sections (desc, media, preview, plan).
- **Project Details Screen**: Displays project information using expandable `AccordionCard` components for plan sections (Overview, Materials, Steps, Shopping). It supports navigation via project ID or object.
- **Plan Tabs Screen**: A modern tabbed interface with swipeable tabs for Overview, Materials, Tools, and AI Tips, using deterministic stub data.
- **Authentication**: Utilizes Supabase Auth, with a development mode fallback.
- **Error Handling**: Comprehensive API and storage error handling, including specific messages for quota and permission errors.
- **ProfileScreen & Billing Integration**: Manages user entitlements, current plans (Free, Casual, Pro), and integrates with Stripe for subscription management, including visual feedback for syncing.
- **UX Enhancements**: Includes custom toast notifications, debounce hook for CTAs, haptic feedback, detailed loading states, and a health ping system for backend availability. Features `PressableScale` component (`app/components/ui/PressableScale.js`) for lightweight micro-interactions with configurable haptic feedback (light/medium/none), scale animation (120ms), and Android ripple effect. Used on: How it works tiles (light haptic), primary CTA (medium haptic, 0.97 scale), and project cards (light haptic). Includes skeleton loading states (`Skeleton.js`, `ProjectCardSkeleton.js`) with 1400ms shimmer animation and empty state component (`EmptyState.js`) for zero-projects view.
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