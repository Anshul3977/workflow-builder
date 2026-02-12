# Workflow Builder

A powerful, extensible platform for building and executing multi-step text processing workflows. Combine different operations like summarization, extraction, categorization, translation, and sentiment analysis to create sophisticated data pipelines.

## Features

- **Visual Workflow Builder**: Drag-and-drop interface for creating multi-step processing pipelines
- **Step Types**: Supports multiple operation types:
  - Summarization: Condense text to key points
  - Extraction: Pull specific information from text
  - Categorization: Classify text into predefined categories
  - Translation: Convert text between languages
  - Sentiment Analysis: Analyze emotional tone of text
  
- **Workflow Execution**: Run workflows with real-time result tracking
- **Execution History**: Track all workflow runs with detailed results and performance metrics
- **Health Status**: Monitor backend service health and availability
- **State Management**: Uses Zustand for efficient client-side state management
- **Responsive Design**: Beautiful, mobile-friendly interface built with Tailwind CSS

## Architecture

### Frontend Structure
- **Pages**: Home, Builder, History, Status, Results (dynamic)
- **Components**: Organized by feature (workflow, health, history, results, layout)
- **State Management**: Zustand stores for workflows, history, health, and UI state
- **API Layer**: Typed API utilities for consistent backend communication

### Key Technologies
- **Framework**: Next.js 16 with App Router
- **State Management**: Zustand
- **UI Framework**: React 19 with shadcn/ui components
- **Styling**: Tailwind CSS with custom theme tokens
- **Toast Notifications**: Sonner
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

3. Start the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                          # Next.js app router pages
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Home page
│   ├── builder/                 # Workflow builder page
│   ├── history/                 # Execution history page
│   ├── status/                  # Health status page
│   └── results/[id]/            # Dynamic results viewer
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── layout/                  # Header and main layout
│   ├── workflow/                # Workflow builder components
│   │   ├── step-card.tsx
│   │   ├── step-type-selector.tsx
│   │   ├── step-configurator.tsx
│   │   ├── step-config-modal.tsx
│   │   └── workflow-pipeline.tsx
│   ├── health/                  # Health monitoring components
│   ├── history/                 # History display components
│   └── results/                 # Results viewing components
│
├── lib/
│   ├── api.ts                   # API client functions
│   └── stores/                  # Zustand store definitions
│       ├── workflow-store.ts
│       ├── history-store.ts
│       ├── health-store.ts
│       └── ui-store.ts
│
└── types/                        # TypeScript type definitions
    ├── workflow.ts
    ├── results.ts
    ├── health.ts
    └── api.ts
```

## API Integration

The application communicates with a backend API at `NEXT_PUBLIC_API_URL`. Expected endpoints:

- `POST /execute` - Execute a workflow
- `GET /results/:id` - Get execution results
- `GET /history` - Get execution history
- `GET /health` - Get system health status

All API responses follow a consistent structure with status and data/error payloads.

## State Management with Zustand

### Workflow Store
- Manages current workflow steps and configuration
- Persists to localStorage automatically

### History Store
- Manages execution history
- Tracks completed runs with timestamps and results

### Health Store
- Monitors backend, database, and LLM service health
- Updates health status periodically

### UI Store
- Manages UI state (modals, selected steps, etc.)
- Prevents prop-drilling across components

## Styling

The project uses Tailwind CSS with semantic design tokens defined in `app/globals.css`:
- **Colors**: Primary, secondary, destructive, accent, muted
- **Typography**: Controlled via font families and Tailwind classes
- **Spacing**: Uses Tailwind's spacing scale
- **Responsive**: Mobile-first approach with `md:` and `lg:` prefixes

## Development Guidelines

- **Components**: Keep components small and focused
- **Types**: Always use TypeScript for type safety
- **API**: Use the `lib/api.ts` utilities for all backend communication
- **State**: Use Zustand stores instead of prop drilling
- **Styling**: Use Tailwind classes, avoid inline styles

## Performance Considerations

- **State Management**: Zustand selectors prevent unnecessary re-renders
- **Component Splitting**: UI is split into small, focused components
- **API Caching**: Results are cached in history store
- **Lazy Loading**: Pages load code on-demand

## Building for Production

```bash
pnpm build
pnpm start
```

The app will be optimized for production with:
- Code splitting and chunking
- Image optimization
- CSS minification
- JavaScript minification

## Troubleshooting

### API Connection Issues
- Check that `NEXT_PUBLIC_API_URL` is set correctly
- Verify the backend service is running
- Check browser console for CORS errors

### State Not Persisting
- Verify localStorage is enabled in your browser
- Check browser console for errors

### UI Components Not Rendering
- Ensure all shadcn/ui components are installed
- Check that Tailwind CSS is properly configured

## Contributing

When adding new features:
1. Create new types in `types/` for any new data structures
2. Add API utilities to `lib/api.ts` for new endpoints
3. Create Zustand stores as needed for state management
4. Build UI components in appropriate `components/` subdirectories
5. Create pages in the `app/` directory following Next.js conventions

## License

MIT
