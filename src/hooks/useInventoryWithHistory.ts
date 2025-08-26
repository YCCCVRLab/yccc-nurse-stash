import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface InventoryItem {
  id: number;
  item: string;
  description?: string;
  location: string;
  shelf?: string;
  tub?: string;
  quantity?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface HistoryAction {
  id: string;
  type: 'add' | 'update' | 'delete';
  timestamp: Date;
  item: InventoryItem;
  previousItem?: InventoryItem;
  description: string;
}

export const useInventoryWithHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      try {
        console.log("🔄 Fetching inventory items...");
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .order("item", { ascending: true });
      
        if (error) {
          console.error("❌ Database query error:", error);
          throw error;
        }
        console.log("✅ Inventory items fetched:", data.length);
        return data as InventoryItem[];
      } catch (err) {
        console.error("🚨 Query error in useInventoryWithHistory:", err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const addToHistory = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    const newAction: HistoryAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    
    setHistory(prev => {
      // Remove any actions after current index (when undoing then doing new action)
      const newHistory = prev.slice(0, currentHistoryIndex + 1);
      newHistory.push(newAction);
      
      // Keep only last 50 actions
      return newHistory.slice(-50);
    });
    
    setCurrentHistoryIndex(prev => prev + 1);
  }, [currentHistoryIndex]);

  const addItem = useMutation({
    mutationFn: async (newItem: Omit<InventoryItem, "id" | "created_at" | "updated_at">) => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated. Please sign in again.");
        }

        console.log("➕ Attempting to add item to Supabase:", newItem);
        
        const { data, error } = await supabase
          .from("inventory_items")
          .insert([newItem])
          .select();
        
        if (error) {
          console.error("❌ Supabase insert error:", error);
          if (error.code === 'PGRST301') {
            throw new Error("Permission denied. Please check your email verification and try again.");
          }
          throw error;
        }
        
        console.log("✅ Item added successfully to Supabase:", data);
        return data;
      } catch (err) {
        console.error("🚨 Add item mutation failed:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("🎉 Add item mutation onSuccess! Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      if (data && data[0]) {
        addToHistory({
          type: 'add',
          item: data[0],
          description: `Added "${data[0].item}"`
        });
      }
      toast({
        title: "Success",
        description: "Item added to inventory",
      });
    },
    onError: (error: any) => {
      console.error("🔥 Add item mutation onError:", error);
      toast({
        title: "Error Adding Item",
        description: error.message || "Failed to add item. Please check your permissions and try again.",
        variant: "destructive",
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: number }) => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated. Please sign in again.");
        }

        console.log(`✏️ Attempting to update item ID ${id} in Supabase with:`, updates);

        // Get current item for history
        const { data: currentData, error: fetchError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error(`❌ Fetch error for item ID ${id} before update:`, fetchError);
          throw fetchError;
        }

        const { data, error } = await supabase
          .from("inventory_items")
          .update(updates)
          .eq("id", id)
          .select();
        
        if (error) {
          console.error(`❌ Supabase update error for item ID ${id}:`, error);
          if (error.code === 'PGRST301') {
            throw new Error("Permission denied. You may not have permission to edit this item.");
          }
          throw error;
        }
        
        console.log(`✅ Item ID ${id} updated successfully in Supabase:`, data);
        return { updated: data, previous: currentData };
      } catch (err) {
        console.error(`🚨 Update item mutation failed for ID ${id}:`, err);
        throw err;
      }
    },
    onSuccess: ({ updated, previous }) => {
      console.log("🎉 Update item mutation onSuccess! Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      console.log("✨ Updated data after mutation success:", updated);
      if (updated && updated[0]) {
        addToHistory({
          type: 'update',
          item: updated[0],
          previousItem: previous,
          description: `Updated "${updated[0].item}"`
        });
      }
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("🔥 Update item mutation onError:", error);
      toast({
        title: "Error Updating Item",
        description: error.message || "Failed to update item. Please check your permissions and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated. Please sign in again.");
        }

        console.log(`🗑️ Attempting to delete item ID ${id} from Supabase`);

        // Get current item for history
        const { data: currentData, error: fetchError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error(`❌ Fetch error for item ID ${id} before delete:`, fetchError);
          throw fetchError;
        }

        const { error } = await supabase
          .from("inventory_items")
          .delete()
          .eq("id", id);
        
        if (error) {
          console.error(`❌ Supabase delete error for item ID ${id}:`, error);
          if (error.code === 'PGRST301') {
            throw new Error("Permission denied. You may not have permission to delete this item.");
          }
          throw error;
        }
        
        console.log(`✅ Item ID ${id} deleted successfully from Supabase`);
        return currentData;
      } catch (err) {
        console.error(`🚨 Delete item mutation failed for ID ${id}:`, err);
        throw err;
      }
    },
    onSuccess: (deletedItem) => {
      console.log("🎉 Delete item mutation onSuccess! Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      if (deletedItem) {
        addToHistory({
          type: 'delete',
          item: deletedItem,
          description: `Deleted "${deletedItem.item}"`
        });
      }
      toast({
        title: "Success",
        description: "Item removed from inventory",
      });
    },
    onError: (error: any) => {
      console.error("🔥 Delete item mutation onError:", error);
      toast({
        title: "Error Deleting Item",
        description: error.message || "Failed to remove item. Please check your permissions and try again.",
        variant: "destructive",
      });
    },
  });

  const undoLastAction = useCallback(async () => {
    if (currentHistoryIndex < 0 || currentHistoryIndex >= history.length) {
      toast({
        title: "Nothing to Undo",
        description: "No actions available to undo.",
        variant: "destructive",
      });
      return;
    }

    const actionToUndo = history[currentHistoryIndex];
    console.log("↩️ Attempting to undo action:", actionToUndo);
    
    try {
      switch (actionToUndo.type) {
        case 'add':
          console.log(`↩️ Undoing add: Deleting item ID ${actionToUndo.item.id}`);
          await supabase
            .from("inventory_items")
            .delete()
            .eq("id", actionToUndo.item.id);
          break;
        case 'update':
          if (actionToUndo.previousItem) {
            console.log(`↩️ Undoing update: Restoring item ID ${actionToUndo.item.id} to previous state`);
            const { id, created_at, updated_at, ...restoreData } = actionToUndo.previousItem;
            await supabase
              .from("inventory_items")
              .update(restoreData)
              .eq("id", id);
          }
          break;
        case 'delete':
          console.log(`↩️ Undoing delete: Re-inserting item ID ${actionToUndo.item.id}`);
          const { id, created_at, updated_at, ...restoreData } = actionToUndo.item;
          await supabase
            .from("inventory_items")
            .insert([restoreData]);
          break;
      }
      
      setCurrentHistoryIndex(prev => prev - 1);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      
      toast({
        title: "Action Undone",
        description: `Undid: ${actionToUndo.description}`,
      });
      console.log("✅ Action undone successfully.");
    } catch (error: any) {
      console.error("🚨 Undo error:", error);
      toast({
        title: "Undo Failed",
        description: error.message || "Failed to undo action",
        variant: "destructive",
      });
    }
  }, [currentHistoryIndex, history, queryClient, toast]);

  const redoLastAction = useCallback(async () => {
    if (currentHistoryIndex >= history.length - 1) {
      toast({
        title: "Nothing to Redo",
        description: "No actions available to redo.",
        variant: "destructive",
      });
      return;
    }

    const actionToRedo = history[currentHistoryIndex + 1];
    console.log("➡️ Attempting to redo action:", actionToRedo);
    
    try {
      switch (actionToRedo.type) {
        case 'add':
          console.log(`➡️ Redoing add: Re-inserting item ID ${actionToRedo.item.id}`);
          const { id, created_at, updated_at, ...addData } = actionToRedo.item;
          await supabase
            .from("inventory_items")
            .insert([addData]);
          break;
        case 'update':
          console.log(`➡️ Redoing update: Re-applying update for item ID ${actionToRedo.item.id}`);
          const { id: updateId, created_at: updateCreated, updated_at: updateUpdated, ...updateData } = actionToRedo.item;
          await supabase
            .from("inventory_items")
            .update(updateData)
            .eq("id", updateId);
          break;
        case 'delete':
          console.log(`➡️ Redoing delete: Deleting item ID ${actionToRedo.item.id}`);
          await supabase
            .from("inventory_items")
            .delete()
            .eq("id", actionToRedo.item.id);
          break;
      }
      
      setCurrentHistoryIndex(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      
      toast({
        title: "Action Redone",
        description: `Redid: ${actionToRedo.description}`,
      });
      console.log("✅ Action redone successfully.");
    } catch (error: any) {
      console.error("🚨 Redo error:", error);
      toast({
        title: "Redo Failed",
        description: error.message || "Failed to redo action",
        variant: "destructive",
      });
    }
  }, [currentHistoryIndex, history, queryClient, toast]);

  const canUndo = currentHistoryIndex >= 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  return {
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
    history: history.slice(0, currentHistoryIndex + 1),
  };
};