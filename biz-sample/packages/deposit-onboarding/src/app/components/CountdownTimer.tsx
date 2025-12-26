import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endDate: Date;
}

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="flex gap-1.5 items-center justify-center">
      <TimeUnit value={timeLeft.days} label="天" />
      <span className="text-white/40 text-sm">:</span>
      <TimeUnit value={timeLeft.hours} label="时" />
      <span className="text-white/40 text-sm">:</span>
      <TimeUnit value={timeLeft.minutes} label="分" />
      <span className="text-white/40 text-sm">:</span>
      <TimeUnit value={timeLeft.seconds} label="秒" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="bg-white/20 backdrop-blur-sm text-white px-2 py-1.5 rounded min-w-[2.5rem]">
        <span className="text-base">{String(value).padStart(2, '0')}</span>
      </div>
      <div className="text-xs text-white/60 mt-1">{label}</div>
    </div>
  );
}