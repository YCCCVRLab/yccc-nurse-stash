import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bug, Copy, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const DebugPanel = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const runDiagnostics = async () => {
    try {
      // Get current user info
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      // Get session info
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Test database connection
      let dbConnectionTest = null;
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("count", { count: 'exact', head: true });
        dbConnectionTest = { success: !error, error: error?.message, count: data };
      } catch (err: any) {
        dbConnectionTest = { success: false, error: err.message };
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
      } catch (err: any) {
        permissionTest = { canRead: false, readError: err.message };
      }

      // Test insert permission
      let insertTest = null;
      try {
        // Try to insert a test item (we'll roll it back)
        const testItem = {
          item: "DEBUG_TEST_ITEM_DELETE_ME",
          location: "DEBUG",
          user_id: currentUser?.id || "",
        };
        
        const { data, error } = await supabase
          .from("inventory_items")
          .insert([testItem])
          .select();
          
        if (!error && data && data[0]) {
          // Clean up test item
          await supabase
            .from("inventory_items")
            .delete()
            .eq("id", data[0].id);
          insertTest = { canInsert: true };
        } else {
          insertTest = { canInsert: false, error: error?.message };
        }
      } catch (err: any) {
        insertTest = { canInsert: false, error: err.message };
      }

      // Check email whitelist
      let whitelistTest = null;
      try {
        const { data, error } = await supabase
          .from("email_whitelist")
          .select("*")
          .limit(5);
        whitelistTest = { 
          canAccessWhitelist: !error, 
          error: error?.message,
          whitelistedEmails: data || []
        };
      } catch (err: any) {
        whitelistTest = { canAccessWhitelist: false, error: err.message };
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
          insert: insertTest,
        },
        whitelist: whitelistTest,
        environment: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "Not set",
        }
      };

      setDebugInfo(diagnostics);
    } catch (error: any) {
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                  {debugInfo.authentication.sessionError && (
                    <div className="text-red-600"><strong>Session Error:</strong> {debugInfo.authentication.sessionError}</div>
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
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(debugInfo.permissions.insert?.canInsert)}
                    <span>Insert Permission:</span>
                    <Badge variant={debugInfo.permissions.insert?.canInsert ? "default" : "destructive"}>
                      {debugInfo.permissions.insert?.canInsert ? "Granted" : "Denied"}
                    </Badge>
                  </div>
                  {debugInfo.permissions.insert?.error && (
                    <div className="text-red-600 text-sm">Error: {debugInfo.permissions.insert.error}</div>
                  )}
                </CardContent>
              </Card>

              {/* Email Whitelist */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(debugInfo.whitelist?.canAccessWhitelist)}
                    Email Whitelist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.whitelist?.canAccessWhitelist ? (
                    <div>
                      <div className="text-green-600 mb-2">✓ Can access whitelist</div>
                      <div><strong>Whitelisted emails:</strong></div>
                      <ul className="list-disc list-inside text-sm">
                        {debugInfo.whitelist.whitelistedEmails.map((item: any, index: number) => (
                          <li key={index}>{item.email} ({item.domain})</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-red-600">✗ Cannot access whitelist: {debugInfo.whitelist?.error}</div>
                  )}
                </CardContent>
              </Card>

              {/* Environment Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><strong>URL:</strong> {debugInfo.environment.url}</div>
                  <div><strong>Supabase URL:</strong> {debugInfo.environment.supabaseUrl}</div>
                  <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};