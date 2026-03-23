import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2Icon, TrendingUpIcon, PoundSterlingIcon, CheckCircle2Icon, HomeIcon, ScaleIcon, ShieldCheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { B2BCompany } from './views/B2BReferralsView';

interface B2BReferralsSummaryCardsProps {
  companies: B2BCompany[];
}

export function B2BReferralsSummaryCards({ companies }: B2BReferralsSummaryCardsProps) {
  const totalCompanies = companies.filter(c => c.status === 'active').length;
  const totalReferrals = companies.reduce((sum, c) => sum + c.totalReferrals, 0);
  const totalCommission = companies.reduce((sum, c) => sum + c.totalCommission, 0);
  const mortgageReferrals = companies.filter(c => c.type === 'mortgage').reduce((sum, c) => sum + c.totalReferrals, 0);
  const legalReferrals = companies.filter(c => c.type === 'legal' || c.type === 'conveyancing').reduce((sum, c) => sum + c.totalReferrals, 0);
  const amlReferrals = companies.filter(c => c.type === 'aml').reduce((sum, c) => sum + c.totalReferrals, 0);

  const cards = [
    {
      title: 'Active Partners',
      value: totalCompanies,
      icon: Building2Icon,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Referrals',
      value: totalReferrals,
      icon: TrendingUpIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Commission',
      value: `£${totalCommission.toLocaleString()}`,
      icon: PoundSterlingIcon,
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Mortgage Referrals',
      value: mortgageReferrals,
      icon: HomeIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Legal/Conveyancing',
      value: legalReferrals,
      icon: ScaleIcon,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'AML Checks',
      value: amlReferrals,
      icon: ShieldCheckIcon,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className="bg-card text-card-foreground hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-foreground">{card.title}</CardTitle>
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <Icon className={cn("h-4 w-4", card.iconColor)} strokeWidth={1.5} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
