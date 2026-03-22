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

// Smart template-based title generator (for devices that can't run AI fast enough)
function generateSmartTitles(niche: string, count: number, platform: string): string[] {
  const templates = {
    // Content progression patterns
    journey: ['Getting Started', 'First Steps', 'Building Momentum', 'Taking It Further', 'Advanced Strategies', 'Mastery Level', 'Expert Insights', 'Pro Secrets', 'Next Level', 'Ultimate Guide'],
    tips: ['Essential Tips', 'Pro Tips', 'Hidden Gems', 'Game Changers', 'Must-Know Hacks', 'Insider Secrets', 'Power Moves', 'Expert Strategies', 'Winning Formula', 'Success Blueprint'],
    mistakes: ['Common Mistakes', 'What NOT to Do', 'Avoid These Traps', 'Costly Errors', 'Red Flags', 'Warning Signs', 'Pitfalls to Avoid', 'Lessons Learned', 'Fixing Your Approach', 'Course Correction'],
    how: ['How to Start', 'Step-by-Step Guide', 'Quick Tutorial', 'Easy Method', 'Simple Strategy', 'Proven Process', 'Actionable Plan', 'Complete Roadmap', 'Practical Approach', 'Real Results'],
    why: ['Why This Matters', 'The Real Reason', 'Hidden Truth', 'What Nobody Tells You', 'Behind the Scenes', 'The Science', 'Understanding the Basics', 'Core Principles', 'Foundation First', 'The Reality'],
  };
  
  // Choose a random pattern
  const patterns = Object.keys(templates);
  const pattern = patterns[Math.floor(Math.random() * patterns.length)] as keyof typeof templates;
  const words = templates[pattern];
  
  // Generate titles
  return Array(count).fill(null).map((_, i) => {
    const word = words[i % words.length];
    return `${niche}: ${word}`;
  });
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

  // USE OLLAMA BACKEND for real AI (much faster than browser WASM)
  const USE_OLLAMA_BACKEND = true; // Set to false to use browser AI
  
  if (USE_OLLAMA_BACKEND) {
    console.log('[CalendarAgent] 🚀 Using Ollama backend for real AI generation');
    
    try {
      // Check if backend is running
      const healthCheck = await fetch('http://localhost:3001/api/health');
      if (!healthCheck.ok) {
        throw new Error('Ollama backend not running. Start it with: cd server && npm start');
      }
      
      console.log('[CalendarAgent] ✅ Backend connected');
      
      // Call backend API with streaming
      const response = await fetch('http://localhost:3001/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: formData.niche,
          numPosts: targetDays.length,
          platform: formData.platform,
          language: formData.language,
          tone: formData.tone,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Backend API error: ' + response.statusText);
      }
      
      // Stream tokens from backend
      if (!response.body) {
        throw new Error('No response body from backend');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6)); // Remove "data: " prefix
            
            if (data.token && onToken) {
              accumulated = data.accumulated;
              onToken(data.token, accumulated);
            }
            
            if (data.done) {
              console.log('[CalendarAgent] ✅ Ollama generation complete');
              const titles = parseCalendarJSON(data.text);
              
              if (!titles || titles.length === 0) {
                throw new Error('Invalid JSON from Ollama');
              }
              
              const postTitles: PostTitle[] = targetDays.map((day, index) => ({
                date: format(day, 'yyyy-MM-dd'),
                title: titles[index] || `Post ${index + 1}`,
                dayOfWeek: getDay(day),
              }));
              
              return postTitles;
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      }
      
      throw new Error('Stream ended without completion');
      
    } catch (error) {
      console.error('[CalendarAgent] ❌ Ollama backend error:', error);
      console.warn('[CalendarAgent] Falling back to template mode');
      // Fall through to template fallback below
    }
  }
  
  // FALLBACK: Template-based generation (instant, no AI)
  const USE_FALLBACK = true;
  
  if (USE_FALLBACK) {
    console.warn('[CalendarAgent] 🚀 Using smart template mode (Intel i3 optimized)');
    
    // Generate contextual titles based on niche
    const templates = generateSmartTitles(formData.niche, targetDays.length, formData.platform);
    
    // Simulate streaming if callback is provided
    if (onToken) {
      const jsonResponse = JSON.stringify(templates, null, 2);
      console.log('[CalendarAgent] 🌊 Simulating streaming...');
      
      for (let i = 0; i < jsonResponse.length; i++) {
        onToken(jsonResponse[i], jsonResponse.substring(0, i + 1));
        await new Promise(resolve => setTimeout(resolve, 5)); // Fast streaming
      }
      
      console.log('[CalendarAgent] ✅ Streaming complete!');
    }
    
    const postTitles: PostTitle[] = targetDays.map((day, index) => ({
      date: format(day, 'yyyy-MM-dd'),
      title: templates[index],
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
  // EXPLICIT JSON FORMAT for 1.2B Tool model
  // This model is optimized for structured output
  
  if (seriesContext) {
    // Continuing series
    return `JSON array with ${numPosts} ${formData.niche} post titles continuing "${seriesContext.seriesName}":
["title1","title2"]`;
  } else {
    // New series
    return `JSON array with ${numPosts} ${formData.niche} post titles:
["title1","title2"]`;
  }
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
        console.log('[CalendarAgent] 🌊 Initiating streaming generation...');
        const streamStartTime = Date.now();
        
        const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
          maxTokens: 40,  // ULTRA LOW - optimized for Intel i3 (was 128)
          temperature: 0.9,  // Very high temp = faster, more random (better for low-power)
          systemPrompt: 'JSON only',  // Ultra minimal
        });
        
        console.log('[CalendarAgent] 🌊 Stream initialized in', ((Date.now() - streamStartTime) / 1000).toFixed(2), 'seconds');
        console.log('[CalendarAgent] 🌊 Waiting for first token...');
        
        let accumulated = '';
        let tokenCount = 0;
        const firstTokenTime = Date.now();
        
        for await (const token of stream) {
          if (tokenCount === 0) {
            console.log('[CalendarAgent] ✅ First token arrived after', ((Date.now() - firstTokenTime) / 1000).toFixed(2), 'seconds');
          }
          
          accumulated += token;
          tokenCount++;
          onToken(token, accumulated);
          
          // Log every 10 tokens to show progress
          if (tokenCount % 10 === 0) {
            console.log(`[CalendarAgent] 📊 Generated ${tokenCount} tokens so far...`);
          }
        }
        
        console.log('[CalendarAgent] ✅ Streaming complete! Total tokens:', tokenCount);
        
        const result = await resultPromise;
        return result.text || accumulated;
      })();
    } else {
      // Batch generation (original logic)
      generationPromise = TextGeneration.generate(prompt, {
        maxTokens: 40,  // ULTRA LOW - optimized for Intel i3
        temperature: 0.9,
        systemPrompt: 'JSON only',
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
