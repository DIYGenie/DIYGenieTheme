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
- **UX Enhancements**: Includes custom toast notifications, debounce hook for CTAs, haptic feedback, detailed loading states, and a health ping system for backend availability.
- **HomeScreen "How it works"**: Polished 2×2 tile grid with "How it works" title. Uses Pressable with scale animation (0.98) and pressed state (#EEE9FF). Each tile: 48% width, 56px min height, 14px border radius, 14px padding. Ghost style: soft lavender background (#F6F3FF), 1px border (#E9E3FF). Icons size 20: Describe (create-outline), Scan (image-outline), Preview (sparkles-outline), Build (hammer from MaterialCommunityIcons). Text: 14px, 600 weight, dark color (#2B2240), 0.15 letter spacing, center aligned. Deep-linking: Describe → desc input focus, Scan → photo picker, Preview → suggestions scroll, Build → action buttons scroll. Spacing: 12px gap from subtitle to title, 8px gap below title, 12px row gap in grid, 16px gap to CTA button.

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