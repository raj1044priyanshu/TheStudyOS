import { ChatInterface } from "@/components/doubts/ChatInterface";

export default function DoubtsPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Conversation</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Doubt Solver</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Ask anything and get step-by-step explanations in a calmer chat workspace designed for focused problem solving.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
