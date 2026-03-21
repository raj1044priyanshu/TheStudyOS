import { auth } from "@/auth";
import { TestHubPage } from "@/components/hubs/TestHubPage";
import { connectToDatabase } from "@/lib/mongodb";
import { FlashcardModel } from "@/models/Flashcard";
import type { FlashcardDifficulty } from "@/types";

export default async function DashboardTestRoute() {
  const session = await auth();

  let initialDecks: Array<{
    _id: string;
    topic: string;
    subject: string;
    cards: Array<{ front: string; back: string; difficulty: "easy" | "medium" | "hard" }>;
    createdAt: string;
  }> = [];

  if (session?.user?.id) {
    await connectToDatabase();
    const decks = (await FlashcardModel.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(12).lean()) as Array<{
      _id: { toString(): string };
      topic: string;
      subject: string;
      createdAt: Date | string;
      cards?: Array<{ front: string; back: string; difficulty: FlashcardDifficulty }>;
    }>;
    initialDecks = decks.map((deck) => ({
      _id: deck._id.toString(),
      topic: deck.topic,
      subject: deck.subject,
      cards: (deck.cards ?? []).map((card: { front: string; back: string; difficulty: FlashcardDifficulty }) => ({
        front: card.front,
        back: card.back,
        difficulty: card.difficulty
      })),
      createdAt: new Date(deck.createdAt).toISOString()
    }));
  }

  return <TestHubPage initialDecks={initialDecks} />;
}
