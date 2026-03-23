import * as React from "react"
import { format, addDays, startOfWeek, addWeeks } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

interface SingleDatePickerProps {
  date?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
}

export function SingleDatePicker({ date, onSelect, placeholder = "Pick a date" }: SingleDatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setSelectedDate(date)
  }, [date])

  const handlePreset = (preset: string) => {
    const today = new Date()
    let newDate: Date | undefined

    switch (preset) {
      case 'today':
        newDate = today
        break
      case 'tomorrow':
        newDate = addDays(today, 1)
        break
      case 'nextWeek':
        newDate = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
        break
      case 'inTwoWeeks':
        newDate = addDays(today, 14)
        break
    }
    
    setSelectedDate(newDate)
    onSelect(newDate)
    setIsOpen(false)
  }

  const handleApply = () => {
    onSelect(selectedDate)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedDate(undefined)
    onSelect(undefined)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-background text-foreground border-border",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-popover text-popover-foreground" align="start">
        <DropdownMenuItem onClick={() => handlePreset('today')}>
          Today
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('tomorrow')}>
          Tomorrow
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('nextWeek')}>
          Next Week (Monday)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreset('inTwoWeeks')}>
          In 2 Weeks
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <span>Custom date</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-0 bg-popover text-popover-foreground">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                />
            </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between p-2">
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                Clear
            </Button>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 px-2 text-xs text-primary hover:text-primary/80">
                    Cancel
                </Button>
                <Button size="sm" onClick={handleApply} className="h-8 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                    Apply
                </Button>
            </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
