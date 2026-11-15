import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in to ENES Properties" };

export default function MemberSignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F0E8] px-4 py-12">
      <section className="w-full max-w-md rounded-[18px] border border-[#E5E0D6] bg-[#FFFDF8] p-6 sm:p-8">
        <p className="text-center text-[10px] font-extrabold uppercase tracking-[.16em] text-[#176B57]">Your ENES account</p>
        <h1 className="mt-2 text-center text-[25px] font-extrabold tracking-[-.05em] text-[#18211F]">Welcome back.</h1>
        <p className="mb-6 mt-2 text-center text-[12px] leading-6 text-[#68736D]">Sign in to manage your listings, saved properties and service enquiries.</p>
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
      </section>
    </main>
  );
}
