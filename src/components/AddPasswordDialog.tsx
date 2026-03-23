import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LockIcon, EyeIcon, EyeOffIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { fetchPasswordCategories, initHubCategoriesForAgency, createHubCategory, generateSlug, HubCategoryRow } from '@/lib/hubConfigApi';

interface AddPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; username: string; password: string; category: string }) => void;
}

export function AddPasswordDialog({ open, onOpenChange, onSave }: AddPasswordDialogProps) {
  const { agencyId } = useDashboardStore();
  
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('General');
  const [showPassword, setShowPassword] = useState(false);
  
  // Dynamic categories from database
  const [categories, setCategories] = useState<HubCategoryRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      if (!agencyId || !open) return;
      
      setLoadingCategories(true);
      try {
        // Initialize default categories if needed
        await initHubCategoriesForAgency(agencyId);
        
        const cats = await fetchPasswordCategories(agencyId);
        setCategories(cats);
        
        // Set default category if available
        if (cats.length > 0 && !cats.find(c => c.name === category)) {
          setCategory(cats[0].name);
        }
      } catch (error) {
        console.error('Error loading categories', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    void loadCategories();
  }, [agencyId, open]);

  const handleAddCategory = async () => {
    if (!agencyId || !newCategoryName.trim()) return;
    
    const result = await createHubCategory({
      agencyId,
      name: newCategoryName.trim(),
      slug: generateSlug(newCategoryName.trim()),
      type: 'password',
    });
    
    if (result) {
      setCategories(prev => [...prev, result]);
      setCategory(result.name);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleSave = () => {
    if (!title || !password) {
      alert('Please fill in at least the Title and Password/Code.');
      return;
    }
    onSave({ title, username, password, category });
    // Reset
    setTitle('');
    setUsername('');
    setPassword('');
    setCategory('General');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <LockIcon className="h-5 w-5 text-primary" />
            Add Secure Item
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title / Service Name</Label>
            <Input
              id="title"
              placeholder="e.g. Instagram, Office Alarm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            {loadingCategories ? (
              <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : showAddCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="bg-background"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') setShowAddCategory(false);
                  }}
                />
                <Button size="sm" onClick={handleAddCategory}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddCategory(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setShowAddCategory(true)} title="Add new category">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username / ID (Optional)</Label>
            <Input
              id="username"
              placeholder="e.g. admin@company.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password / Code</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password or code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
