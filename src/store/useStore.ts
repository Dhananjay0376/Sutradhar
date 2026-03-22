import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type Screen = 'loading' | 'onboarding' | 'calendar' | 'post';

export type Platform = 'Instagram' | 'LinkedIn' | 'Twitter' | 'YouTube' | 'TikTok';

export type Tone = 'Casual' | 'Professional' | 'Witty' | 'Inspirational' | 'Educational';

export type Language = 'English' | 'Hindi' | 'Hinglish' | 'Spanish' | 'French' | 'German';

export interface FormData {
  niche: string;
  platform: Platform;
  language: Language;
  tone: Tone;
  postsPerMonth: number;
  postingDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export interface PostTitle {
  date: string; // ISO date string (YYYY-MM-DD)
  title: string;
  dayOfWeek: number; // 0-6
}

export interface GeneratedPost {
  date: string; // ISO date string
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  platformTip: string;
}

export interface SeriesContext {
  seriesName: string;
  seriesTheme: string;
  lastThreeTitles: string[];
  monthsCompleted: number;
  formConfig: FormData;
}

// ============================================================================
// Store State
// ============================================================================

interface AppState {
  // Screen navigation
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;

  // Model loading
  modelProgress: number;
  setModelProgress: (progress: number) => void;

  // Onboarding form
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;

  // Calendar generation
  currentMonth: Date;
  postTitles: PostTitle[];
  isGeneratingCalendar: boolean;
  calendarError: string | null;
  calendarStreamingText: string; // Add streaming text state
  generateCalendar: (isNewSeries: boolean) => Promise<void>;
  setCurrentMonth: (date: Date) => void;

  // Post generation
  selectedPost: PostTitle | null;
  currentPost: GeneratedPost | null;
  isGeneratingPost: boolean;
  postError: string | null;
  selectPost: (post: PostTitle) => void;
  generatePost: () => Promise<void>;
  closePostModal: () => void;

  // Series continuity
  seriesContext: SeriesContext | null;
  saveSeriesContext: (context: SeriesContext) => void;
  clearSeriesContext: () => void;
  continueToNextMonth: () => Promise<void>;

  // Post cache (localStorage)
  generatedPosts: Record<string, GeneratedPost>; // key: ISO date string
  cachePost: (post: GeneratedPost) => void;
  getCachedPost: (date: string) => GeneratedPost | null;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FORM_DATA: FormData = {
  niche: '',
  platform: 'Instagram',
  language: 'English',
  tone: 'Casual',
  postsPerMonth: 4,  // Reduced to 4 for much faster generation
  postingDays: [1, 3, 5], // Mon, Wed, Fri
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Screen navigation
      currentScreen: 'loading',
      setScreen: (screen) => set({ currentScreen: screen }),

      // Model loading
      modelProgress: 0,
      setModelProgress: (progress) => set({ modelProgress: progress }),

      // Onboarding form
      formData: DEFAULT_FORM_DATA,
      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      // Calendar generation
      currentMonth: new Date(),
      postTitles: [],
      isGeneratingCalendar: false,
      calendarError: null,
      calendarStreamingText: '', // Initialize streaming text
      setCurrentMonth: (date) => set({ currentMonth: date }),

      generateCalendar: async (isNewSeries: boolean) => {
        set({ isGeneratingCalendar: true, calendarError: null, calendarStreamingText: '' });

        try {
          const { formData, currentMonth, seriesContext } = get();

          // Import here to avoid circular dependencies
          const { generateCalendarTitles } = await import('../services/calendarAgent');
          
          const titles = await generateCalendarTitles({
            formData,
            currentMonth,
            seriesContext: isNewSeries ? null : seriesContext,
            onToken: (token: string, accumulated: string) => {
              // Update streaming text in real-time
              set({ calendarStreamingText: accumulated });
            },
          });

          set({ postTitles: titles, isGeneratingCalendar: false, calendarStreamingText: '' });

          // Save series context after first generation
          if (isNewSeries || !seriesContext) {
            const newContext: SeriesContext = {
              seriesName: titles.length > 0 ? extractSeriesName(titles[0].title) : 'Content Series',
              seriesTheme: formData.niche,
              lastThreeTitles: titles.slice(-3).map((t: PostTitle) => t.title),
              monthsCompleted: 1,
              formConfig: formData,
            };
            get().saveSeriesContext(newContext);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set({ calendarError: message, isGeneratingCalendar: false });
        }
      },

      // Post generation
      selectedPost: null,
      currentPost: null,
      isGeneratingPost: false,
      postError: null,

      selectPost: (post) => {
        const cached = get().getCachedPost(post.date);
        set({
          selectedPost: post,
          currentPost: cached,
          currentScreen: 'post',
        });
      },

      generatePost: async () => {
        const { selectedPost, formData } = get();
        if (!selectedPost) return;

        // Check cache first
        const cached = get().getCachedPost(selectedPost.date);
        if (cached) {
          set({ currentPost: cached });
          return;
        }

        set({ isGeneratingPost: true, postError: null, currentPost: null });

        try {
          // Import here to avoid circular dependencies
          const { generatePostContent } = await import('../services/postAgent');
          
          const post = await generatePostContent({
            title: selectedPost.title,
            date: selectedPost.date,
            formData,
          });

          get().cachePost(post);
          set({ currentPost: post, isGeneratingPost: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set({ postError: message, isGeneratingPost: false });
        }
      },

      closePostModal: () => {
        set({ selectedPost: null, currentPost: null, currentScreen: 'calendar' });
      },

      // Series continuity
      seriesContext: null,
      saveSeriesContext: (context) => set({ seriesContext: context }),
      clearSeriesContext: () => set({ seriesContext: null, postTitles: [] }),

      continueToNextMonth: async () => {
        const { currentMonth, postTitles, seriesContext, formData } = get();
        
        if (!seriesContext) return;

        // Move to next month
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        // Update series context with last 3 titles from current month
        const updatedContext: SeriesContext = {
          ...seriesContext,
          lastThreeTitles: postTitles.slice(-3).map((t) => t.title),
          monthsCompleted: seriesContext.monthsCompleted + 1,
        };

        set({ 
          currentMonth: nextMonth,
          seriesContext: updatedContext,
        });

        // Generate next month's calendar
        await get().generateCalendar(false);
      },

      // Post cache
      generatedPosts: {},
      cachePost: (post) =>
        set((state) => ({
          generatedPosts: {
            ...state.generatedPosts,
            [post.date]: post,
          },
        })),
      getCachedPost: (date) => get().generatedPosts[date] || null,
    }),
    {
      name: 'sutradhar-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        seriesContext: state.seriesContext,
        generatedPosts: state.generatedPosts,
        formData: state.formData,
        currentMonth: state.currentMonth,
        postTitles: state.postTitles,
      }),
    }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function extractSeriesName(firstTitle: string): string {
  // Try to extract series name from first title
  // E.g., "The Fitness Foundations Series: Week 1 - Core Basics"
  // -> "The Fitness Foundations Series"
  const match = firstTitle.match(/^(.+?)(:|-|—)/);
  return match ? match[1].trim() : 'Content Series';
}
