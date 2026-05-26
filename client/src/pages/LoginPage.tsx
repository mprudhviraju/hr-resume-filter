import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#2b3544] h-11 flex items-center px-6">
        <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center text-white text-xs font-extrabold">
          M
        </div>
        <span className="ml-3 text-sm text-gray-300 font-medium">HR Resume Filter</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">
            Sign In
          </h1>
          <p className="mt-1 text-gray-500 text-xs">
            Sign in with your Google account to continue
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={15} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-600">Secure Sign-In</span>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
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

          <p className="mt-5 text-center text-[11px] text-gray-400">
            Only authorized users can access this application.
            <br />
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
