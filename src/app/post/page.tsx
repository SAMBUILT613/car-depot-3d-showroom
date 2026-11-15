import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PostListingForm } from "@/components/forms/post-listing-form";

export default function Page() {
  return (
    <>
      <Header />
      <PostListingForm />
      <Footer />
    </>
  );
}
