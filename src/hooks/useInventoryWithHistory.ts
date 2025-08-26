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
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .order("item", { ascending: true });
        
        if (error) {
          console.error("Database error:", error);
          throw error;
        }
        return data as InventoryItem[];
      } catch (err) {
        console.error("Query error:", err);
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

        console.log("Adding item:", newItem);
        
        const { data, error } = await supabase
          .from("inventory_items")
          .insert([newItem])
          .select();
        
        if (error) {
          console.error("Insert error:", error);
          if (error.code === 'PGRST301') {
            throw new Error("Permission denied. Please check your email verification and try again.");
          }
          throw error;
        }
        
        console.log("Item added successfully:", data);
        return data;
      } catch (err) {
        console.error("Add item error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
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
      console.error("Add item mutation error:", error);
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

        console.log("Updating item:", id, updates);

        // Get current item for history
        const { data: currentData, error: fetchError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error("Fetch error:", fetchError);
          throw fetchError;
        }

        const { data, error } = await supabase
          .from("inventory_items")
          .update(updates)
          .eq("id", id)
          .select();
        
        if (error) {
          console.error("Update error:", error);
          if (error.code === 'PGRST301') {
            throw new Error("Permission denied. You may not have permission to edit this item.");
          }
          throw error;
        }
        
        console.log("Item updated successfully:", data);
        return { updated: data, previous: currentData };
      } catch (err) {
        console.error("Update item error:", err);
        throw err;
      }
    },
    onSuccess: ({ updated, previous }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
      console.error("Update item mutation error:", error);
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

        console.log("Deleting item:", id);

        // Get current item for history
        const { data: currentData, error: fetchError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          console.error("Fetch error:", fetchError);
          throw fetchError;
        }

        const { error } = await supabase
          .from("inventory_items")
          .delete()
          .eq("id", id);
        
        if (error) {
          console.error("Delete error:", error);
          if (error.code === 'PGRST301') {
            throw new Error("Permission denied. You may not have permission to delete this item.");
          }
          throw error;
        }
        
        console.log("Item deleted successfully");
        return currentData;
      } catch (err) {
        console.error("Delete item error:", err);
        throw err;
      }
    },
    onSuccess: (deletedItem) => {
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
      console.error("Delete item mutation error:", error);
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
    
    try {
      switch (actionToUndo.type) {
        case 'add':
          await supabase
            .from("inventory_items")
            .delete()
            .eq("id", actionToUndo.item.id);
          break;
        case 'update':
          if (actionToUndo.previousItem) {
            const { id, created_at, updated_at, ...restoreData } = actionToUndo.previousItem;
            await supabase
              .from("inventory_items")
              .update(restoreData)
              .eq("id", id);
          }
          break;
        case 'delete':
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
    } catch (error: any) {
      console.error("Undo error:", error);
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
    
    try {
      switch (actionToRedo.type) {
        case 'add':
          const { id, created_at, updated_at, ...addData } = actionToRedo.item;
          await supabase
            .from("inventory_items")
            .insert([addData]);
          break;
        case 'update':
          const { id: updateId, created_at: updateCreated, updated_at: updateUpdated, ...updateData } = actionToRedo.item;
          await supabase
            .from("inventory_items")
            .update(updateData)
            .eq("id", updateId);
          break;
        case 'delete':
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
    } catch (error: any) {
      console.error("Redo error:", error);
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