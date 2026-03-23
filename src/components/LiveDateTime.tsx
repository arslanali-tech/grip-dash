import { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import { format } from 'date-fns';

export function LiveDateTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium">
        {format(currentTime, 'dd MMM yyyy')}
      </span>
      <span className="text-border">|</span>
      <span className="font-mono font-medium">
        {format(currentTime, 'HH:mm:ss')}
      </span>
    </div>
  );
}
