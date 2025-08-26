import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LogIn, LogOut, User, Undo, Redo, History, AlertTriangle, Bug, Copy, CheckCircle, XCircle } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { InventoryCard } from "@/components/InventoryCard";
import { InventoryFilters } from "@/components/InventoryFilters";
import { ItemDialog } from "@/components/ItemDialog";
import { AuthDialog } from "@/components/AuthDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { items, isLoading, addItem, updateItem, deleteItem } = useInventory();
  const { user, signOut, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [stockLevel, setStockLevel] = useState("all");
  const [sortBy, setSortBy] = useState("item");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

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

  const runDiagnostics = async () => {
    try {
      console.log("🔍 Running diagnostics...");
      
      // Get current user info
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log("👤 Current user:", currentUser);
      
      // Get session info
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("🔑 Session:", session);
      
      // Test database connection
      let dbConnectionTest = null;
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("count", { count: 'exact', head: true });
        dbConnectionTest = { success: !error, error: error?.message, count: data };
        console.log("💾 Database test:", dbConnectionTest);
      } catch (err: any) {
        dbConnectionTest = { success: false, error: err.message };
        console.error("💾 Database error:", err);
      }

      // Test permissions
      let permissionTest = null;
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .limit(1);
        permissionTest = { 
          canRead: !error, 
          readError: error?.message,
          itemCount: data?.length || 0
        };
        console.log("🔐 Permission test:", permissionTest);
      } catch (err: any) {
        permissionTest = { canRead: false, readError: err.message };
        console.error("🔐 Permission error:", err);
      }

      // Test update permission with a real item
      let updateTest = null;
      if (items.length > 0) {
        try {
          const testItem = items[0];
          const { data, error } = await supabase
            .from("inventory_items")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", testItem.id)
            .select();
          updateTest = { canUpdate: !error, error: error?.message };
          console.log("✏️ Update test:", updateTest);
        } catch (err: any) {
          updateTest = { canUpdate: false, error: err.message };
          console.error("✏️ Update error:", err);
        }
      }

      const diagnostics = {
        timestamp: new Date().toISOString(),
        authentication: {
          isAuthenticated,
          user: currentUser,
          userError: userError?.message,
          session: session ? {
            access_token: session.access_token ? "Present" : "Missing",
            refresh_token: session.refresh_token ? "Present" : "Missing",
            expires_at: session.expires_at,
            user: {
              id: session.user?.id,
              email: session.user?.email,
              email_confirmed_at: session.user?.email_confirmed_at,
              created_at: session.user?.created_at,
            }
          } : null,
          sessionError: sessionError?.message,
        },
        database: dbConnectionTest,
        permissions: {
          read: permissionTest,
          update: updateTest,
        },
        environment: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "Not set",
        }
      };

      setDebugInfo(diagnostics);
      console.log("🎯 Full diagnostics:", diagnostics);
    } catch (error: any) {
      console.error("🚨 Debug error:", error);
      toast({
        title: "Debug Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
      toast({
        title: "Copied",
        description: "Debug information copied to clipboard",
      });
    }
  };

  const getStatusIcon = (success: boolean | null) => {
    if (success === null) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const handleEditItem = (item: any) => {
    console.log("🖊️ Attempting to edit item:", item);
    setEditingItem(item);
    setItemDialogOpen(true);
  };

  const handleDeleteItem = (id: number) => {
    console.log("🗑️ Attempting to delete item ID:", id);
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      console.log("🗑️ Confirming delete for item ID:", itemToDelete);
      deleteItem.mutate(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSaveItem = (itemData: any) => {
    console.log("💾 Attempting to save item:", itemData);
    if (editingItem) {
      console.log("✏️ Updating existing item");
      updateItem.mutate(itemData);
    } else {
      console.log("➕ Adding new item");
      addItem.mutate({ ...itemData, user_id: user?.id || "" });
    }
    setEditingItem(null);
  };

  const handleAddNew = () => {
    if (!isAuthenticated) {
      console.log("🚫 User not authenticated, showing auth dialog");
      setAuthDialogOpen(true);
      return;
    }
    console.log("➕ Opening add item dialog");
    setEditingItem(null);
    setItemDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">YCCC Nursing Inventory</h1>
              <p className="text-sm text-muted-foreground">York County Community College - Enhanced with Debug Tools</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Debug Panel */}
              <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Debug
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Bug className="h-5 w-5" />
                      System Diagnostics
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button onClick={runDiagnostics}>Run Diagnostics</Button>
                      {debugInfo && (
                        <Button variant="outline" onClick={copyToClipboard}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Debug Info
                        </Button>
                      )}
                    </div>

                    {debugInfo && (
                      <div className="space-y-4">
                        {/* Authentication Status */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              {getStatusIcon(debugInfo.authentication.isAuthenticated)}
                              Authentication Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Authenticated:</span>
                              <Badge variant={debugInfo.authentication.isAuthenticated ? "default" : "destructive"}>
                                {debugInfo.authentication.isAuthenticated ? "Yes" : "No"}
                              </Badge>
                            </div>
                            {debugInfo.authentication.user && (
                              <>
                                <div><strong>Email:</strong> {debugInfo.authentication.user.email}</div>
                                <div><strong>Email Confirmed:</strong> {debugInfo.authentication.user.email_confirmed_at || "Not confirmed"}</div>
                                <div><strong>User ID:</strong> {debugInfo.authentication.user.id}</div>
                              </>
                            )}
                            {debugInfo.authentication.userError && (
                              <div className="text-red-600"><strong>User Error:</strong> {debugInfo.authentication.userError}</div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Database Connection */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              {getStatusIcon(debugInfo.database?.success)}
                              Database Connection
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {debugInfo.database?.success ? (
                              <div className="text-green-600">✓ Database connection successful</div>
                            ) : (
                              <div className="text-red-600">✗ Database error: {debugInfo.database?.error}</div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Permissions */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Permissions Test</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(debugInfo.permissions.read?.canRead)}
                              <span>Read Permission:</span>
                              <Badge variant={debugInfo.permissions.read?.canRead ? "default" : "destructive"}>
                                {debugInfo.permissions.read?.canRead ? "Granted" : "Denied"}
                              </Badge>
                            </div>
                            {debugInfo.permissions.read?.readError && (
                              <div className="text-red-600 text-sm">Error: {debugInfo.permissions.read.readError}</div>
                            )}
                            
                            {debugInfo.permissions.update && (
                              <div className="flex items-center gap-2">
                                {getStatusIcon(debugInfo.permissions.update?.canUpdate)}
                                <span>Update Permission:</span>
                                <Badge variant={debugInfo.permissions.update?.canUpdate ? "default" : "destructive"}>
                                  {debugInfo.permissions.update?.canUpdate ? "Granted" : "Denied"}
                                </Badge>
                              </div>
                            )}
                            {debugInfo.permissions.update?.error && (
                              <div className="text-red-600 text-sm">Error: {debugInfo.permissions.update.error}</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

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
        {/* Help Notice */}
        {!isAuthenticated && (
          <Alert className="mb-6">
            <Bug className="h-4 w-4" />
            <AlertDescription>
              <strong>Troubleshooting Edit/Delete Issues:</strong> 
              <br />1. Sign in with your @mainecc.edu email
              <br />2. Use the "Debug" button above to check permissions
              <br />3. Look for detailed error messages in the browser console (F12)
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
            
            {filteredAndSortedItems.length === 0 && (
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
              Are you sure you want to delete this item? This action cannot be undone.
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

export default Index;