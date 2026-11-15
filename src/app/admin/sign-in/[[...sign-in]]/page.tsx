import { SignIn } from "@clerk/nextjs";

export default function AdminSignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-[20px] font-bold text-ink-900">ENES Admin Portal</h1>
          <p className="mt-1 text-[14px] text-muted-600">Sign in to manage listings.</p>
        </div>
        <SignIn appearance={{ elements: { rootBox: "w-full", card: "shadow-none p-0", headerTitle: "hidden", headerSubtitle: "hidden" } }} />
      </div>
    </div>
  );
}
