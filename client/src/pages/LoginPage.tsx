import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://www.mirabeltechnologies.com/wp-content/uploads/2022/05/Mirabel-gold-white-background.png"
            alt="Mirabel Technologies"
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            HR Resume Filter
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Sign in with your Google account to continue
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Secure Sign-In</span>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center">
            {loading ? (
              <div className="text-sm text-gray-500">Verifying...</div>
            ) : (
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setError('');
                  setLoading(true);
                  try {
                    await login(credentialResponse);
                  } catch (err: any) {
                    setError(err.message || 'Sign-in failed. You may not be authorized.');
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={() => {
                  setError('Google sign-in failed. Please try again.');
                }}
                theme="outline"
                size="large"
                width={320}
                text="signin_with"
              />
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Only authorized users can access this application.
            <br />
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
