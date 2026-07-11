import Prologue from "@/components/Prologue";
import Fragments from "@/components/Fragments";
import Director from "@/components/Director";
import Film from "@/components/Film";
import Credits from "@/components/Credits";
import Coda from "@/components/Coda";

export default function Home() {
  return (
    <main>
      {/* fixed production slate */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 mix-blend-difference">
        <p className="slate text-paper">One More Year</p>
        <a href="#film" className="slate text-paper transition-colors hover:text-amber">
          Tonight&rsquo;s memory →
        </a>
      </header>

      <Prologue />
      <Fragments />
      <Director />
      <Film />
      <Credits />
      <Coda />
    </main>
  );
}
