import React, { useEffect, useState } from 'react';

interface MyTeamPreDraftProps {
  draftStart: Date | null;
  draftId: string | null;
}

function getTimeRemaining(target: Date) {
  const total = target.getTime() - Date.now();
  const seconds = Math.max(Math.floor((total / 1000) % 60), 0);
  const minutes = Math.max(Math.floor((total / 1000 / 60) % 60), 0);
  const hours = Math.max(Math.floor((total / (1000 * 60 * 60)) % 24), 0);
  const days = Math.max(Math.floor(total / (1000 * 60 * 60 * 24)), 0);
  return { total, days, hours, minutes, seconds };
}

function getOrdinal(n: number) {
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatDraftDate(date: Date) {
  const weekday = date.toLocaleString('en-GB', { weekday: 'short' });
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const day = date.getDate();
  const ordinal = getOrdinal(day);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minuteStr = minutes.toString().padStart(2, '0');
  const tz = date.toLocaleString('en-GB', { timeZoneName: 'short' }).split(' ').pop();
  return `${weekday}, ${month} ${day}${ordinal} @ ${hours}:${minuteStr} ${ampm} ${tz}`;
}

const DraftCountdown: React.FC<{ draftStart: Date | null; draftId: string | null }> = ({ draftStart, draftId }) => {
  const [remaining, setRemaining] = useState(draftStart ? getTimeRemaining(draftStart) : { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!draftStart) return;
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(draftStart));
    }, 1000);
    return () => clearInterval(interval);
  }, [draftStart]);

  if (!draftStart) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
          Countdown to draft
        </div>
        <div className="text-lg md:text-xl font-bold text-muted-foreground mb-4">
          Draft start time not set
        </div>
        <a
          href={draftId ? `https://sleeper.com/draft/nfl/${draftId}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition text-lg tracking-wide opacity-50 cursor-not-allowed"
          tabIndex={-1}
          aria-disabled="true"
        >
          DRAFTROOM
        </a>
      </div>
    );
  }

  const isStarted = remaining.total <= 0;
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
        {isStarted ? 'Draft In Progress!' : 'Countdown to draft'}
      </div>
      <div className="text-lg md:text-xl font-bold text-muted-foreground mb-4">
        {formatDraftDate(draftStart)}
      </div>
      {!isStarted && (
        <div className="flex items-center gap-2 md:gap-4 text-center mb-2">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-mono font-bold text-blue-500 drop-shadow-lg">{remaining.days}</span>
            <span className="uppercase text-xs md:text-sm tracking-widest text-muted-foreground">Days</span>
          </div>
          <span className="text-3xl md:text-4xl font-bold text-muted-foreground">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-mono font-bold text-purple-500 drop-shadow-lg">{remaining.hours}</span>
            <span className="uppercase text-xs md:text-sm tracking-widest text-muted-foreground">Hrs</span>
          </div>
          <span className="text-3xl md:text-4xl font-bold text-muted-foreground">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-mono font-bold text-blue-400 drop-shadow-lg">{remaining.minutes}</span>
            <span className="uppercase text-xs md:text-sm tracking-widest text-muted-foreground">Mins</span>
          </div>
          <span className="text-3xl md:text-4xl font-bold text-muted-foreground">:</span>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-mono font-bold text-purple-400 drop-shadow-lg">{remaining.seconds}</span>
            <span className="uppercase text-xs md:text-sm tracking-widest text-muted-foreground">Secs</span>
          </div>
        </div>
      )}
      <a
        href={draftId ? `https://sleeper.com/draft/nfl/${draftId}` : '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition text-lg tracking-wide${draftId ? '' : ' opacity-50 cursor-not-allowed'}`}
        tabIndex={draftId ? 0 : -1}
        aria-disabled={!draftId}
      >
        DRAFTROOM
      </a>
    </div>
  );
};

const MyTeamPreDraft: React.FC<MyTeamPreDraftProps> = ({ draftStart, draftId }) => {
  return (
    <div className="space-y-8 my-8">
      {/* Draft Countdown Clock */}
      <DraftCountdown draftStart={draftStart} draftId={draftId} />

      <h2 className="text-2xl font-bold mb-4">My Team: Pre-Draft Overview</h2>

      {/* 1. Draft Capital Overview */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Draft Capital Overview</h3>
        <div className="text-muted-foreground">[Grid/Table of all rounds and slots, highlight your picks, show extras/missing]</div>
      </section>

      {/* 2. Draft Order Context */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Draft Order Context</h3>
        <div className="text-muted-foreground">[Show your draft slot, pick numbers for each round, and full draft order for Round 1]</div>
      </section>

      {/* 3. Roster Needs/Strengths */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Roster Needs & Strengths</h3>
        <div className="text-muted-foreground">[Summary of roster by position, highlight weak spots, show average age]</div>
      </section>

      {/* 4. Trade Suggestions */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Trade Suggestions</h3>
        <div className="text-muted-foreground">[Suggest trading for more picks if missing, or packaging extras]</div>
      </section>

      {/* 5. Draft Strategy Tips */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Draft Strategy Tips</h3>
        <div className="text-muted-foreground">[Blurb or link to draft strategy guide, best available by position]</div>
      </section>

      {/* 6. League Settings Recap */}
      <section>
        <h3 className="text-xl font-semibold mb-2">League Settings Recap</h3>
        <div className="text-muted-foreground">[Scoring format, roster size, draft type, special rules]</div>
      </section>

      {/* 7. Countdown/Timer (already at top) */}
    </div>
  );
};

export default MyTeamPreDraft; 