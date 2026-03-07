# T-Rex Runner - Svelte + TypeScript Version

This is a modern implementation of the classic T-Rex Runner game from Chrome's offline mode, built with Svelte 5, TypeScript, and Vite.

## Project Description

This project converts the original JavaScript T-Rex Runner game to a modern frontend stack using:

- Svelte 5+ for component-based UI
- TypeScript 5+ for type safety
- Vite 8+ for fast development and build
- Consola for structured logging

## Features

- Complete game functionality (jumping, ducking, collision detection, scoring)
- Modern component-based architecture
- Type-safe codebase
- Detailed logging with configurable log levels
- Responsive design
- Original game assets preserved

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Installation

1. Clone the repository
2. Install dependencies

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm dev
```

The game will be available at `http://localhost:5173`

### Build

Build the production version:

```bash
pnpm build
```

### Type Checking

Run TypeScript type checks:

```bash
pnpm run check
```

## Project Structure

```
src/
├── components/          # Svelte components
│   ├── Trex.svelte      # T-Rex character component
│   ├── Obstacle.svelte   # Obstacle component
│   ├── Horizon.svelte    # Ground, clouds, and obstacle management
│   ├── DistanceMeter.svelte # Score display
│   ├── GameOverPanel.svelte # Game over screen
│   └── Game.svelte      # Main game component
├── config/
│   ├── gameConfig.ts    # Game configuration
│   └── obstacleTypes.ts # Obstacle type definitions
├── types/
│   └── index.ts         # TypeScript type definitions
├── utils/
│   └── gameUtils.ts     # Game utility functions
├── services/
│   └── logger.ts        # Consola logging service
├── App.svelte           # Root component
├── main.ts              # Application entry point
└── index.css            # Global styles
```

## Technical Stack

- **Framework**: Svelte 5
- **Language**: TypeScript 5
- **Build Tool**: Vite 8
- **Logging**: Consola
- **Code Quality**: ESLint + Prettier

## How to Play

1. Press Space to start the game
2. Press Space to jump over obstacles
3. Press Down to duck under obstacles
4. Try to survive as long as possible and get the highest score

## Acknowledgements

- Original T-Rex Runner game from Chrome's offline mode
- Svelte team for the excellent framework
- TypeScript team for type safety
- Vite team for fast build tools

## License

This project is licensed under the BSD License - see the LICENSE file for details.
