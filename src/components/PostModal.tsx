import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useStore } from '../store/useStore';
import { generatePostContent } from '../services/postAgent';

export function PostModal() {
  const {
    selectedPost,
    currentPost,
    formData,
    isGeneratingPost,
    closePostModal,
  } = useStore();

  const [streamedContent, setStreamedContent] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Auto-generate on mount if no cached post
  useEffect(() => {
    if (selectedPost && !currentPost && !isGeneratingPost) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedPost) return;

    useStore.setState({ isGeneratingPost: true, postError: null });
    setStreamedContent('');

    try {
      const post = await generatePostContent({
        title: selectedPost.title,
        date: selectedPost.date,
        formData,
        onToken: (_token, accumulated) => {
          setStreamedContent(accumulated);
        },
      });

      useStore.getState().cachePost(post);
      useStore.setState({ currentPost: post, isGeneratingPost: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useStore.setState({ postError: message, isGeneratingPost: false });
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAll = () => {
    if (!currentPost) return;

    const fullPost = `${currentPost.hook}

${currentPost.caption}

${currentPost.hashtags.map((tag) => `#${tag}`).join(' ')}

${currentPost.cta}`;

    copyToClipboard(fullPost, 'all');
  };

  if (!selectedPost) return null;

  const date = parseISO(selectedPost.date);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 animate-slide-up">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 sm:p-8 flex items-start justify-between bg-gradient-to-r from-orange-50 to-pink-50">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 text-sm text-orange-600 font-semibold mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(date, 'EEEE, MMMM d, yyyy')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 leading-tight">
              {selectedPost.title}
            </h2>
          </div>
          <button
            onClick={closePostModal}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {isGeneratingPost && (
            <div className="space-y-6 animate-fade-in">
              {/* Status Card */}
              <div className="p-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-2xl border-2 border-orange-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-800">Generating Your Post</p>
                    <p className="text-sm text-gray-600">AI is crafting engaging content...</p>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">Analyzing post title</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-700 font-medium">Creating hook & caption</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    <span className="text-gray-500">Generating hashtags</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    <span className="text-gray-500">Optimizing for {formData.platform}</span>
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="mt-4 pt-4 border-t border-orange-200 flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Usually takes 10-20 seconds</span>
                </div>
              </div>

              {/* Streaming Content Preview */}
              {streamedContent && (
                <div className="p-5 bg-white rounded-2xl border-2 border-orange-300 shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Live Preview</span>
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">
                    {streamedContent}
                    <span className="inline-block w-2 h-5 bg-orange-500 animate-pulse ml-1" />
                  </p>
                </div>
              )}
            </div>
          )}

          {currentPost && !isGeneratingPost && (
            <>
              {/* Hook */}
              <Section
                title="Hook"
                icon="🎣"
                content={currentPost.hook}
                onCopy={() => copyToClipboard(currentPost.hook, 'hook')}
                copied={copiedSection === 'hook'}
              />

              {/* Caption */}
              <Section
                title="Caption"
                icon="📝"
                content={currentPost.caption}
                onCopy={() => copyToClipboard(currentPost.caption, 'caption')}
                copied={copiedSection === 'caption'}
              />

              {/* Hashtags */}
              <div className="border-2 border-gray-200 rounded-2xl p-5 hover:border-orange-300 transition-all hover-scale">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <span className="text-2xl">#️⃣</span>
                    Hashtags
                  </h3>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        currentPost.hashtags.map((tag) => `#${tag}`).join(' '),
                        'hashtags'
                      )
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                      copiedSection === 'hashtags'
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    }`}
                  >
                    {copiedSection === 'hashtags' ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentPost.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-4 py-2 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 rounded-xl text-sm font-semibold hover:from-orange-200 hover:to-pink-200 transition-all"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Section
                title="Call to Action"
                icon="📣"
                content={currentPost.cta}
                onCopy={() => copyToClipboard(currentPost.cta, 'cta')}
                copied={copiedSection === 'cta'}
              />

              {/* Platform Tip */}
              <div className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 hover-scale">
                <h3 className="font-bold text-blue-800 text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Platform Tip for {formData.platform}
                </h3>
                <p className="text-blue-900 leading-relaxed">{currentPost.platformTip}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {currentPost && !isGeneratingPost && (
          <div className="border-t border-gray-200 p-6 sm:p-8 flex flex-col sm:flex-row gap-3 bg-gray-50">
            <button
              onClick={copyAll}
              className="flex-1 py-4 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {copiedSection === 'all' ? (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied All!
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All
                  </>
                )}
              </span>
              {copiedSection !== 'all' && (
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            <button
              onClick={handleGenerate}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-bold text-lg rounded-xl hover:bg-white hover:border-orange-300 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section Component
// ============================================================================

interface SectionProps {
  title: string;
  content: string;
  onCopy: () => void;
  copied: boolean;
  icon?: string;
}

function Section({ title, content, onCopy, copied, icon }: SectionProps) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 hover:border-orange-300 transition-all group hover-scale">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          {title}
        </h3>
        <button
          onClick={onCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}
