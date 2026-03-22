import { useEffect } from 'react';
import { initSDK } from './runanywhere';
import { useStore } from './store/useStore';
import { LoadingScreen } from './components/LoadingScreen';
import { OnboardingForm } from './components/OnboardingForm';
import { CalendarView } from './components/CalendarView';
import { PostModal } from './components/PostModal';

export function App() {
  const currentScreen = useStore((state) => state.currentScreen);

  useEffect(() => {
    // Initialize RunAnywhere SDK
    initSDK().catch((err) => {
      console.error('Failed to initialize SDK:', err);
    });
  }, []);

  return (
    <>
      {currentScreen === 'loading' && <LoadingScreen />}
      {currentScreen === 'onboarding' && <OnboardingForm />}
      {currentScreen === 'calendar' && <CalendarView />}
      {currentScreen === 'post' && (
        <>
          <CalendarView />
          <PostModal />
        </>
      )}
    </>
  );
}
