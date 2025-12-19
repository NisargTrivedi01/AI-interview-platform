import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password,
      });

      console.log("✅ Signup successful:", response.data);

      // Show success message
      setError("✅ Account created successfully! Redirecting to login...");

      // Redirect to login page after 2 seconds (professional behavior)
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (error) {
      console.error("❌ Signup error:", error);
      setError(error.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent mb-2">
            Join Us Today
          </h1>
          <p className="text-gray-400 text-sm">Start your AI-powered interview preparation journey</p>
        </div>

        {/* Success/Error Message */}
        {error && (
          <div className={`p-4 rounded-lg mb-6 border ${
            error.includes("successfully") 
              ? "bg-green-900/50 border-green-700 text-green-200" 
              : "bg-red-900/50 border-red-700 text-red-200"
          }`}>
            <div className="flex items-center">
              <span className="text-lg mr-3">{error.includes("successfully") ? "✅" : "❌"}</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-gray-300 text-sm font-medium">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-gray-300 text-sm font-medium">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-gray-300 text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
              placeholder="Create a strong password"
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              🔑 Use at least 6 characters with letters and numbers
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 transform hover:scale-105 ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 shadow-lg"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Creating Account...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">✨</span>
                Create Account
              </span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="px-3 text-gray-500 text-sm">Already have an account?</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-400">
            Already registered?{" "}
            <Link
              to="/login"
              className="text-green-400 hover:text-green-300 font-medium transition-colors duration-300"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Features List */}
        <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
          <h3 className="text-green-400 font-semibold text-sm mb-2">🎯 What you'll get:</h3>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• AI-powered interview simulations</li>
            <li>• Real-time coding challenges</li>
            <li>• Personalized feedback & analytics</li>
            <li>• Progress tracking dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}