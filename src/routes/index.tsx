import { createFileRoute } from "@tanstack/react-router";
import { QuestodoroBoard } from "@/components/questodoro/board";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <QuestodoroBoard />;
}
