# MuseOptical POS System

A comprehensive Point of Sale (POS) system designed for optical stores, built with React, TypeScript, and Firebase.

## Features

- **Inventory Management**: Track frames, lenses, contact lenses, and accessories
- **VOC (Verification of Claims)**: Handle product returns and exchanges
- **Customer Management**: Store customer information and purchase history
- **Multi-language Support**: Available in multiple languages
- **Real-time Sync**: Firebase integration for real-time data synchronization
- **Responsive Design**: Works on desktop and mobile devices
- **Staff Management**: Role-based access control
- **Sales Tracking**: Comprehensive sales data and analytics
- **Transfer System**: Manage inventory transfers between locations

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Internationalization**: i18next

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project setup

### Installation

1. Clone the repository:
```bash
git clone https://github.com/helium33/museopticalpos.git
cd museopticalpos
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `src` directory with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── services/           # API services
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
├── i18n/               # Internationalization files
└── context/            # React contexts
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software for MuseOptical stores.

## Support

For support, please contact the development team or create an issue in this repository.