import { SignIn } from "@clerk/nextjs";

// ============================================================================
// SIGN-IN PAGE — Clerk's hosted sign-in component
// Supports email/password, Google OAuth, Microsoft OAuth.
// Styled to match AI HR Pilot branding.
// ============================================================================

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/30 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI HR Pilot</h1>
          <p className="text-sm text-gray-400 mt-1">Enterprise HR Intelligence Platform</p>
        </div>

        {/* Clerk sign-in component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "rounded-2xl shadow-xl",
              },
            }}
          />
        </div>

        {/* Security badges */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
            <span>SOC 2 Type II</span>
            <span>·</span>
            <span>256-bit AES Encryption</span>
            <span>·</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
