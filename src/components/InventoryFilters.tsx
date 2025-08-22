import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

interface InventoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  stockLevel: string;
  onStockLevelChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  locations: string[];
}

export const InventoryFilters = ({
  search,
  onSearchChange,
  location,
  onLocationChange,
  stockLevel,
  onStockLevelChange,
  sortBy,
  onSortByChange,
  locations,
}: InventoryFiltersProps) => {
  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Filters & Search</span>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={location} onValueChange={onLocationChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={stockLevel} onValueChange={onStockLevelChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Stock Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Levels</SelectItem>
            <SelectItem value="out">
              <div className="flex items-center gap-2">
                <Badge className="bg-stock-out text-white">Out of Stock</Badge>
              </div>
            </SelectItem>
            <SelectItem value="low">
              <div className="flex items-center gap-2">
                <Badge className="bg-stock-low text-white">Low Stock</Badge>
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center gap-2">
                <Badge className="bg-stock-medium text-white">Medium Stock</Badge>
              </div>
            </SelectItem>
            <SelectItem value="good">
              <div className="flex items-center gap-2">
                <Badge className="bg-stock-good text-white">Good Stock</Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="item">Item Name</SelectItem>
            <SelectItem value="quantity">Quantity</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="updated_at">Last Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};