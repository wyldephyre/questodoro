import { useState, type FormEvent } from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_REWARDS,
  REWARD_PRESETS,
  parsePreset,
  presetKey,
  ruleLabel,
  type Reward,
} from "@/lib/questodoro/missions";
import { cn } from "@/lib/utils";

export function RewardsShelf({
  rewards,
  onAdd,
  onRename,
  onRemove,
  onClaim,
  className,
}: {
  rewards: Reward[];
  onAdd: (title: string, rule: ReturnType<typeof parsePreset>) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onClaim: (id: string) => void;
  className?: string;
}) {
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState(presetKey(REWARD_PRESETS[4]?.rule ?? { kind: "missions", at: 3 }));

  function submit(event: FormEvent) {
    event.preventDefault();
    onAdd(title, parsePreset(preset));
    setTitle("");
  }

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl bg-surface p-5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Gift className="size-4 text-olive" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
          Bribe shelf
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted">
        Self-bribes. Unlock on level, streak, or check-ins in a row. You stamp CLAIMED. Honor system.
      </p>

      <ul className="mt-4 grid min-h-0 flex-1 grid-cols-1 content-start gap-3 xl:grid-cols-2">
        {rewards.length === 0 ? (
          <li className="col-span-full text-sm text-muted">No bribes on the shelf. Add one.</li>
        ) : (
          rewards.map((reward) => {
            const unlocked = Boolean(reward.unlockedAt);
            return (
              <li
                key={reward.id}
                className={cn(
                  "relative rounded-md bg-well p-3",
                  reward.claimed
                    ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_55%,transparent)]"
                    : unlocked
                      ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_50%,transparent)]"
                      : "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
                )}
              >
                {reward.claimed ? (
                  <span className="claimed-stamp pointer-events-none absolute right-2 top-2 font-display text-xs font-semibold uppercase tracking-kicker text-olive">
                    Claimed
                  </span>
                ) : null}
                <Input
                  aria-label="Reward title"
                  value={reward.title}
                  maxLength={32}
                  className="h-9 min-h-9 pr-16"
                  onChange={(event) => onRename(reward.id, event.target.value)}
                />
                <p className="mt-1 text-xs text-muted">{ruleLabel(reward.rule)}</p>
                <div className="mt-2 flex gap-1">
                  <Button
                    type="button"
                    size="compact"
                    variant={reward.claimed ? "secondary" : unlocked ? "ember" : "ghost"}
                    className="flex-1"
                    disabled={!unlocked && !reward.claimed}
                    onClick={() => onClaim(reward.id)}
                  >
                    {reward.claimed ? "Unstamp" : unlocked ? "Claim" : "Locked"}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${reward.title}`}
                    onClick={() => onRemove(reward.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <form className="mt-3 flex flex-col gap-2" onSubmit={submit}>
        <Input
          aria-label="New reward"
          placeholder="20 min game, junk food win…"
          value={title}
          maxLength={32}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="reward-rule">
            Unlock rule
          </label>
          <select
            id="reward-rule"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
            className="h-11 min-h-11 flex-1 rounded-md bg-well px-3 font-sans text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-olive)]"
          >
            {REWARD_PRESETS.map((item) => (
              <option key={presetKey(item.rule)} value={presetKey(item.rule)}>
                {item.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" disabled={rewards.length >= MAX_REWARDS || title.trim().length < 2}>
            <Plus />
            Add
          </Button>
        </div>
      </form>
    </section>
  );
}
