import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  SparklesIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  TargetIcon, 
  BrainCircuitIcon,
  MessageSquareIcon,
  Settings
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
import { PerformanceCalculator } from '@/components/PerformanceCalculator';

interface Scenario {
  id: string;
  name: string;
  description: string;
  impact: number;
  type: 'revenue' | 'conversion';
}

const suggestedScenarios: Scenario[] = [
  { id: 'boost-valuations', name: 'Boost Valuations', description: 'Increase monthly valuations by 5', impact: 25000, type: 'revenue' },
  { id: 'improve-conversion', name: 'Improve Conversion', description: 'Increase instruction conversion by 5%', impact: 40000, type: 'conversion' },
  { id: 'reduce-aborts', name: 'Reduce Aborts', description: 'Lower abort rate by 2%', impact: 15000, type: 'revenue' },
];

export function GeniusPerformanceView() {
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Simulation State (Defaults based on PerformanceCalculator)
  const [valuations, setValuations] = useState(39);
  const [instructionRate, setInstructionRate] = useState(57.3); // %
  const [exchangeRate, setExchangeRate] = useState(83.2); // %
  const [avgFee, setAvgFee] = useState(4344);
  const [abortRate, setAbortRate] = useState(18); // %

  // Derived Calculations
  const instructions = Math.round(valuations * (instructionRate / 100));
  const sales = Math.round(instructions * (exchangeRate / 100));
  const successfulSales = Math.round(sales * (1 - abortRate / 100));
  
  const currentIncome = 18 * 4287; // Baseline from original calculator (approx)
  const projectedIncome = successfulSales * avgFee;

  const chartData = [
    { name: 'Current', Income: currentIncome, Sales: 18 },
    { name: 'Projected', Income: projectedIncome, Sales: successfulSales },
  ];

  const handleAskAI = () => {
    if (!prompt) return;
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      setPrompt('');
      if (prompt.toLowerCase().includes('valuation')) setValuations(prev => prev + 5);
      if (prompt.toLowerCase().includes('fee')) setAvgFee(prev => prev + 100);
    }, 1500);
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* AI Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-2">
          <TargetIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Performance Simulator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Simulate operational changes to see their impact on your pipeline and revenue.
        </p>
      </div>

      {/* AI Input Area */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100 shadow-md">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <MessageSquareIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Ask Genius: 'What if we do 5 more valuations?' or 'Impact of 60% conversion rate'" 
                className="pl-12 h-14 text-lg bg-white border-blue-200 focus-visible:ring-blue-500 shadow-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              />
            </div>
            <Button 
              size="lg" 
              className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:scale-105"
              onClick={handleAskAI}
              disabled={isThinking}
            >
              {isThinking ? (
                <span className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 animate-spin" /> Thinking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5" /> Simulate
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
              Performance Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Monthly Valuations</Label>
                <span className="text-sm font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{valuations}</span>
              </div>
              <Slider 
                value={[valuations]} 
                min={10} 
                max={100} 
                step={1} 
                onValueChange={(val) => setValuations(val[0])}
                className="py-2"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Instruction Rate (%)</Label>
                <span className="text-sm font-bold bg-green-100 text-green-700 px-2 py-1 rounded">{instructionRate}%</span>
              </div>
              <Slider 
                value={[instructionRate]} 
                min={20} 
                max={90} 
                step={0.1} 
                onValueChange={(val) => setInstructionRate(val[0])}
                className="py-2"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Exchange Rate (%)</Label>
                <span className="text-sm font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded">{exchangeRate}%</span>
              </div>
              <Slider 
                value={[exchangeRate]} 
                min={50} 
                max={100} 
                step={0.1} 
                onValueChange={(val) => setExchangeRate(val[0])}
                className="py-2"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Average Fee (£)</Label>
                <span className="text-sm font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">£{avgFee}</span>
              </div>
              <Slider 
                value={[avgFee]} 
                min={1000} 
                max={10000} 
                step={50} 
                onValueChange={(val) => setAvgFee(val[0])}
                className="py-2"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Abort Rate (%)</Label>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-2 py-1 rounded">{abortRate}%</span>
              </div>
              <Slider 
                value={[abortRate]} 
                min={0} 
                max={50} 
                step={1} 
                onValueChange={(val) => setAbortRate(val[0])}
                className="py-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visualization Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Projected Income</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">£{projectedIncome.toLocaleString()}</span>
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    projectedIncome >= currentIncome ? "text-green-600" : "text-red-600"
                  )}>
                    {projectedIncome >= currentIncome ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                    {Math.abs(((projectedIncome - currentIncome) / currentIncome) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs Current: £{currentIncome.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Projected Sales</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">{successfulSales}</span>
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    successfulSales >= 18 ? "text-green-600" : "text-red-600"
                  )}>
                    {successfulSales >= 18 ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                    {Math.abs(((successfulSales - 18) / 18) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs Current: 18</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#4f46e5" tickFormatter={(value) => `£${value / 1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [name === 'Income' ? `£${value.toLocaleString()}` : value, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Income" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={60} />
                    <Bar yAxisId="right" dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} barSize={60} />
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
                className="cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                onClick={() => {
                  if (scenario.type === 'revenue') setValuations(prev => prev + 5);
                  if (scenario.type === 'conversion') setInstructionRate(prev => Math.min(prev + 5, 100));
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <SparklesIcon className="h-4 w-4 text-blue-600" />
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

      {/* Legacy Performance Calculator */}
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Classic Calculator</h2>
        <PerformanceCalculator
          initialFee={4287}
          initialValuations={39}
          initialInstructions={22}
          initialSales={18}
          initialAbortRate={18}
          currentAvgFee={4344}
          currentValuationConversionRate={57.3}
          currentExchangeRate={83.2}
        />
      </div>
    </div>
  );
}
