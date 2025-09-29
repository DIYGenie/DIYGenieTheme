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

### API Integration & Entitlements System
- **Config Layer (app/config.ts)**: Added typed configuration module that reads EXPO_PUBLIC_* environment variables with validation. Exports BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, and UPLOADS_BUCKET with clear error messages if required variables are missing.
- **API Wrapper (app/lib/api.ts)**: Created fetchJson helper with timeout and error handling, plus getEntitlements(userId) function to fetch user quota/tier/remaining projects from backend endpoint.
- **New Project Gating**: Updated NewProjectForm to fetch entitlements on mount and gate photo upload tiles based on both form validation (description ≥10 chars + budget + skill selected) AND available entitlements (remaining > 0).
- **Helper Text**: Added conditional messaging above photo tiles showing "Complete fields to continue", "Upgrade to continue", or remaining project count based on validation and entitlement state.

### Modal-Based Dropdown System
- **Fixed Overlay Issues**: Converted Budget and Skill dropdowns to use React Native Modal components for proper z-index rendering above all content including photo tiles.
- **Z-Index Hierarchy**: Skill dropdown (3000) > Budget dropdown (2000) > Photo tiles (0) ensures clean dropdown behavior without visual conflicts.

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