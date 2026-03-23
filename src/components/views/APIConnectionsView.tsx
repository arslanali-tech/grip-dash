import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  KeyIcon, 
  CheckCircle2Icon, 
  XCircleIcon, 
  RefreshCwIcon, 
  ExternalLinkIcon,
  AlertCircleIcon,
  LinkIcon,
  UnlinkIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface APIConnection {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  logo: string;
  apiKey?: string;
  webhookUrl?: string;
  lastSync?: string;
  enabled: boolean;
}

const mockAPIConnections: APIConnection[] = [
  {
    id: 'rightmove',
    name: 'Rightmove',
    description: 'Sync property listings and leads from Rightmove',
    status: 'connected',
    logo: 'https://www.rightmove.co.uk/ps/images/brands/rm/logo.svg',
    lastSync: '2 hours ago',
    enabled: true,
  },
  {
    id: 'zoopla',
    name: 'Zoopla',
    description: 'Import property data and enquiries from Zoopla',
    status: 'connected',
    logo: 'https://www.zoopla.co.uk/static/images/mashery/zoopla_logo.png',
    lastSync: '1 hour ago',
    enabled: true,
  },
  {
    id: 'onthemarket',
    name: 'OnTheMarket',
    description: 'Connect with OnTheMarket for property listings',
    status: 'disconnected',
    logo: 'https://www.onthemarket.com/content/dam/otm/images/otm-logo.svg',
    enabled: false,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments and viewings with Google Calendar',
    status: 'connected',
    logo: 'https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png',
    lastSync: '30 minutes ago',
    enabled: true,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync contacts for email marketing campaigns',
    status: 'disconnected',
    logo: 'https://eep.io/images/yzco4xsimv0y/5fwn1lUbxKc6SYkMQkqOGU/c9a4cc6e1c3c0c4b8c8c8c8c8c8c8c8c/freddie-head-yellow.png',
    enabled: false,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and manage subscriptions',
    status: 'error',
    logo: 'https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg',
    lastSync: 'Failed',
    enabled: true,
  },
];

export function APIConnectionsView() {
  const [connections, setConnections] = useState<APIConnection[]>(mockAPIConnections);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<APIConnection | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleToggleConnection = (id: string) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, enabled: !conn.enabled } : conn
    ));
  };

  const handleConnect = (connection: APIConnection) => {
    setSelectedConnection(connection);
    setApiKey(connection.apiKey || '');
    setWebhookUrl(connection.webhookUrl || '');
    setConfigureDialogOpen(true);
  };

  const handleDisconnect = (id: string) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, status: 'disconnected', enabled: false, apiKey: undefined } : conn
    ));
  };

  const handleSaveConfiguration = () => {
    if (!selectedConnection) return;

    setConnections(prev => prev.map(conn => 
      conn.id === selectedConnection.id 
        ? { 
            ...conn, 
            status: 'connected', 
            enabled: true, 
            apiKey,
            webhookUrl,
            lastSync: 'Just now'
          } 
        : conn
    ));

    setConfigureDialogOpen(false);
    setSelectedConnection(null);
    setApiKey('');
    setWebhookUrl('');
  };

  const handleTestConnection = (id: string) => {
    console.log('Testing connection:', id);
    // Simulate API test
    setTimeout(() => {
      alert('Connection test successful!');
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      connected: { icon: CheckCircle2Icon, color: 'text-green-700', bg: 'bg-green-100', label: 'Connected' },
      disconnected: { icon: XCircleIcon, color: 'text-gray-700', bg: 'bg-gray-100', label: 'Disconnected' },
      error: { icon: AlertCircleIcon, color: 'text-red-700', bg: 'bg-red-100', label: 'Error' },
    };
    const { icon: Icon, color, bg, label } = config[status as keyof typeof config];
    
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", bg, color)}>
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6 relative z-10">
      <div className="space-y-1 mb-6">
        <h1 className="font-heading text-3xl font-semibold text-foreground flex items-center gap-3">
          <KeyIcon className="h-8 w-8 text-primary" strokeWidth={1.5} />
          API Connections
        </h1>
        <p className="text-muted-foreground">
          Connect GRIP with external services and platforms to automate data sync and workflows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card 
            key={connection.id} 
            className={cn(
              "bg-card text-card-foreground transition-all duration-200 hover:shadow-lg",
              connection.status === 'connected' && "border-l-4 border-l-green-500",
              connection.status === 'error' && "border-l-4 border-l-red-500"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-white dark:bg-muted p-2 flex items-center justify-center shadow-sm">
                    <img 
                      src={connection.logo} 
                      alt={`${connection.name} logo`}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        // Fallback to first letter if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-primary">${connection.name[0]}</span>`;
                      }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {connection.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {connection.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                {getStatusBadge(connection.status)}
              </div>

              {connection.lastSync && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="text-foreground font-medium">{connection.lastSync}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={connection.enabled}
                    onCheckedChange={() => handleToggleConnection(connection.id)}
                    disabled={connection.status === 'disconnected'}
                  />
                  <Label className="text-xs text-muted-foreground cursor-pointer">
                    {connection.enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {connection.status === 'connected' ? (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => handleTestConnection(connection.id)}
                    >
                      <RefreshCwIcon className="h-3 w-3 mr-1" strokeWidth={1.5} />
                      Test
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      <UnlinkIcon className="h-3 w-3 mr-1" strokeWidth={1.5} />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                    onClick={() => handleConnect(connection)}
                  >
                    <LinkIcon className="h-3 w-3 mr-1" strokeWidth={1.5} />
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Connection Card */}
      <Card className="bg-muted/30 border-dashed border-2 border-border hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-3">
            <KeyIcon className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Request New Integration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Need to connect with another service? Let us know!
          </p>
          <Button variant="outline" size="sm">
            <ExternalLinkIcon className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Contact Support
          </Button>
        </CardContent>
      </Card>

      {/* Configure API Dialog */}
      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl flex items-center gap-2">
              {selectedConnection && (
                <>
                  <span className="text-3xl">{selectedConnection.logo}</span>
                  Configure {selectedConnection.name}
                </>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Enter your API credentials to connect with {selectedConnection?.name}
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-foreground">
                API Key<span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-background text-foreground pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOffIcon className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <EyeIcon className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Find your API key in your {selectedConnection?.name} account settings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-foreground">
                Webhook URL (Optional)
              </Label>
              <Input
                id="webhook-url"
                type="text"
                placeholder="https://your-webhook-url.com"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Receive real-time updates via webhook
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex gap-3">
                <AlertCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Security Notice</p>
                  <p className="text-xs text-muted-foreground">
                    Your API credentials are encrypted and stored securely. We never share your keys with third parties.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setConfigureDialogOpen(false);
                setSelectedConnection(null);
                setApiKey('');
                setWebhookUrl('');
              }}
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfiguration}
              disabled={!apiKey}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LinkIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
