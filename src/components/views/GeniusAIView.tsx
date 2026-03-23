import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  SparklesIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  DollarSignIcon, 
  ArrowRightIcon, 
  BrainCircuitIcon,
  MessageSquareIcon,
  PlusIcon,
  Settings,
  TrendingDownIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { cn } from '@/lib/utils';

interface Scenario {
  id: string;
  name: string;
  description: string;
  impact: number;
  type: 'revenue' | 'profit' | 'efficiency';
}

const suggestedScenarios: Scenario[] = [
  { id: 'hire-negotiator', name: 'Hire Senior Negotiator', description: 'Add 1 senior staff member (£45k cost)', impact: 120000, type: 'revenue' },
  { id: 'increase-fee', name: 'Increase Fee by 0.25%', description: 'Raise average fee from 1.5% to 1.75%', impact: 85000, type: 'profit' },
  { id: 'boost-marketing', name: 'Boost Marketing Spend', description: 'Increase monthly ad spend by £2k', impact: 60000, type: 'revenue' },
];

export function GeniusAIView() {
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  
  // Simulation State
  const [staffCount, setStaffCount] = useState(6);
  const [avgFee, setAvgFee] = useState(1.5);
  const [marketingSpend, setMarketingSpend] = useState(5000);
  const [valuationConversion, setValuationConversion] = useState(45);

  // Derived Calculations (Simplified for demo)
  const currentRevenue = 1200000;
  const currentProfit = 350000;

  const projectedRevenue = Math.round(
    currentRevenue * 
    (1 + (staffCount - 6) * 0.15) * // 15% revenue increase per new staff
    (avgFee / 1.5) * // Proportional to fee increase
    (1 + (marketingSpend - 5000) / 10000) * // Marketing impact
    (valuationConversion / 45) // Conversion impact
  );

  const projectedCosts = 850000 + ((staffCount - 6) * 40000) + ((marketingSpend - 5000) * 12);
  const projectedProfit = projectedRevenue - projectedCosts;

  const chartData = [
    { name: 'Current', Revenue: currentRevenue, Profit: currentProfit },
    { name: 'Projected', Revenue: projectedRevenue, Profit: projectedProfit },
  ];

  const handleAskAI = () => {
    if (!prompt) return;
    setIsThinking(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsThinking(false);
      setPrompt('');
      // In a real app, this would parse the prompt and adjust sliders/state
      if (prompt.toLowerCase().includes('hire')) setStaffCount(prev => prev + 1);
      if (prompt.toLowerCase().includes('fee')) setAvgFee(prev => prev + 0.25);
    }, 1500);
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* AI Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full mb-2">
          <BrainCircuitIcon className="h-8 w-8 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Genius AI Simulator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Ask questions or adjust variables to see how strategic changes impact your bottom line.
        </p>
      </div>

      {/* AI Input Area */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100 shadow-md">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <MessageSquareIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Ask Genius: 'What happens if I hire another negotiator?' or 'Show impact of 2% fee'" 
                className="pl-12 h-14 text-lg bg-white border-purple-200 focus-visible:ring-purple-500 shadow-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              />
            </div>
            <Button 
              size="lg" 
              className="h-14 px-8 bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all hover:scale-105"
              onClick={handleAskAI}
              disabled={isThinking}
            >
              {isThinking ? (
                <span className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 animate-spin" /> Thinking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5" /> Ask Genius
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls Panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Scenario Variables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Staff Count</Label>
                <span className="text-sm font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{staffCount}</span>
              </div>
              <Slider 
                value={[staffCount]} 
                min={1} 
                max={20} 
                step={1} 
                onValueChange={(val) => setStaffCount(val[0])}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">Impact: +£120k Revenue / -£40k Cost per hire</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Average Fee (%)</Label>
                <span className="text-sm font-bold bg-green-100 text-green-700 px-2 py-1 rounded">{avgFee}%</span>
              </div>
              <Slider 
                value={[avgFee]} 
                min={0.5} 
                max={5.0} 
                step={0.1} 
                onValueChange={(val) => setAvgFee(val[0])}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">Impact: Direct multiplier on Sales Revenue</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Marketing Spend (£/mo)</Label>
                <span className="text-sm font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">£{marketingSpend}</span>
              </div>
              <Slider 
                value={[marketingSpend]} 
                min={1000} 
                max={20000} 
                step={500} 
                onValueChange={(val) => setMarketingSpend(val[0])}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">Impact: Increases lead volume & valuations</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Valuation Conversion (%)</Label>
                <span className="text-sm font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded">{valuationConversion}%</span>
              </div>
              <Slider 
                value={[valuationConversion]} 
                min={10} 
                max={90} 
                step={1} 
                onValueChange={(val) => setValuationConversion(val[0])}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">Impact: Higher % of valuations become instructions</p>
            </div>
          </CardContent>
        </Card>

        {/* Visualization Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Projected Revenue</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">£{projectedRevenue.toLocaleString()}</span>
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    projectedRevenue >= currentRevenue ? "text-green-600" : "text-red-600"
                  )}>
                    {projectedRevenue >= currentRevenue ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                    {Math.abs(((projectedRevenue - currentRevenue) / currentRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs Current: £{currentRevenue.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Projected Profit</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">£{projectedProfit.toLocaleString()}</span>
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    projectedProfit >= currentProfit ? "text-green-600" : "text-red-600"
                  )}>
                    {projectedProfit >= currentProfit ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                    {Math.abs(((projectedProfit - currentProfit) / currentProfit) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs Current: £{currentProfit.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `£${value / 1000}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`£${value.toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={60} />
                    <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedScenarios.map((scenario) => (
              <Card 
                key={scenario.id} 
                className="cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-all group"
                onClick={() => {
                  // Apply scenario logic here
                  if (scenario.type === 'revenue') setStaffCount(prev => prev + 1);
                  if (scenario.type === 'profit') setAvgFee(prev => prev + 0.25);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <SparklesIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      +£{scenario.impact.toLocaleString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{scenario.name}</h4>
                  <p className="text-xs text-muted-foreground">{scenario.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
