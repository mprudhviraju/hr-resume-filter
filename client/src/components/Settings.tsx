import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Save, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getStoredApiKey, storeApiKey } from '../utils/apiKeyStorage';

interface SettingsProps {
  onApiKeySet?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onApiKeySet }) => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Load existing API key if available
    const stored = getStoredApiKey();
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  const handleSave = () => {
    setError('');
    setSaved(false);

    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation - OpenAI API keys typically start with 'sk-'
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys typically start with "sk-"');
      return;
    }

    try {
      storeApiKey(apiKey.trim());
      setSaved(true);
      if (onApiKeySet) {
        onApiKeySet();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save API key. Please try again.');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleClear = () => {
    setApiKey('');
    setError('');
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <SettingsIcon className="text-indigo-600" size={28} />
                <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
              </div>
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    placeholder="sk-..."
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your API key is stored locally in your browser and never sent to our servers except for API calls to OpenAI.
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {saved && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  API key saved successfully!
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Save API Key
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors duration-200"
                >
                  Clear
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Security & Privacy
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>
                      Your API key is stored only in your browser's localStorage
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>
                      The API key is sent directly to OpenAI's servers for resume analysis
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>
                      We do not store or log your API key on our servers
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span>
                      You can clear your API key at any time by clicking the Clear button
                    </span>
                  </li>
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

