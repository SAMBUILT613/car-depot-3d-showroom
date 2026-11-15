import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PropertyServiceForm } from "@/components/forms/property-service-form";

export default function Page() {
  return (
    <>
      <Header />
      <PropertyServiceForm />
      <Footer />
    </>
  );
}
