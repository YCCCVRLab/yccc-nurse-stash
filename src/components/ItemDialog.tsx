import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryItem } from "@/hooks/useInventory";

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSave: (item: Omit<InventoryItem, "id" | "created_at" | "updated_at"> | (Partial<InventoryItem> & { id: number })) => void;
  mode: "add" | "edit";
}

export const ItemDialog = ({ open, onOpenChange, item, onSave, mode }: ItemDialogProps) => {
  const [formData, setFormData] = useState({
    item: "",
    description: "",
    location: "",
    shelf: "",
    tub: "",
    quantity: "",
    user_id: "",
  });

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        item: item.item || "",
        description: item.description || "",
        location: item.location || "",
        shelf: item.shelf || "",
        tub: item.tub || "",
        quantity: item.quantity || "",
        user_id: item.user_id || "",
      });
    } else {
      setFormData({
        item: "",
        description: "",
        location: "",
        shelf: "",
        tub: "",
        quantity: "",
        user_id: "",
      });
    }
  }, [mode, item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "edit" && item) {
      onSave({ id: item.id, ...formData });
    } else {
      onSave(formData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Item" : "Edit Item"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item">Item Name *</Label>
            <Input
              id="item"
              required
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              placeholder="e.g., ABD Pads"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., 8 X 10"
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Storage Shelf # 1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shelf">Shelf</Label>
              <Input
                id="shelf"
                value={formData.shelf}
                onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                placeholder="e.g., Shelf # 2"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tub">Tub</Label>
              <Input
                id="tub"
                value={formData.tub}
                onChange={(e) => setFormData({ ...formData, tub: e.target.value })}
                placeholder="e.g., 7"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="e.g., 24"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "add" ? "Add Item" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};