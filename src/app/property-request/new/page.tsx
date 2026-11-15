import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PropertyRequestForm } from "@/components/forms/property-request-form";

export default function Page() {
  return (
    <>
      <Header />
      <PropertyRequestForm />
      <Footer />
    </>
  );
}
