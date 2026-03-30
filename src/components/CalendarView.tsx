import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';
import { useStore } from '../store/useStore';

export function CalendarView() {
  const {
    currentMonth,
    postTitles,
    seriesContext,
    selectPost,
    continueToNextMonth,
    isGeneratingCalendar,
    calendarError,
  } = useStore();

  // Get all days in the month for the calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const firstDayOfWeek = getDay(monthStart);

  // Add empty cells for days before the first day
  const emptyCells = Array(firstDayOfWeek).fill(null);
  const calendarDays = [...emptyCells, ...allDays];

  // Find post for a given day
  const getPostForDay = (day: Date | null) => {
    if (!day) return null;
    return postTitles.find((post) => isSameDay(parseISO(post.date), day));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 sm:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent mb-3">
            {format(currentMonth, 'MMMM yyyy')}
          </h1>
          {seriesContext && (
            <div className="inline-flex flex-col items-center gap-2 bg-white px-6 py-3 rounded-2xl shadow-lg">
              <p className="text-xl font-bold text-gray-800">
                {seriesContext.seriesName}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Month {seriesContext.monthsCompleted}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  {postTitles.length} posts scheduled
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {calendarError && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-300 rounded-2xl text-red-700 shadow-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-bold text-lg">Error generating calendar</p>
                <p className="text-sm mt-1">{calendarError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 animate-slide-up animation-delay-150">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm sm:text-base font-bold text-gray-700 py-3 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {calendarDays.map((day, index) => {
              const post = getPostForDay(day);
              const isEmpty = !day;

              if (isEmpty) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square border-2 rounded-2xl p-3 flex flex-col transition-all duration-200 ${
                    post
                      ? 'border-orange-400 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 cursor-pointer hover:shadow-2xl hover:scale-105 hover:border-orange-500 hover:-translate-y-1 group'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                  onClick={() => post && selectPost(post)}
                >
                  <div className={`text-sm sm:text-base font-bold mb-2 ${post ? 'text-orange-600' : 'text-gray-500'}`}>
                    {format(day, 'd')}
                  </div>
                  {post && (
                    <>
                      <div className="flex-1 overflow-hidden mb-2">
                        <p className="text-xs sm:text-sm text-gray-700 font-medium line-clamp-3 leading-snug group-hover:text-gray-900 transition-colors">
                          {post.title}
                        </p>
                      </div>
                      <div className="flex items-center justify-end">
                        <svg className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Continue Series Button */}
        {seriesContext && (
          <div className="text-center animate-slide-up animation-delay-300">
            <button
              onClick={continueToNextMonth}
              disabled={isGeneratingCalendar}
              className="group px-10 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold text-lg rounded-2xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isGeneratingCalendar ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Generating Next Month...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Next Month</span>
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              {!isGeneratingCalendar && (
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            <p className="text-sm text-gray-600 mt-4 font-medium">
              Your series will continue with the next month's content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
