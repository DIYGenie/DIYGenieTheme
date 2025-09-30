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
- **API Wrapper**: A typed configuration module (`app/config.ts`) and an API wrapper (`app/lib/api.ts`) handle API requests, entitlements fetching, project creation, and updates.
- **Modal System**: Dropdowns for Budget and Skill utilize React Native Modals to ensure correct z-index rendering.
- **Image Upload**: Server-side upload using multer (memoryStorage) with FormData. Images are uploaded to Supabase Storage bucket via backend API endpoint POST /api/projects/:id/image. Version-safe image picker handles different Expo SDK versions, supporting platform-specific differences for web and native.
- **Preview Generation**: Functionality to trigger project preview generation via API calls.
- **Build Without Preview**: Endpoint POST /api/projects/:id/build-without-preview allows users to bypass preview generation and proceed directly to building their project plan. Sets project status to 'ready' without requiring AI preview generation.
- **Authentication**: Uses Supabase Auth for user authentication, with a fallback to a development mode for entitlements if no user is authenticated or the API is unreachable.
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