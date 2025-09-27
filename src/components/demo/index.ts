// Demo Context and Providers
export { DemoProvider, useDemo, useDemoActions, useDemoAnalytics, DEMO_SCENARIOS } from '@/contexts/demo-context';

// Core Demo Components
export { DemoBanner, CompactDemoBanner, DemoCTABanner } from './demo-banner';
export { DemoTour, TourTrigger } from './demo-tour';
export { DemoSimulator, FloatingSimulator } from './demo-simulator';
export { DemoResetButton, QuickResetButton, ProgressResetButton } from './demo-reset-button';
export { DemoProgress, MiniProgress, ProgressWithMilestones } from './demo-progress';
export { DemoScenarioSelector, QuickScenarioSwitcher } from './demo-scenario-selector';

// Demo Watermarks and Indicators
export {
  DemoWatermark,
  InlineWatermark,
  ProgressWatermark,
  NotificationWatermark,
  ContextualWatermark
} from './demo-watermark';

// Demo System Integration
export {
  DemoSystem,
  useDemoMode,
  withDemoSystem,
  DemoConditional,
  DemoButton,
  DemoMetrics,
  DemoBreadcrumb,
  DemoAnnouncer,
  DemoErrorBoundary
} from './demo-system';

// Types
export type { DemoScenario, DemoStep, DemoMessage, DemoConversation } from '@/contexts/demo-context';