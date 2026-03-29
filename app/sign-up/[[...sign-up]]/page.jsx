import { SignUp } from "@clerk/nextjs";

// ============================================================================
// SIGN-UP PAGE — Clerk's hosted sign-up component
// ============================================================================

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/30 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI HR Pilot</h1>
          <p className="text-sm text-gray-400 mt-1">Create your account</p>
        </div>
        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "rounded-2xl shadow-xl",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
