import { TextGeneration } from '@runanywhere/web-llamacpp';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns';
import type { FormData, SeriesContext, PostTitle } from '../store/useStore';

// ============================================================================
// Agent 1: Calendar Title Generation
// ============================================================================

interface GenerateCalendarParams {
  formData: FormData;
  currentMonth: Date;
  seriesContext: SeriesContext | null;
  onToken?: (token: string, accumulated: string) => void;
}

export async function generateCalendarTitles(
  params: GenerateCalendarParams
): Promise<PostTitle[]> {
  const { formData, currentMonth, seriesContext, onToken } = params;

  // Validate that the LLM model is loaded
  console.log('[CalendarAgent] Checking if LLM model is loaded...');
  const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
  console.log('[CalendarAgent] Loaded model:', loadedModel?.id, 'Status:', loadedModel ? 'LOADED' : 'NOT LOADED');
  
  if (!loadedModel) {
    throw new Error('No LLM model loaded. Please wait for the model to finish loading or refresh the page.');
  }

  console.log('[CalendarAgent] Model validation passed, proceeding with generation...');

  // Get all days in the month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter to only posting days
  const postingDays = allDays.filter((day) => {
    const dayOfWeek = getDay(day);
    return formData.postingDays.includes(dayOfWeek);
  });

  // Limit to requested number of posts
  const targetDays = postingDays.slice(0, formData.postsPerMonth);
  
  console.log('[CalendarAgent] Generation params:', {
    month: format(currentMonth, 'MMMM yyyy'),
    postsRequested: formData.postsPerMonth,
    postingDays: formData.postingDays,
    actualPostsToGenerate: targetDays.length,
    niche: formData.niche,
    platform: formData.platform,
  });

  // EMERGENCY FALLBACK: If generation takes too long, use this
  // Remove this section once model performance is acceptable
  const USE_FALLBACK = false; // Set to true to test quickly
  
  if (USE_FALLBACK) {
    console.warn('[CalendarAgent] Using fallback mock titles (model too slow)');
    const mockTitles = Array(targetDays.length).fill(null).map((_, i) => 
      `${formData.niche} Journey: Part ${i + 1} - ${['Basics', 'Progress', 'Mastery', 'Advanced', 'Expert', 'Pro Tips', 'Deep Dive', 'Secrets'][i] || 'Topic ' + (i + 1)}`
    );
    
    const postTitles: PostTitle[] = targetDays.map((day, index) => ({
      date: format(day, 'yyyy-MM-dd'),
      title: mockTitles[index],
      dayOfWeek: getDay(day),
    }));
    
    return postTitles;
  }

  // Build prompt
  const prompt = buildCalendarPrompt(formData, currentMonth, seriesContext, targetDays.length);

  // Generate with retry logic for invalid JSON (with optional streaming)
  let response = await generateWithLLM(prompt, onToken);
  let titles = parseCalendarJSON(response);

  // Retry once if JSON is invalid (without streaming on retry to be faster)
  if (!titles || titles.length === 0) {
    console.warn('First attempt returned invalid JSON. Retrying with stricter prompt...');
    const stricterPrompt = buildCalendarPrompt(formData, currentMonth, seriesContext, targetDays.length, true);
    response = await generateWithLLM(stricterPrompt);
    titles = parseCalendarJSON(response);
  }

  if (!titles || titles.length === 0) {
    throw new Error('Failed to generate valid calendar titles after 2 attempts');
  }

  // Map titles to specific dates
  const postTitles: PostTitle[] = targetDays.map((day, index) => ({
    date: format(day, 'yyyy-MM-dd'),
    title: titles[index] || `Post ${index + 1}`,
    dayOfWeek: getDay(day),
  }));

  return postTitles;
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildCalendarPrompt(
  formData: FormData,
  currentMonth: Date,
  seriesContext: SeriesContext | null,
  numPosts: number,
  strict = false
): string {
  const monthName = format(currentMonth, 'MMMM yyyy');

  let prompt = '';

  if (seriesContext) {
    // Continuing an existing series - SIMPLIFIED
    prompt = `Continue content series "${seriesContext.seriesName}" for ${monthName}.
Theme: ${seriesContext.seriesTheme}
Previous titles: ${seriesContext.lastThreeTitles.slice(0, 2).join(', ')}

Platform: ${formData.platform}
Generate ${numPosts} ${formData.tone.toLowerCase()} post titles in ${formData.language} as JSON array.

Example: ["Title 1", "Title 2"]`;
  } else {
    // Starting a new series - SIMPLIFIED
    prompt = `Create ${numPosts} ${formData.tone.toLowerCase()} ${formData.platform} post titles for ${formData.niche} in ${formData.language}.
Make them a cohesive series.

Respond with JSON array only: ["Title 1", "Title 2", ...]`;
  }

  return prompt;
}

// ============================================================================
// LLM Generation
// ============================================================================

async function generateWithLLM(prompt: string, onToken?: (token: string, accumulated: string) => void): Promise<string> {
  console.log('[CalendarAgent] Starting LLM generation...');
  console.log('[CalendarAgent] Prompt length:', prompt.length, 'characters');
  console.log('[CalendarAgent] Prompt preview:', prompt.substring(0, 200) + '...');
  
  if (onToken) {
    console.log('[CalendarAgent] 🌊 Streaming mode enabled - tokens will arrive progressively');
  } else {
    console.log('[CalendarAgent] ⏳ Batch mode - please wait, generation may take 30-60 seconds...');
  }
  
  try {
    const startTime = Date.now();
    
    // Add timeout wrapper (2 minutes max)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Generation timeout after 120 seconds. Your device may be too slow for this model. Try reducing the number of posts to 2-3 or refresh the page.')), 120000);
    });
    
    let generationPromise: Promise<string>;
    
    if (onToken) {
      // Streaming generation
      generationPromise = (async () => {
        const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
          maxTokens: 128,  // DRASTICALLY reduced - just enough for short titles
          temperature: 0.8,  // Higher temp = faster, less careful generation
          systemPrompt: 'JSON array only.',  // Minimal system prompt
        });
        
        let accumulated = '';
        for await (const token of stream) {
          accumulated += token;
          onToken(token, accumulated);
        }
        
        const result = await resultPromise;
        return result.text || accumulated;
      })();
    } else {
      // Batch generation (original logic)
      generationPromise = TextGeneration.generate(prompt, {
        maxTokens: 128,
        temperature: 0.8,
        systemPrompt: 'JSON array only.',
      }).then(result => result.text);
    }
    
    const text = await Promise.race([generationPromise, timeoutPromise]);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('[CalendarAgent] ✅ LLM generation completed in', duration, 'seconds');
    console.log('[CalendarAgent] Response length:', text.length, 'characters');
    console.log('[CalendarAgent] Response preview:', text.substring(0, 200));
    
    return text;
  } catch (error) {
    console.error('[CalendarAgent] ❌ LLM generation failed:', error);
    throw error;
  }
}

// ============================================================================
// JSON Parsing
// ============================================================================

function parseCalendarJSON(response: string): string[] | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');

    // Find the first [ and last ]
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');

    if (start === -1 || end === -1) {
      console.error('No JSON array found in response');
      return null;
    }

    const jsonStr = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      console.error('Parsed JSON is not an array');
      return null;
    }

    // Validate all items are strings
    if (!parsed.every((item) => typeof item === 'string')) {
      console.error('Not all items in array are strings');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse calendar JSON:', error);
    return null;
  }
}
