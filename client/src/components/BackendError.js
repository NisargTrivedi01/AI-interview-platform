// src/components/BackendError.js
import React from "react";

const BackendError = ({ 
  title = "Backend Connection Error", 
  message = "Unable to connect to the server. Please check if your backend is running on port 5000.",
  onRetry = null 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-red-500/30 shadow-2xl text-center">
        {/* Error Icon */}
        <div className="text-6xl mb-6">🚨</div>
        
        {/* Error Title */}
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          {title}
        </h1>
        
        {/* Error Message */}
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-200 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Technical Details */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-yellow-400 font-semibold mb-2 text-sm">🔧 Troubleshooting Steps:</h3>
          <ul className="text-gray-300 text-xs space-y-1">
            <li>• Make sure the backend server is running on port 5000</li>
            <li>• Check if <code className="bg-black px-1 rounded">node server.js</code> is running</li>
            <li>• Verify MongoDB connection in backend console</li>
            <li>• Check if port 5000 is not being used by another application</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-semibold transition-all hover:scale-105"
            >
              🔄 Retry
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all hover:scale-105"
          >
            🔃 Reload Page
          </button>
        </div>

        {/* Fallback Message */}
        <div className="mt-6 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
          <p className="text-gray-400 text-xs">
            If the issue persists, please contact support or check the backend console for detailed error logs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackendError;