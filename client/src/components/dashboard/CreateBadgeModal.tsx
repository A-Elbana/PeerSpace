import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Select from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

export type CreateBadgeData = {
  name: string;
  description?: string;
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onSubmit: (data: CreateBadgeData) => Promise<void> | void;
}

const rarityOptions = [
  { value: 'COMMON', label: 'Common' },
  { value: 'RARE', label: 'Rare' },
  { value: 'EPIC', label: 'Epic' },
  { value: 'LEGENDARY', label: 'Legendary' },
];

const CreateBadgeModal: React.FC<Props> = ({ isOpen, onClose, isLoading = false, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | ''>('');

  const reset = () => {
    setName('');
    setDescription('');
    setRarity('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), description: description.trim() || undefined, rarity: (rarity || undefined) as any });
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle>Create New Badge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Badge Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Problem Solver" className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Rarity</label>
              <Select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as any)}
                placeholder="Select rarity (optional)"
                className="mt-1"
                options={rarityOptions}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>{isLoading ? 'Creating…' : 'Create Badge'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateBadgeModal;
