# Recipe Extract - Frontend

The frontend component of Recipe Extract, built with React, TypeScript, and Vite.

## Overview

This React application provides a user-friendly interface for extracting structured recipes from YouTube cooking videos. It communicates with the FastAPI backend to process videos and display recipe information with visual step timestamps.

## Features

- **YouTube URL Input**: Clean interface for entering cooking video URLs
- **Recipe Display**: Structured presentation of extracted recipes with ingredients and instructions
- **Visual Timestamps**: Display of key cooking steps with corresponding video frames
- **Cache Management**: Browse and select from previously processed videos
- **Real-time Status**: Live pipeline status updates during video processing
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **React 19**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **CSS Modules**: Scoped styling
- **ESLint**: Code quality and consistency

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The development server runs on `http://localhost:5173` with hot module replacement.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Code Quality

```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── UrlInput.tsx    # YouTube URL input form
│   │   ├── RecipeView.tsx  # Recipe display component
│   │   ├── CacheView.tsx   # Cached videos browser
│   │   ├── PipelineStatus.tsx # Processing status display
│   │   ├── PizzaTracker.tsx   # Fun loading animation
│   │   └── CookbookView.tsx   # Recipe collection view
│   ├── App.tsx             # Main application component
│   ├── App.css             # Global styles
│   ├── main.tsx            # Application entry point
│   └── index.css           # Base styles
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── eslint.config.js        # ESLint configuration
```

## Components

### UrlInput
Handles YouTube URL input and extraction initiation. Validates URLs and provides user feedback.

### RecipeView
Displays extracted recipes with ingredients, instructions, and visual timestamps. Shows base64-encoded video frames for key steps.

### CacheView
Lists previously processed videos with their pipeline status. Allows quick selection of cached recipes.

### PipelineStatus
Shows real-time processing status for videos being extracted. Displays completion status for each pipeline step.

### PizzaTracker
Fun loading animation component that shows progress during recipe extraction.

## API Integration

The frontend communicates with the backend API:

- `POST /api/recipe` - Extract recipe from YouTube URL
- `POST /api/visuals` - Get visual timestamps for key steps
- `GET /api/cache` - List cached videos
- `GET /api/cache/{video_id}` - Get cached recipe data
- `GET /api/cache/{video_id}/status` - Get processing status

## Styling

The application uses CSS modules for component-scoped styling with a clean, modern design focused on usability.

## Development Guidelines

### Code Style

- Use TypeScript for all components
- Follow React best practices with hooks
- Use functional components with arrow functions
- Implement proper error boundaries
- Write descriptive component and prop names

### Component Patterns

```typescript
interface ComponentProps {
  // Define props interface
}

const Component: React.FC<ComponentProps> = ({ prop }) => {
  // Component logic
  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  );
};

export default Component;
```

### State Management

Components use React's built-in `useState` and `useEffect` hooks. Complex state is lifted to parent components as needed.

### Error Handling

Network errors and API failures are handled gracefully with user-friendly error messages.

## Building and Deployment

### Production Build

```bash
npm run build
```

This creates optimized files in the `dist/` directory ready for deployment.

### Deployment Options

The built files can be served by any static web server. The application expects the backend API to be available at `http://localhost:8000` in development.

For production deployment, update the API base URL in the components accordingly.

## Troubleshooting

### Common Issues

**Development server won't start:**
- Ensure port 5173 is available
- Check Node.js version (16+ required)
- Try clearing node_modules and reinstalling

**API connection fails:**
- Verify backend is running on port 8000
- Check CORS configuration in backend
- Ensure API endpoints match frontend expectations

**Build fails:**
- Run `npm run lint` to check for code issues
- Verify all dependencies are installed
- Check TypeScript compilation errors

### Development Tips

- Use browser developer tools for debugging
- Check Network tab for API request/response details
- Use React Developer Tools extension
- Enable TypeScript strict mode for better development experience

## Contributing

When contributing to the frontend:

1. Follow the established code patterns
2. Add TypeScript interfaces for component props
3. Test components with different data states
4. Ensure responsive design works on mobile
5. Update this documentation for new components

For more information about the overall project, see the main [README](../README.md).
