import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create an ENES account" };

export default function MemberSignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F0E8] px-4 py-12">
      <section className="w-full max-w-md rounded-[18px] border border-[#E5E0D6] bg-[#FFFDF8] p-6 sm:p-8">
        <p className="text-center text-[10px] font-extrabold uppercase tracking-[.16em] text-[#176B57]">Join ENES</p>
        <h1 className="mt-2 text-center text-[25px] font-extrabold tracking-[-.05em] text-[#18211F]">Create your account.</h1>
        <p className="mb-6 mt-2 text-center text-[12px] leading-6 text-[#68736D]">Save listings, contact sellers and manage your submissions.</p>
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
      </section>
    </main>
  );
}
