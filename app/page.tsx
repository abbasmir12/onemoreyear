import Hero from "@/components/Hero";
import Scrapbook from "@/components/Scrapbook";
import CuttingRoom from "@/components/CuttingRoom";
import Wire from "@/components/Wire";
import Masthead from "@/components/Masthead";
import Notice from "@/components/Notice";

export default function Home() {
  return (
    <main>
      <Hero />
      <Scrapbook />
      <CuttingRoom />
      <Wire />
      <Masthead />
      <Notice />
    </main>
  );
}
