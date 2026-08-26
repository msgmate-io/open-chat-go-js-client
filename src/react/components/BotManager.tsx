import * as React from "react";
import type { Bot } from "../../core/types";
import { useBots } from "../hooks";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Text } from "../ui/text";
import { BotEditor } from "./BotEditor";

export interface BotManagerProps {
  /** Include public bots from other owners in the list. */
  includePublic?: boolean;
  /** Called when a bot is opened for editing. */
  onSelectBot?: (bot: Bot) => void;
  /** Called after a bot is saved from the built-in editor. */
  onSaved?: (bot: Bot) => void;
  className?: string;
}

/**
 * Embedded bot manager: lists the caller's bots and opens the built-in
 * {@link BotEditor} when one is selected.
 */
export function BotManager({
  includePublic = false,
  onSelectBot,
  onSaved,
  className,
}: BotManagerProps) {
  const { data, loading, error, refetch } = useBots({ include_public: includePublic });
  const [editingBot, setEditingBot] = React.useState<Bot | null>(null);

  if (editingBot) {
    return (
      <BotEditor
        botUuid={editingBot.uuid}
        onBack={() => {
          setEditingBot(null);
          refetch();
        }}
        onSaved={onSaved}
        className={className}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Bots</CardTitle>
            <CardDescription>
              Manage your Open Chat bot configurations.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size={20} />
          </div>
        ) : error ? (
          <Text color="destructive">Failed to load bots: {error.message}</Text>
        ) : !data || data.rows.length === 0 ? (
          <Text color="muted">No bots found.</Text>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.rows.map((bot) => (
              <li key={bot.uuid}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBot(bot);
                    onSelectBot?.(bot);
                  }}
                  className="surface-interactive hover:bg-accent/40 w-full cursor-pointer px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Text type="Heading7" tag="span">
                      {bot.name}
                    </Text>
                    <div className="flex items-center gap-1">
                      {bot.is_public ? (
                        <Badge variant="secondary">public</Badge>
                      ) : (
                        <Badge variant="outline">private</Badge>
                      )}
                      {!bot.is_active && <Badge variant="destructive">inactive</Badge>}
                    </div>
                  </div>
                  {bot.description ? (
                    <Text type="Body6" color="muted" className="mt-1 block">
                      {bot.description}
                    </Text>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
