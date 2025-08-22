import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Package } from "lucide-react";
import type { InventoryItem } from "@/hooks/useInventory";

interface InventoryCardProps {
  item: InventoryItem;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: number) => void;
  canEdit: boolean;
}

const getStockLevel = (quantity?: string) => {
  if (!quantity || quantity === "0") return "out";
  const num = parseInt(quantity);
  if (isNaN(num)) return "out";
  if (num <= 5) return "low";
  if (num <= 15) return "medium";
  return "good";
};

const getStockColor = (level: string) => {
  switch (level) {
    case "out": return "stock-out";
    case "low": return "stock-low";
    case "medium": return "stock-medium";
    case "good": return "stock-good";
    default: return "stock-out";
  }
};

const getStockLabel = (level: string) => {
  switch (level) {
    case "out": return "Out of Stock";
    case "low": return "Low Stock";
    case "medium": return "Medium Stock";
    case "good": return "Good Stock";
    default: return "Unknown";
  }
};

export const InventoryCard = ({ item, onEdit, onDelete, canEdit }: InventoryCardProps) => {
  const stockLevel = getStockLevel(item.quantity);
  const stockColor = getStockColor(stockLevel);
  const stockLabel = getStockLabel(stockLevel);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            {item.item}
          </CardTitle>
          <Badge 
            className="text-xs font-medium"
            style={{ 
              backgroundColor: `hsl(var(--${stockColor}))`,
              color: stockLevel === 'good' ? 'white' : 'white'
            }}
          >
            {stockLabel}
          </Badge>
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Location:</span>
          <span>{item.location}</span>
        </div>
        
        {item.shelf && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Shelf:</span>
            <span>{item.shelf}</span>
          </div>
        )}
        
        {item.tub && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Tub:</span>
            <span>{item.tub}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Quantity:</span>
          <span className="font-bold">{item.quantity || 0}</span>
        </div>
        
        {canEdit && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(item)}
              className="flex items-center gap-1"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete?.(item.id)}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};