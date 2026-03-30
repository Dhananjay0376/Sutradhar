import { TextGeneration } from '@runanywhere/web-llamacpp';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import type { FormData, GeneratedPost } from '../store/useStore';

// ============================================================================
// Agent 2: Post Content Generation (with Streaming)
// ============================================================================

interface GeneratePostParams {
  title: string;
  date: string;
  formData: FormData;
  onToken?: (token: string, accumulated: string) => void;
}

export async function generatePostContent(
  params: GeneratePostParams
): Promise<GeneratedPost> {
  const { title, date, formData, onToken } = params;

  // Validate that the LLM model is loaded
  const loadedModel = ModelManager.getLoadedModel(ModelCategory.Language);
  if (!loadedModel) {
    throw new Error('No LLM model loaded. Please wait for the model to finish loading or refresh the page.');
  }

  // Build prompt
  const prompt = buildPostPrompt(formData, title);

  // Generate with streaming if callback provided
  if (onToken) {
    return await generatePostStreaming(prompt, title, date, formData, onToken);
  } else {
    return await generatePostBatch(prompt, title, date, formData);
  }
}

// ============================================================================
// Streaming Generation
// ============================================================================

async function generatePostStreaming(
  prompt: string,
  title: string,
  date: string,
  formData: FormData,
  onToken: (token: string, accumulated: string) => void
): Promise<GeneratedPost> {
  const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
    maxTokens: 1024,
    temperature: 0.8,
    systemPrompt: 'You are a professional social media content creator. Always respond with valid JSON only.',
  });

  let accumulated = '';
  for await (const token of stream) {
    accumulated += token;
    onToken(token, accumulated);
  }

  const result = await resultPromise;
  const text = result.text || accumulated;

  return parsePostJSON(text, title, date, formData);
}

// ============================================================================
// Batch Generation (no streaming)
// ============================================================================

async function generatePostBatch(
  prompt: string,
  title: string,
  date: string,
  formData: FormData
): Promise<GeneratedPost> {
  const result = await TextGeneration.generate(prompt, {
    maxTokens: 1024,
    temperature: 0.8,
    systemPrompt: 'You are a professional social media content creator. Always respond with valid JSON only.',
  });

  return parsePostJSON(result.text, title, date, formData);
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildPostPrompt(formData: FormData, title: string): string {
  const hashtagCount = getHashtagCount(formData.platform);

  return `You are a professional ${formData.platform} content creator specializing in ${formData.niche}.

TASK: Create a complete ${formData.platform} post for the following title:
"${title}"

USER PREFERENCES:
- Platform: ${formData.platform}
- Language: ${formData.language}
- Tone: ${formData.tone}
- Niche: ${formData.niche}

Generate a full post with these components:

1. **hook**: A scroll-stopping first line (1-2 sentences max)
2. **caption**: The full post body (3-5 paragraphs, optimized for ${formData.platform})
3. **hashtags**: Array of ${hashtagCount} relevant hashtags (without # symbol)
4. **cta**: A clear call-to-action (1 sentence)
5. **platformTip**: A specific tactical tip for maximizing reach on ${formData.platform} (1-2 sentences)

Write everything in ${formData.language} with a ${formData.tone.toLowerCase()} tone.

Respond ONLY with valid JSON in this exact format:
{
  "hook": "Your hook here",
  "caption": "Your caption here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "cta": "Your CTA here",
  "platformTip": "Your platform tip here"
}

No markdown, no explanation, just pure JSON.`;
}

// ============================================================================
// Platform-Specific Logic
// ============================================================================

function getHashtagCount(platform: string): number {
  switch (platform) {
    case 'Instagram':
      return 10;
    case 'LinkedIn':
      return 5;
    case 'Twitter':
      return 3;
    case 'TikTok':
      return 5;
    case 'YouTube':
      return 8;
    default:
      return 5;
  }
}

// ============================================================================
// JSON Parsing
// ============================================================================

interface PostContentJSON {
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  platformTip: string;
}

function parsePostJSON(
  response: string,
  title: string,
  date: string,
  formData: FormData
): GeneratedPost {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');

    // Find the first { and last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error('No JSON object found in response');
    }

    const jsonStr = cleaned.slice(start, end + 1);
    const parsed: PostContentJSON = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.hook || !parsed.caption || !parsed.cta || !parsed.platformTip) {
      throw new Error('Missing required fields in JSON response');
    }

    if (!Array.isArray(parsed.hashtags)) {
      throw new Error('hashtags must be an array');
    }

    // Return GeneratedPost
    return {
      date,
      title,
      hook: parsed.hook,
      caption: parsed.caption,
      hashtags: parsed.hashtags,
      cta: parsed.cta,
      platformTip: parsed.platformTip,
    };
  } catch (error) {
    console.error('Failed to parse post JSON:', error);
    
    // Return fallback post
    return {
      date,
      title,
      hook: 'Error generating hook',
      caption: `Error: ${error instanceof Error ? error.message : String(error)}\n\nPlease try generating again.`,
      hashtags: [],
      cta: 'Try again',
      platformTip: 'Generation failed. Please retry.',
    };
  }
}
