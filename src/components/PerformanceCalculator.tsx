import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { gsap } from 'gsap'; // Import gsap

interface PerformanceCalculatorProps {
  initialFee: number;
  initialValuations: number;
  initialInstructions: number;
  initialSales: number;
  initialAbortRate: number;
  currentAvgFee: number;
  currentValuationConversionRate: number;
  currentExchangeRate: number;
}

export function PerformanceCalculator({
  initialFee,
  initialValuations,
  initialInstructions,
  initialSales,
  initialAbortRate,
  currentAvgFee,
  currentValuationConversionRate,
  currentExchangeRate,
}: PerformanceCalculatorProps) {
  const [fee, setFee] = useState(initialFee);
  const [valuations, setValuations] = useState(initialValuations);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [sales, setSales] = useState(initialSales);
  const [abortRate, setAbortRate] = useState(initialAbortRate);

  const [calculatedIncome, setCalculatedIncome] = useState(0);

  // Calculate derived values
  const calculatedInstructions = Math.round(valuations * (currentValuationConversionRate / 100));
  const calculatedSales = Math.round(calculatedInstructions * (currentExchangeRate / 100));
  const calculatedAbortRate = initialAbortRate; // For now, keep static or derive from sales/instructions
  
  useEffect(() => {
    // This is a simplified calculation. In a real app, this would be more complex.
    const income = calculatedSales * fee;
    setCalculatedIncome(income);
  }, [fee, valuations, instructions, sales, abortRate, currentExchangeRate, currentValuationConversionRate, calculatedSales]);

  return (
    <Card className="bg-card text-card-foreground p-6 max-w-xl mx-auto"> {/* Added max-w-xl and mx-auto */}
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-foreground text-xl">Performance Calculator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Insert data then slide across to calculate the potential performance
        </p>
      </CardHeader>
      <CardContent className="p-0 space-y-8">
        {/* Current Performance Data */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Current average fee on sales</span>
            <span className="font-semibold text-foreground">£{currentAvgFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Current valuation conversion rate</span>
            <span className="font-semibold text-foreground">{currentValuationConversionRate}%</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Current exchange rate</span>
            <span className="font-semibold text-foreground">{currentExchangeRate}%</span>
          </div>
        </div>

        {/* Fee Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="fee-input" className="text-foreground min-w-[80px]">Fee £</Label>
            <Input
              id="fee-input"
              type="number"
              value={fee}
              onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
              className="w-24 text-center bg-background text-foreground"
            />
            <Slider
              min={0}
              max={10000}
              step={100}
              value={[fee]}
              onValueChange={(val) => setFee(val[0])}
              className="flex-1 ml-4"
            />
          </div>
        </div>

        {/* Valuations Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="valuations-input" className="text-foreground min-w-[80px]">Valuations</Label>
            <Input
              id="valuations-input"
              type="number"
              value={valuations}
              onChange={(e) => setValuations(parseInt(e.target.value) || 0)}
              className="w-24 text-center bg-background text-foreground"
            />
            <Slider
              min={0}
              max={200}
              step={1}
              value={[valuations]}
              onValueChange={(val) => setValuations(val[0])}
              className="flex-1 ml-4 [&>span:first-child]:bg-red-500" // Red track
            />
          </div>
        </div>

        {/* Instructions Slider (derived) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="instructions-input" className="text-foreground min-w-[80px]">Instructions</Label>
            <Input
              id="instructions-input"
              type="number"
              value={calculatedInstructions}
              readOnly
              className="w-24 text-center bg-muted text-muted-foreground"
            />
            <Slider
              min={0}
              max={200}
              step={1}
              value={[calculatedInstructions]}
              className="flex-1 ml-4"
              disabled // Derived, so not directly adjustable
            />
          </div>
        </div>

        {/* Sales Slider (derived) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sales-input" className="text-foreground min-w-[80px]">Sales</Label>
            <Input
              id="sales-input"
              type="number"
              value={calculatedSales}
              readOnly
              className="w-24 text-center bg-muted text-muted-foreground"
            />
            <Slider
              min={0}
              max={200}
              step={1}
              value={[calculatedSales]}
              className="flex-1 ml-4 [&>span:first-child]:bg-red-500" // Red track
              disabled // Derived, so not directly adjustable
            />
          </div>
        </div>

        {/* Abort Rate Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="abort-rate-input" className="text-foreground min-w-[80px]">Abort rate</Label>
            <Input
              id="abort-rate-input"
              type="number"
              value={abortRate}
              onChange={(e) => setAbortRate(parseFloat(e.target.value) || 0)}
              className="w-24 text-center bg-background text-foreground"
            />
            <Slider
              min={0}
              max={100}
              step={1}
              value={[abortRate]}
              onValueChange={(val) => setAbortRate(val[0])}
              className="flex-1 ml-4"
            />
          </div>
        </div>

        {/* Income Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="income-display" className="text-foreground min-w-[80px]">Income</Label>
            <Input
              id="income-display"
              type="text"
              value={`£${calculatedIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              readOnly
              className="w-24 text-center bg-muted text-muted-foreground"
            />
            <Slider
              min={0}
              max={200000}
              step={1000}
              value={[calculatedIncome]}
              className="flex-1 ml-4 [&>span:first-child]:bg-red-500" // Red track
              disabled // Derived, so not directly adjustable
            />
          </div>
        </div>

        <div className="bg-red-500 text-white p-4 rounded-md text-sm text-center">
          Based on your conversion rates and fee levels above, you can achieve the results shown by booking a minimum of valuations shown:
        </div>
      </CardContent>
    </Card>
  );
}
