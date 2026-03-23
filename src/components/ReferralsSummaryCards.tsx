import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SendIcon, InboxIcon, CheckCircle2Icon, PoundSterlingIcon, Building2Icon, UserCheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralsSummaryCardsProps {
  referrals: any[];
}

export function ReferralsSummaryCards({ referrals }: ReferralsSummaryCardsProps) {
  const totalReferrals = referrals.length;
  const receivedReferrals = referrals.filter(r => r.direction === 'received').length;
  const sentReferrals = referrals.filter(r => r.direction === 'sent').length;
  const acceptedReferrals = referrals.filter(r => r.status === 'accepted' || r.status === 'completed').length;
  const internalReferrals = referrals.filter(r => r.referralType === 'internal').length;
  const externalReferrals = referrals.filter(r => r.referralType === 'external').length;
  
  const totalCommission = referrals
    .filter(r => r.commission)
    .reduce((sum, r) => sum + (r.commission || 0), 0);

  const cards = [
    {
      title: 'Total Referrals',
      value: totalReferrals,
      icon: UserCheckIcon,
      iconColor: 'text-primary',
      progressColor: 'bg-primary',
    },
    {
      title: 'Received',
      value: receivedReferrals,
      icon: InboxIcon,
      iconColor: 'text-green-600',
      progressColor: 'bg-green-600',
    },
    {
      title: 'Sent',
      value: sentReferrals,
      icon: SendIcon,
      iconColor: 'text-blue-600',
      progressColor: 'bg-blue-600',
    },
    {
      title: 'Accepted',
      value: acceptedReferrals,
      icon: CheckCircle2Icon,
      iconColor: 'text-success',
      progressColor: 'bg-success',
    },
    {
      title: 'Internal',
      value: internalReferrals,
      icon: Building2Icon,
      iconColor: 'text-purple-600',
      progressColor: 'bg-purple-600',
    },
    {
      title: 'Total Commission',
      value: `£${totalCommission.toLocaleString()}`,
      icon: PoundSterlingIcon,
      iconColor: 'text-success',
      progressColor: 'bg-success',
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 xl:grid xl:grid-cols-6 xl:gap-4 xl:overflow-visible xl:snap-none xl:pb-0">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={cn(
              "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer border-2",
              "snap-center shrink-0 w-[280px] xl:w-auto xl:shrink xl:snap-none",
              card.progressColor.replace('bg-', 'border-')
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-foreground">{card.title}</CardTitle>
              <Icon className={cn("h-4 w-4", card.iconColor)} strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold text-foreground mb-2">{card.value}</div>
              <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", card.progressColor)} 
                  style={{ width: '70%' }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-black/50 dark:bg-white/50 z-10" 
                  style={{ left: '80%' }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
