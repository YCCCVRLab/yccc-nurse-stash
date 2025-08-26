import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LogIn, LogOut, User, Undo, Redo, History, AlertTriangle } from "lucide-react";
import { useInventoryWithHistory } from "@/hooks/useInventoryWithHistory";
import { useAuth } from "@/hooks/useAuth";
import { InventoryCard } from "@/components/InventoryCard";
import { InventoryFilters } from "@/components/InventoryFilters";
import { ItemDialog } from "@/components/ItemDialog";
import { AuthDialog } from "@/components/AuthDialog";
import { DebugPanel } from "@/components/DebugPanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const IndexEnhanced = () => {
  const { 
    items, 
    isLoading, 
    error,
    addItem, 
    updateItem, 
    deleteItem,
    undoLastAction,
    redoLastAction,
    canUndo,
    canRedo,
    history
  } = useInventoryWithHistory();
  const { user, signOut, isAuthenticated } = useAuth();
  
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [stockLevel, setStockLevel] = useState("all");
  const [sortBy, setSortBy] = useState("item");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const locations = useMemo(() => {
    return Array.from(new Set(items.map(item => item.location))).sort();
  }, [items]);

  const getStockLevel = (quantity?: string) => {
    if (!quantity || quantity === "0") return "out";
    const num = parseInt(quantity);
    if (isNaN(num)) return "out";
    if (num <= 5) return "low";
    if (num <= 15) return "medium";
    return "good";
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = item.item.toLowerCase().includes(search.toLowerCase()) ||
                           item.description?.toLowerCase().includes(search.toLowerCase()) ||
                           item.location.toLowerCase().includes(search.toLowerCase());
      
      const matchesLocation = location === "all" || item.location === location;
      
      const itemStockLevel = getStockLevel(item.quantity);
      const matchesStockLevel = stockLevel === "all" || itemStockLevel === stockLevel;
      
      return matchesSearch && matchesLocation && matchesStockLevel;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "quantity":
          return (parseInt(b.quantity || "0") || 0) - (parseInt(a.quantity || "0") || 0);
        case "location":
          return a.location.localeCompare(b.location);
        case "updated_at":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return a.item.localeCompare(b.item);
      }
    });
  }, [items, search, location, stockLevel, sortBy]);

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemDialogOpen(true);
  };

  const handleDeleteItem = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem.mutate(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSaveItem = (itemData: any) => {
    if (editingItem) {
      updateItem.mutate(itemData);
    } else {
      addItem.mutate({ ...itemData, user_id: user?.id || "" });
    }
    setEditingItem(null);
  };

  const handleAddNew = () => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }
    setEditingItem(null);
    setItemDialogOpen(true);
  };

  const formatHistoryTime = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">YCCC Nursing Inventory (Enhanced)</h1>
              <p className="text-sm text-muted-foreground">York County Community College</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Debug Panel */}
              <DebugPanel />

              {/* Undo/Redo Controls */}
              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undoLastAction}
                    disabled={!canUndo}
                    className="flex items-center gap-1"
                  >
                    <Undo className="h-3 w-3" />
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redoLastAction}
                    disabled={!canRedo}
                    className="flex items-center gap-1"
                  >
                    <Redo className="h-3 w-3" />
                    Redo
                  </Button>
                  <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        History ({history.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Action History</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {history.length === 0 ? (
                          <p className="text-muted-foreground">No actions recorded yet.</p>
                        ) : (
                          history.map((action, index) => (
                            <div key={action.id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <Badge variant={
                                  action.type === 'add' ? 'default' : 
                                  action.type === 'update' ? 'secondary' : 'destructive'
                                }>
                                  {action.type.toUpperCase()}
                                </Badge>
                                <span className="ml-2">{action.description}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {formatHistoryTime(action.timestamp)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {isAuthenticated && (
                <Button onClick={handleAddNew} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                  <Button variant="outline" onClick={() => signOut.mutate()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setAuthDialogOpen(true)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Database Error: {error.message}. Please try refreshing the page or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <InventoryFilters
          search={search}
          onSearchChange={setSearch}
          location={location}
          onLocationChange={setLocation}
          stockLevel={stockLevel}
          onStockLevelChange={setStockLevel}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          locations={locations}
        />

        {/* Inventory Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Inventory Items ({filteredAndSortedItems.length})
              </h2>
              {!isAuthenticated && (
                <p className="text-sm text-muted-foreground">
                  Viewing in guest mode. <button onClick={() => setAuthDialogOpen(true)} className="text-primary underline">Sign in</button> to edit inventory.
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  canEdit={isAuthenticated}
                />
              ))}
            </div>
            
            {filteredAndSortedItems.length === 0 && !error && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No items found matching your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        onSave={handleSaveItem}
        mode={editingItem ? "edit" : "add"}
      />

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action can be undone using the Undo button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IndexEnhanced;