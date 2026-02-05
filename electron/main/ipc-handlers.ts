/**
 * IPC Handlers
 * Registers all IPC handlers for main-renderer communication
 */
import { ipcMain, BrowserWindow, shell, dialog, app } from 'electron';
import { GatewayManager } from '../gateway/manager';
import {
  storeApiKey,
  getApiKey,
  deleteApiKey,
  hasApiKey,
  saveProvider,
  getProvider,
  getAllProviders,
  deleteProvider,
  setDefaultProvider,
  getDefaultProvider,
  getAllProvidersWithKeyInfo,
  isEncryptionAvailable,
  type ProviderConfig,
} from '../utils/secure-storage';

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(
  gatewayManager: GatewayManager,
  mainWindow: BrowserWindow
): void {
  // Gateway handlers
  registerGatewayHandlers(gatewayManager, mainWindow);
  
  // Provider handlers
  registerProviderHandlers();
  
  // Shell handlers
  registerShellHandlers();
  
  // Dialog handlers
  registerDialogHandlers();
  
  // App handlers
  registerAppHandlers();
}

/**
 * Gateway-related IPC handlers
 */
function registerGatewayHandlers(
  gatewayManager: GatewayManager,
  mainWindow: BrowserWindow
): void {
  // Get Gateway status
  ipcMain.handle('gateway:status', () => {
    return gatewayManager.getStatus();
  });
  
  // Check if Gateway is connected
  ipcMain.handle('gateway:isConnected', () => {
    return gatewayManager.isConnected();
  });
  
  // Start Gateway
  ipcMain.handle('gateway:start', async () => {
    try {
      await gatewayManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Stop Gateway
  ipcMain.handle('gateway:stop', async () => {
    try {
      await gatewayManager.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Restart Gateway
  ipcMain.handle('gateway:restart', async () => {
    try {
      await gatewayManager.restart();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Gateway RPC call
  ipcMain.handle('gateway:rpc', async (_, method: string, params?: unknown, timeoutMs?: number) => {
    try {
      const result = await gatewayManager.rpc(method, params, timeoutMs);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Health check
  ipcMain.handle('gateway:health', async () => {
    try {
      const health = await gatewayManager.checkHealth();
      return { success: true, ...health };
    } catch (error) {
      return { success: false, ok: false, error: String(error) };
    }
  });
  
  // Forward Gateway events to renderer
  gatewayManager.on('status', (status) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:status-changed', status);
    }
  });
  
  gatewayManager.on('message', (message) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:message', message);
    }
  });
  
  gatewayManager.on('notification', (notification) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:notification', notification);
    }
  });
  
  gatewayManager.on('channel:status', (data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:channel-status', data);
    }
  });
  
  gatewayManager.on('chat:message', (data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:chat-message', data);
    }
  });
  
  gatewayManager.on('exit', (code) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:exit', code);
    }
  });
  
  gatewayManager.on('error', (error) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:error', error.message);
    }
  });
}

/**
 * Provider-related IPC handlers
 */
function registerProviderHandlers(): void {
  // Check if encryption is available
  ipcMain.handle('provider:encryptionAvailable', () => {
    return isEncryptionAvailable();
  });
  
  // Get all providers with key info
  ipcMain.handle('provider:list', async () => {
    return await getAllProvidersWithKeyInfo();
  });
  
  // Get a specific provider
  ipcMain.handle('provider:get', async (_, providerId: string) => {
    return await getProvider(providerId);
  });
  
  // Save a provider configuration
  ipcMain.handle('provider:save', async (_, config: ProviderConfig, apiKey?: string) => {
    try {
      // Save the provider config
      await saveProvider(config);
      
      // Store the API key if provided
      if (apiKey) {
        await storeApiKey(config.id, apiKey);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Delete a provider
  ipcMain.handle('provider:delete', async (_, providerId: string) => {
    try {
      await deleteProvider(providerId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Update API key for a provider
  ipcMain.handle('provider:setApiKey', async (_, providerId: string, apiKey: string) => {
    try {
      await storeApiKey(providerId, apiKey);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Delete API key for a provider
  ipcMain.handle('provider:deleteApiKey', async (_, providerId: string) => {
    try {
      await deleteApiKey(providerId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Check if a provider has an API key
  ipcMain.handle('provider:hasApiKey', async (_, providerId: string) => {
    return await hasApiKey(providerId);
  });
  
  // Get the actual API key (for internal use only - be careful!)
  ipcMain.handle('provider:getApiKey', async (_, providerId: string) => {
    return await getApiKey(providerId);
  });
  
  // Set default provider
  ipcMain.handle('provider:setDefault', async (_, providerId: string) => {
    try {
      await setDefaultProvider(providerId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // Get default provider
  ipcMain.handle('provider:getDefault', async () => {
    return await getDefaultProvider();
  });
  
  // Validate API key by making a test request (simulated for now)
  ipcMain.handle('provider:validateKey', async (_, providerId: string, apiKey: string) => {
    // In a real implementation, this would make a test API call to the provider
    // For now, we'll just do basic format validation
    try {
      // Basic validation based on provider type
      const provider = await getProvider(providerId);
      if (!provider) {
        return { valid: false, error: 'Provider not found' };
      }
      
      switch (provider.type) {
        case 'anthropic':
          if (!apiKey.startsWith('sk-ant-')) {
            return { valid: false, error: 'Anthropic keys should start with sk-ant-' };
          }
          break;
        case 'openai':
          if (!apiKey.startsWith('sk-')) {
            return { valid: false, error: 'OpenAI keys should start with sk-' };
          }
          break;
        case 'google':
          if (apiKey.length < 20) {
            return { valid: false, error: 'Google API key seems too short' };
          }
          break;
      }
      
      // Simulate API validation delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  });
}

/**
 * Shell-related IPC handlers
 */
function registerShellHandlers(): void {
  // Open external URL
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
  });
  
  // Open path in file explorer
  ipcMain.handle('shell:showItemInFolder', async (_, path: string) => {
    shell.showItemInFolder(path);
  });
  
  // Open path
  ipcMain.handle('shell:openPath', async (_, path: string) => {
    return await shell.openPath(path);
  });
}

/**
 * Dialog-related IPC handlers
 */
function registerDialogHandlers(): void {
  // Show open dialog
  ipcMain.handle('dialog:open', async (_, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options);
    return result;
  });
  
  // Show save dialog
  ipcMain.handle('dialog:save', async (_, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });
  
  // Show message box
  ipcMain.handle('dialog:message', async (_, options: Electron.MessageBoxOptions) => {
    const result = await dialog.showMessageBox(options);
    return result;
  });
}

/**
 * App-related IPC handlers
 */
function registerAppHandlers(): void {
  // Get app version
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });
  
  // Get app name
  ipcMain.handle('app:name', () => {
    return app.getName();
  });
  
  // Get app path
  ipcMain.handle('app:getPath', (_, name: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(name);
  });
  
  // Get platform
  ipcMain.handle('app:platform', () => {
    return process.platform;
  });
  
  // Quit app
  ipcMain.handle('app:quit', () => {
    app.quit();
  });
  
  // Relaunch app
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.quit();
  });
}
