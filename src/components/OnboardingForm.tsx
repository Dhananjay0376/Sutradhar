import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import type { Platform, Tone, Language } from '../store/useStore';

const PLATFORMS: Platform[] = ['Instagram', 'LinkedIn', 'Twitter', 'YouTube', 'TikTok'];
const TONES: Tone[] = ['Casual', 'Professional', 'Witty', 'Inspirational', 'Educational'];
const LANGUAGES: Language[] = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OnboardingForm() {
  const { formData, updateFormData, generateCalendar, isGeneratingCalendar, calendarError, calendarStreamingText, calendarTokenCount } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.niche.trim()) {
      newErrors.niche = 'Please enter your niche';
    }
    
    if (formData.postingDays.length === 0) {
      newErrors.postingDays = 'Please select at least one posting day';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check if model is loaded before generating
    console.log('[OnboardingForm] Checking if model is loaded before generation...');
    const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
    console.log('[OnboardingForm] Model status:', loadedModel ? 'LOADED' : 'NOT LOADED');
    
    if (!loadedModel) {
      alert('AI model is not loaded yet. Please wait for the loading screen to complete, or refresh the page.');
      return;
    }

    setErrors({});
    
    console.log('[OnboardingForm] Starting calendar generation...');
    // Generate calendar (new series)
    await generateCalendar(true);
    
    // Navigate to calendar view only if no error occurred
    const state = useStore.getState();
    if (!state.calendarError) {
      console.log('[OnboardingForm] Generation successful, navigating to calendar...');
      state.setScreen('calendar');
    } else {
      console.error('[OnboardingForm] Generation failed:', state.calendarError);
    }
  };

  const toggleDay = (dayIndex: number) => {
    const days = [...formData.postingDays];
    const index = days.indexOf(dayIndex);
    
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(dayIndex);
      days.sort((a, b) => a - b);
    }
    
    updateFormData({ postingDays: days });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 sm:p-8 animate-fade-in relative">
      {/* Loading Overlay */}
      {isGeneratingCalendar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              {/* Animated Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl mb-6 shadow-lg animate-bounce">
                <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>

              {/* Status Text */}
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Generating Your Calendar
              </h3>
              <p className="text-gray-600 mb-6">
                The AI is crafting your personalized content series...
              </p>

              {/* Progress Steps */}
              <div className="space-y-3 text-left mb-6">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">Model loaded and ready</span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${calendarTokenCount > 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                  {calendarTokenCount > 0 ? (
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 border-3 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${calendarTokenCount > 0 ? 'text-gray-700' : 'text-gray-700'}`}>
                    Analyzing your preferences...
                    {calendarTokenCount > 0 && <span className="text-green-600 ml-2">({calendarTokenCount} tokens)</span>}
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${calendarTokenCount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  {calendarTokenCount > 0 ? (
                    <div className="w-5 h-5 border-3 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 border-3 border-gray-300 rounded-full flex-shrink-0" />
                  )}
                  <span className={`text-sm ${calendarTokenCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>Creating content strategy</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-5 h-5 border-3 border-gray-300 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-500">Generating post titles</span>
                </div>
              </div>

              {/* Time Estimate */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This may take 30-90 seconds depending on your device</span>
              </div>

              {/* Streaming Output */}
              {calendarStreamingText && (
                <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 max-h-40 overflow-y-auto animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Streaming Live</p>
                    </div>
                    <div className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                      {calendarTokenCount} tokens
                    </div>
                  </div>
                  <div className="bg-white/70 rounded p-3 backdrop-blur-sm">
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-words leading-relaxed">
                      {calendarStreamingText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Waiting message when no tokens yet */}
              {!calendarStreamingText && calendarTokenCount === 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    <p className="text-sm text-blue-700 font-medium">
                      Initializing AI model... Waiting for first token...
                    </p>
                  </div>
                </div>
              )}

              {/* Patience Message */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  💡 <strong>Intel i3 Optimized:</strong> Using smart template system for instant results. 
                  Real AI inference is too slow on low-power devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl mb-4 shadow-xl animate-float">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Sutradhar
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 font-semibold mb-2">
            Create your AI-powered content calendar
          </p>
          <p className="text-gray-600">
            Generate a month of cohesive social media content in minutes
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700">100% Local AI - No API Keys Required</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 space-y-8 animate-slide-up animation-delay-150">
          {/* Error Display */}
          {calendarError && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-fade-in">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-red-800 font-semibold mb-1">Generation Failed</h3>
                  <p className="text-red-700 text-sm">{calendarError}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Niche */}
          <div className="transform transition-all hover-scale">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              What's your niche?
            </label>
            <input
              type="text"
              placeholder="e.g. Personal Finance, Fitness, Tech, Travel..."
              value={formData.niche}
              onChange={(e) => updateFormData({ niche: e.target.value })}
              className={`w-full px-5 py-4 border-2 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all ${
                errors.niche ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-orange-300'
              }`}
            />
            {errors.niche && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-fade-in">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.niche}
              </p>
            )}
          </div>

          {/* Platform */}
          <div className="transform transition-all hover-scale">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Which platform?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => updateFormData({ platform })}
                  className={`px-5 py-4 rounded-xl border-2 font-semibold text-base transition-all transform hover:scale-105 ${
                    formData.platform === platform
                      ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg animate-pulse-glow'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="transform transition-all hover-scale">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              Content language
            </label>
            <select
              value={formData.language}
              onChange={(e) => updateFormData({ language: e.target.value as Language })}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-orange-200 hover:border-orange-300 transition-all cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Tone */}
          <div className="transform transition-all hover-scale">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">💬</span>
              What tone do you want?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => updateFormData({ tone })}
                  className={`px-5 py-4 rounded-xl border-2 font-semibold text-base transition-all transform hover:scale-105 ${
                    formData.tone === tone
                      ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg animate-pulse-glow'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Posts per month */}
          <div className="transform transition-all hover-scale">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              How many posts this month?
              <span className="ml-auto text-2xl font-extrabold text-orange-600">
                {formData.postsPerMonth}
              </span>
            </label>
            <input
              type="range"
              min="2"
              max="10"
              value={formData.postsPerMonth}
              onChange={(e) => updateFormData({ postsPerMonth: parseInt(e.target.value) })}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-pink-500 transition-all"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #ec4899 ${((formData.postsPerMonth - 2) / 8) * 100}%, #e5e7eb ${((formData.postsPerMonth - 2) / 8) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2 font-medium">
              <span>2 posts (fastest)</span>
              <span>10 posts</span>
            </div>
            <p className="text-xs text-orange-600 mt-2 font-semibold">
              ⚡ Lower = Faster generation on your device
            </p>
          </div>

          {/* Posting days */}
          <div className="transform transition-all hover-scale">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Which days do you post?
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`py-4 rounded-xl border-2 font-bold text-base transition-all transform hover:scale-110 ${
                    formData.postingDays.includes(index)
                      ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {errors.postingDays && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-fade-in">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.postingDays}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isGeneratingCalendar}
            className="w-full py-5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isGeneratingCalendar ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating Your Calendar...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate My Calendar</span>
                </>
              )}
            </span>
            {!isGeneratingCalendar && (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-600 font-medium">
            Your data stays in your browser. No cloud, no tracking.
          </p>
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-orange-600">RunAnywhere SDK</span>
          </p>
        </div>
      </div>
    </div>
  );
}
