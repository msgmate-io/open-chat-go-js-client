import * as React from "react";
import type { Bot, BotSharedConfig, Model, Tool } from "../../core/types";
import { useBot, useModels, useSaveBot, useTools } from "../hooks";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Text } from "../ui/text";
import { Textarea } from "../ui/textarea";

export interface BotEditorProps {
  /** Bot UUID (or owner-scoped name) to edit. */
  botUuid: string;
  /** Called to return to the list view. */
  onBack?: () => void;
  /** Called after a successful save. */
  onSaved?: (bot: Bot) => void;
  className?: string;
}

interface EditorForm {
  name: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
  model: string;
  backend: string;
  endpoint: string;
  system_prompt: string;
  temperature: string;
  top_p: string;
  max_tokens: string;
  context: string;
  presence_penalty: string;
  frequency_penalty: string;
  reasoning: boolean;
  tools: string[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumberString(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function formFromBot(bot: Bot): EditorForm {
  const cfg = (bot.default_shared_config ?? {}) as Record<string, unknown>;
  return {
    name: bot.name ?? "",
    description: bot.description ?? "",
    is_public: bot.is_public ?? false,
    is_active: bot.is_active ?? false,
    model: asString(cfg.model),
    backend: asString(cfg.backend),
    endpoint: asString(cfg.endpoint),
    system_prompt: asString(cfg.system_prompt),
    temperature: asNumberString(cfg.temperature),
    top_p: asNumberString(cfg.top_p),
    max_tokens: asNumberString(cfg.max_tokens),
    context: asNumberString(cfg.context),
    presence_penalty: asNumberString(cfg.presence_penalty),
    frequency_penalty: asNumberString(cfg.frequency_penalty),
    reasoning: cfg.reasoning === true,
    tools: asStringArray(cfg.tools),
  };
}

/**
 * Embedded editor for a single bot's metadata and `default_shared_config`.
 * Saves with a single `PATCH /bots/{identifier}` call.
 */
export function BotEditor({ botUuid, onBack, onSaved, className }: BotEditorProps) {
  const { data: bot, loading, error } = useBot(botUuid);
  const models = useModels();
  const tools = useTools();
  const { save, saving } = useSaveBot();

  const [form, setForm] = React.useState<EditorForm | null>(null);
  const [toolInitTexts, setToolInitTexts] = React.useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = React.useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const [modelDialogOpen, setModelDialogOpen] = React.useState(false);
  const [toolsDialogOpen, setToolsDialogOpen] = React.useState(false);
  const [customModel, setCustomModel] = React.useState("");

  React.useEffect(() => {
    if (bot && form === null) {
      setForm(formFromBot(bot));
      const existingInit = ((bot.default_shared_config ?? {}) as Record<string, unknown>)
        .tool_init;
      const initTexts: Record<string, string> = {};
      if (existingInit && typeof existingInit === "object") {
        for (const [toolName, initValue] of Object.entries(
          existingInit as Record<string, unknown>
        )) {
          initTexts[toolName] = JSON.stringify(initValue, null, 2);
        }
      }
      setToolInitTexts(initTexts);
    }
  }, [bot, form]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size={20} />
      </div>
    );
  }
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Text color="destructive">Failed to load bot: {error.message}</Text>
          {onBack ? (
            <Button variant="outline" className="mt-4" onClick={onBack}>
              Back
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }
  if (!bot || !form) {
    return null;
  }

  const set = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const selectedTools: Tool[] = (tools.data?.rows ?? []).filter((tool) =>
    form.tools.includes(tool.name)
  );
  const toolsRequiringInit = selectedTools.filter((tool) => tool.requires_init);

  const applyModel = (model: Model) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, model: model.model_id };
      const backend = model.configuration?.backend;
      const endpoint = model.configuration?.endpoint;
      if (typeof backend === "string" && backend) next.backend = backend;
      if (typeof endpoint === "string" && endpoint) next.endpoint = endpoint;
      return next;
    });
    setModelDialogOpen(false);
  };

  const toggleTool = (name: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.tools.includes(name);
      return {
        ...prev,
        tools: has ? prev.tools.filter((t) => t !== name) : [...prev.tools, name],
      };
    });
  };

  const handleSave = async () => {
    setStatusMessage(null);

    // Build + validate tool_init JSON for the selected tools.
    const toolInit: Record<string, Record<string, unknown>> = {};
    for (const tool of toolsRequiringInit) {
      const raw = (toolInitTexts[tool.name] ?? "").trim();
      if (raw === "") continue;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("must be a JSON object");
        }
        toolInit[tool.name] = parsed as Record<string, unknown>;
      } catch (err) {
        setStatusMessage({
          kind: "error",
          text: `Invalid tool_init JSON for "${tool.name}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        return;
      }
    }

    const config: BotSharedConfig = {
      model: form.model,
      backend: form.backend,
    };
    if (form.endpoint.trim()) config.endpoint = form.endpoint.trim();
    if (form.system_prompt.trim()) config.system_prompt = form.system_prompt;
    assignNumber(config, "temperature", form.temperature);
    assignNumber(config, "top_p", form.top_p);
    assignNumber(config, "max_tokens", form.max_tokens);
    assignNumber(config, "context", form.context);
    assignNumber(config, "presence_penalty", form.presence_penalty);
    assignNumber(config, "frequency_penalty", form.frequency_penalty);
    config.reasoning = form.reasoning;
    config.tools = form.tools;
    if (Object.keys(toolInit).length > 0) {
      config.tool_init = toolInit;
    }

    try {
      const saved = await save(botUuid, {
        name: form.name,
        description: form.description,
        is_public: form.is_public,
        is_active: form.is_active,
        default_shared_config: config,
      });
      setStatusMessage({ kind: "success", text: "Bot saved." });
      onSaved?.(saved);
    } catch (err) {
      setStatusMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Edit bot</CardTitle>
            <CardDescription>{bot.bot_username}</CardDescription>
          </div>
          {onBack ? (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Metadata */}
        <Section title="General">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-6">
            <CheckboxField
              label="Public"
              checked={form.is_public}
              onCheckedChange={(v) => set("is_public", v === true)}
            />
            <CheckboxField
              label="Active"
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v === true)}
            />
            <CheckboxField
              label="Reasoning"
              checked={form.reasoning}
              onCheckedChange={(v) => set("reasoning", v === true)}
            />
          </div>
        </Section>

        {/* Model */}
        <Section title="Model">
          <Field label="Model">
            <div className="flex gap-2">
              <Input
                value={form.model}
                placeholder="model id"
                onChange={(e) => set("model", e.target.value)}
              />
              <Button variant="outline" onClick={() => setModelDialogOpen(true)}>
                Browse
              </Button>
            </div>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Backend">
              <Input
                value={form.backend}
                placeholder="openai, anthropic, ..."
                onChange={(e) => set("backend", e.target.value)}
              />
            </Field>
            <Field label="Endpoint (optional)">
              <Input
                value={form.endpoint}
                placeholder="https://..."
                onChange={(e) => set("endpoint", e.target.value)}
              />
            </Field>
          </div>
          <Field label="System prompt">
            <Textarea
              rows={5}
              value={form.system_prompt}
              onChange={(e) => set("system_prompt", e.target.value)}
            />
          </Field>
        </Section>

        {/* Sampling */}
        <Section title="Sampling">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Temperature">
              <Input inputMode="decimal" value={form.temperature} onChange={(e) => set("temperature", e.target.value)} />
            </Field>
            <Field label="Top P">
              <Input inputMode="decimal" value={form.top_p} onChange={(e) => set("top_p", e.target.value)} />
            </Field>
            <Field label="Max tokens">
              <Input inputMode="numeric" value={form.max_tokens} onChange={(e) => set("max_tokens", e.target.value)} />
            </Field>
            <Field label="Context">
              <Input inputMode="numeric" value={form.context} onChange={(e) => set("context", e.target.value)} />
            </Field>
            <Field label="Presence penalty">
              <Input inputMode="decimal" value={form.presence_penalty} onChange={(e) => set("presence_penalty", e.target.value)} />
            </Field>
            <Field label="Frequency penalty">
              <Input inputMode="decimal" value={form.frequency_penalty} onChange={(e) => set("frequency_penalty", e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* Tools */}
        <Section title="Tools">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {form.tools.length === 0 ? (
                <Text type="Body6" color="muted">
                  No tools selected.
                </Text>
              ) : (
                form.tools.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setToolsDialogOpen(true)}>
              Edit tools
            </Button>
          </div>

          {toolsRequiringInit.length > 0 ? (
            <div className="flex flex-col gap-4">
              <Text type="Body6" color="muted">
                Tool init data (JSON per tool)
              </Text>
              {toolsRequiringInit.map((tool) => (
                <Field key={tool.name} label={tool.name}>
                  <Textarea
                    rows={4}
                    className="font-mono text-xs"
                    placeholder="{}"
                    value={toolInitTexts[tool.name] ?? ""}
                    onChange={(e) =>
                      setToolInitTexts((prev) => ({
                        ...prev,
                        [tool.name]: e.target.value,
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
          ) : null}
        </Section>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <div>
          {statusMessage ? (
            <Text
              type="Body6"
              color={statusMessage.kind === "error" ? "destructive" : "success"}
            >
              {statusMessage.text}
            </Text>
          ) : null}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <LoadingSpinner size={16} /> : null}
          {saving ? "Saving..." : "Save bot"}
        </Button>
      </CardFooter>

      {/* Model picker dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select a model</DialogTitle>
            <DialogDescription>
              Choosing a model also fills in its backend and endpoint when known.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={customModel}
              placeholder="Custom model id"
              onChange={(e) => setCustomModel(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (customModel.trim()) {
                  set("model", customModel.trim());
                  setModelDialogOpen(false);
                }
              }}
            >
              Use
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {models.loading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size={18} />
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {(models.data?.rows ?? []).map((model) => (
                  <li key={model.model_id}>
                    <button
                      type="button"
                      onClick={() => applyModel(model)}
                      className="hover:bg-accent w-full cursor-pointer rounded-md px-3 py-2 text-left"
                    >
                      <Text type="Body6" tag="span">
                        {model.title || model.model_id}
                      </Text>
                      <Text type="Body7" color="muted" className="block">
                        {model.model_id}
                        {model.configuration?.backend
                          ? ` · ${model.configuration.backend}`
                          : ""}
                      </Text>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tools picker dialog */}
      <Dialog open={toolsDialogOpen} onOpenChange={setToolsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select tools</DialogTitle>
            <DialogDescription>
              Tools the bot may call. Tools marked "init" need init data below.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto">
            {tools.loading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size={18} />
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {(tools.data?.rows ?? []).map((tool) => {
                  const checked = form.tools.includes(tool.name);
                  return (
                    <li key={tool.name}>
                      <label className="hover:bg-accent flex cursor-pointer items-start gap-3 rounded-md px-3 py-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTool(tool.name)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <Text type="Body6" tag="span">
                            {tool.name}
                          </Text>
                          {tool.requires_init ? (
                            <Badge variant="outline" className="ml-2">
                              init
                            </Badge>
                          ) : null}
                          {tool.description ? (
                            <Text type="Body7" color="muted" className="block">
                              {tool.description}
                            </Text>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function assignNumber(
  config: BotSharedConfig,
  key: keyof BotSharedConfig,
  value: string
): void {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    (config as Record<string, unknown>)[key as string] = parsed;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Text type="Heading7" color="muted">
        {title}
      </Text>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <Text type="Body6" tag="span">
        {label}
      </Text>
    </label>
  );
}
