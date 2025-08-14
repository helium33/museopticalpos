# MuseOptical POS System - Repository Information

## Project Overview
This is a comprehensive Point of Sale (POS) system designed specifically for optical stores. The system handles inventory management, sales transactions, customer data, and verification of claims (VOC) for product returns and exchanges.

## Technology Stack
- **Frontend**: React 18 with TypeScript, Vite build tool
- **Styling**: Tailwind CSS for responsive design
- **Backend**: Firebase (Firestore database, Authentication)
- **State Management**: Zustand for global state
- **Internationalization**: i18next for multi-language support
- **UI Components**: Custom components with Lucide React icons

## Key Features
1. **Inventory Management**: Frames, lenses, contact lenses, accessories
2. **VOC System**: Product return and exchange handling
3. **Customer Management**: Customer profiles and purchase history
4. **Multi-location Support**: Transfer system between stores
5. **Staff Management**: Role-based access control
6. **Real-time Sync**: Firebase real-time database updates
7. **Responsive Design**: Mobile and desktop optimized
8. **Export Functionality**: Data export to Excel/PDF

## Project Structure
- `/src/components/` - Reusable UI components organized by feature
- `/src/pages/` - Page-level components for routing
- `/src/hooks/` - Custom React hooks for business logic
- `/src/lib/` - Utility functions and configurations
- `/src/services/` - API services and external integrations
- `/src/stores/` - Zustand state management stores
- `/src/types/` - TypeScript type definitions
- `/src/i18n/` - Internationalization files

## Development Standards
- TypeScript strict mode enabled
- ESLint for code quality
- Component-based architecture
- Custom hooks for business logic separation
- Tailwind CSS for consistent styling
- Firebase best practices for security

## Key Dependencies
- React & React DOM
- Firebase SDK
- React Router for navigation
- React Hook Form for form handling
- Zustand for state management
- Tailwind CSS for styling
- i18next for internationalization

## Business Logic
The system handles complex inventory calculations, real-time synchronization across multiple locations, and comprehensive error handling for optical products with specific attributes like lens prescriptions, frame measurements, and contact lens specifications.