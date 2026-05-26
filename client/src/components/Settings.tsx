import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, Eye, EyeOff, CheckCircle2, ArrowLeft, Cloud, CloudOff, Loader2, Key, Shield } from 'lucide-react';
import {
  getStoredApiKey,
  storeApiKey,
  removeApiKey,
  saveApiKeyToServer,
  loadApiKeyFromServer,
  deleteApiKeyFromServer,
} from '../utils/apiKeyStorage';

interface SettingsProps {
  onApiKeySet?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onApiKeySet }) => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [serverKeyStatus, setServerKeyStatus] = useState<string | null>(null);
  const [serverLoading, setServerLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) {
      setApiKey(stored);
    }

    loadApiKeyFromServer()
      .then(({ apiKey: maskedKey, hasKey }) => {
        if (hasKey && maskedKey) {
          setServerKeyStatus(maskedKey);
          if (!stored) {
            setApiKey(maskedKey);
          }
        }
      })
      .catch(() => {})
      .finally(() => setServerLoading(false));
  }, []);

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys typically start with "sk-"');
      return;
    }

    setLoading(true);
    try {
      storeApiKey(apiKey.trim());
      await saveApiKeyToServer(apiKey.trim());

      const { apiKey: maskedKey } = await loadApiKeyFromServer();
      if (maskedKey) setServerKeyStatus(maskedKey);

      setSaved(true);
      onApiKeySet?.();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      storeApiKey(apiKey.trim());
      setSaved(true);
      setError('Saved locally but failed to sync to server. It may not persist across browsers.');
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setApiKey('');
    setError('');
    setSaved(false);
    setServerKeyStatus(null);
    removeApiKey();
    try { await deleteApiKeyFromServer(); } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Analyzer
          </button>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <SettingsIcon className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Settings</h1>
                  <p className="text-indigo-200 text-sm mt-0.5">Manage your API configuration</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* API Key Field */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <Key size={15} className="text-indigo-500" />
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError('');
                      setSaved(false);
                    }}
                    placeholder="sk-proj-..."
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-colors font-mono text-sm overflow-hidden text-ellipsis"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Server sync status */}
                <div className="mt-2.5 flex items-start gap-2 text-xs">
                  {serverLoading ? (
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      Checking server...
                    </span>
                  ) : serverKeyStatus ? (
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <Cloud size={13} />
                      <span className="break-all">Synced to server: <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 break-all">{serverKeyStatus}</code></span>
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <CloudOff size={13} />
                      Not synced to server yet
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  Get your key from{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2">
                    platform.openai.com
                  </a>
                  . Keys are stored on the server and persist across browsers.
                </p>
              </div>

              {/* Error / Success */}
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {saved && !error && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  API key saved successfully!
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 px-5 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {loading ? 'Saving...' : 'Save API Key'}
                </button>
                <button
                  onClick={handleClear}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition-colors text-sm"
                >
                  Clear
                </button>
              </div>

              {/* Security note */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                  <Shield size={15} className="text-slate-400" />
                  Security & Privacy
                </div>
                <ul className="space-y-1.5 text-xs text-gray-500 leading-relaxed">
                  <li>Your API key is stored on the server and locally in your browser.</li>
                  <li>The key is sent directly to OpenAI for resume analysis only.</li>
                  <li>You can clear your key at any time with the Clear button.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
