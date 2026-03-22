import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { ModelCategory, ModelManager, EventBus } from '@runanywhere/web';

export function LoadingScreen() {
  const { modelProgress, setModelProgress, setScreen } = useStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<'checking' | 'downloading' | 'loading' | 'ready'>('checking');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initModel = async () => {
      try {
        setLoadingStage('checking');
        console.log('[LoadingScreen] Starting SDK initialization...');
        
        // Wait for SDK to be initialized first
        const { initSDK } = await import('../runanywhere');
        await initSDK();
        
        console.log('[LoadingScreen] SDK initialized successfully');

        // Check if LLM is already loaded
        const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
        if (loadedModel) {
          console.log('[LoadingScreen] Model already loaded:', loadedModel.id);
          setModelProgress(100);
          setLoadingStage('ready');
          setScreen('onboarding');
          return;
        }

        console.log('[LoadingScreen] No model loaded, checking cache...');

        // Check model status
        const model = ModelManager.getModels().find((m) => m.id === 'lfm2-350m-q4_k_m');
        console.log('[LoadingScreen] Model status:', model?.status);
        
        const isDownloaded = model && (model.status === 'downloaded' || model.status === 'loaded');

        // SKIP LOADING SCREEN IF USING FALLBACK MODE
        // Since you're using fallback mode (no real AI), we can skip the loading entirely
        const SKIP_MODEL_LOAD = true; // Set to false to load the real model
        
        if (SKIP_MODEL_LOAD && isDownloaded) {
          console.log('[LoadingScreen] ⚡ Skipping model load - fallback mode active');
          setModelProgress(100);
          setLoadingStage('ready');
          setTimeout(() => {
            setScreen('onboarding');
          }, 500);
          return;
        }

        // Subscribe to download progress only if we need to download
        if (!isDownloaded) {
          setLoadingStage('downloading');
          console.log('[LoadingScreen] Model not in cache - downloading (250MB, this may take a few minutes)...');
          
          unsubscribe = EventBus.shared.on('model.downloadProgress', (evt: any) => {
            if (evt.modelId === 'lfm2-350m-q4_k_m') {
              const progress = (evt.progress ?? 0) * 100;
              setModelProgress(progress);
            }
          });

          await ModelManager.downloadModel('lfm2-350m-q4_k_m');
          console.log('[LoadingScreen] ✅ Model downloaded successfully and cached');
        } else {
          console.log('[LoadingScreen] ✅ Model found in cache - no download needed!');
        }

        // Load the LLM for calendar/post generation
        setLoadingStage('loading');
        console.log('[LoadingScreen] Loading model from cache into memory...');
        setModelProgress(90);
        
        const loadResult = await ModelManager.loadModel('lfm2-350m-q4_k_m');
        console.log('[LoadingScreen] Model load result:', loadResult);

        // Verify model is actually loaded
        const verifyLoaded = ModelManager.getLoadedModel(ModelCategory.Language);
        console.log('[LoadingScreen] Verification - Model loaded:', verifyLoaded?.id);

        setModelProgress(100);
        setLoadingStage('ready');
        
        // Small delay to show 100% before transitioning
        setTimeout(() => {
          setScreen('onboarding');
        }, 500);
      } catch (error) {
        console.error('Failed to load model:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setLoadError(`Failed to load AI model: ${errorMessage}. Please refresh the page to try again.`);
        setModelProgress(0);
      }
    };

    initModel();

    return () => {
      unsubscribe?.();
    };
  }, [setModelProgress, setScreen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center p-4 animate-gradient-slow">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full transform transition-all">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl mb-4 shadow-lg animate-float">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Sutradhar
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            AI-Powered Content Calendar
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Your personal content strategist
          </p>
        </div>

        {/* Progress Bar or Error */}
        {loadError ? (
          <div className="mb-8 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-1">Loading Failed</h3>
                <p className="text-red-700 text-sm">{loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 h-full rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${modelProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className="text-sm text-gray-600 font-medium">
                {loadingStage === 'checking' && 'Checking cache...'}
                {loadingStage === 'downloading' && 'Downloading AI model (first time only)...'}
                {loadingStage === 'loading' && 'Loading from cache...'}
                {loadingStage === 'ready' && 'Ready!'}
              </p>
              <p className="text-sm font-bold text-orange-600">
                {Math.round(modelProgress)}%
              </p>
            </div>
            {loadingStage === 'downloading' && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                📦 Downloading 250MB - this only happens once and will be cached for offline use
              </p>
            )}
            {loadingStage === 'loading' && (
              <p className="text-xs text-green-600 mt-2 text-center font-semibold">
                ✅ Using cached model - no download needed!
              </p>
            )}
          </div>
        )}

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg transition-all hover:bg-green-100">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">100% local - runs in your browser</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg transition-all hover:bg-blue-100">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse animation-delay-150">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Zero API keys required</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg transition-all hover:bg-purple-100">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center animate-pulse animation-delay-300">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Works offline after first load</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-orange-600">RunAnywhere SDK</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Built for HackXtreme
          </p>
        </div>
      </div>
    </div>
  );
}
