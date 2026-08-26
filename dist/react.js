export { APIRequestError, OpenChatAuthError, OpenChatClient, createOpenChatClient, exchangeForBrowserToken } from './chunk-IF2WR3M5.js';
import * as React2 from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as DialogPrimitive from '@radix-ui/react-dialog';

var OpenChatContext = React2.createContext(null);
function OpenChatProvider({ client, children }) {
  return /* @__PURE__ */ jsx(OpenChatContext.Provider, { value: client, children });
}
function useOpenChatClient() {
  const client = React2.useContext(OpenChatContext);
  if (!client) {
    throw new Error(
      "useOpenChatClient must be used within an <OpenChatProvider>"
    );
  }
  return client;
}
function useAsyncData(fn, deps) {
  const [data, setData] = React2.useState(null);
  const [loading, setLoading] = React2.useState(true);
  const [error, setError] = React2.useState(null);
  const [tick, setTick] = React2.useState(0);
  const refetch = React2.useCallback(() => setTick((t) => t + 1), []);
  React2.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn().then(
      (result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);
  return { data, loading, error, refetch };
}
function useBots(params = {}) {
  const client = useOpenChatClient();
  return useAsyncData(
    () => client.listBots(params),
    [client, params.page, params.limit, params.include_public]
  );
}
function useBot(identifier) {
  const client = useOpenChatClient();
  return useAsyncData(
    () => identifier ? client.getBot(identifier) : Promise.reject(new Error("No identifier")),
    [client, identifier]
  );
}
function useModels() {
  const client = useOpenChatClient();
  return useAsyncData(() => client.listModels({ page: 1, page_size: 300 }), [client]);
}
function useTools() {
  const client = useOpenChatClient();
  return useAsyncData(() => client.listTools({ page: 1, page_size: 400 }), [client]);
}
function useMCPServers() {
  const client = useOpenChatClient();
  return useAsyncData(() => client.listMCPServers(), [client]);
}
function useSaveBot() {
  const client = useOpenChatClient();
  const [saving, setSaving] = React2.useState(false);
  const [error, setError] = React2.useState(null);
  const save = React2.useCallback(
    async (identifier, patch) => {
      setSaving(true);
      setError(null);
      try {
        return await client.updateBot(identifier, patch);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [client]
  );
  return { save, saving, error };
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
var badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0 transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-sm [a&]:hover:bg-destructive/90",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
      ...props
    }
  );
}
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        brand: "bg-brand text-brand-foreground shadow-sm hover:bg-brand/90 hover:shadow-md",
        neutral: "bg-foreground text-background hover:bg-foreground/90"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        neutral: "h-10 px-4 py-2",
        "neutral-sm": "h-9 rounded-md px-3",
        "neutral-lg": "h-11 rounded-md px-8",
        "neutral-icon": "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    }
  );
}

// src/react/ui/typography.ts
var TextTypes = {
  Heading1: "Heading1",
  Heading2: "Heading2",
  Heading3: "Heading3",
  Heading4: "Heading4",
  Heading5: "Heading5",
  Heading6: "Heading6",
  Heading7: "Heading7",
  Body1: "Body1",
  Body2: "Body2",
  Body3: "Body3",
  Body4: "Body4",
  Body5: "Body5",
  Body6: "Body6",
  Body7: "Body7"
};
var textStyleDefinitions = {
  Heading1: { category: "heading", className: "type-heading1", fontFamily: "heading", fontSize: "4rem", desktopFontSize: "5rem", lineHeight: "1.1", fontWeight: "600", defaultTag: "h1" },
  Heading2: { category: "heading", className: "type-heading2", fontFamily: "heading", fontSize: "3.5rem", desktopFontSize: "4rem", lineHeight: "1.1", fontWeight: "600", defaultTag: "h2" },
  Heading3: { category: "heading", className: "type-heading3", fontFamily: "heading", fontSize: "2.5rem", desktopFontSize: "3rem", lineHeight: "1.15", fontWeight: "600", defaultTag: "h3" },
  Heading4: { category: "heading", className: "type-heading4", fontFamily: "heading", fontSize: "2rem", desktopFontSize: "2rem", lineHeight: "1.2", fontWeight: "600", defaultTag: "h4" },
  Heading5: { category: "heading", className: "type-heading5", fontFamily: "heading", fontSize: "1.5rem", fontWeight: "600", defaultTag: "h5" },
  Heading6: { category: "heading", className: "type-heading6", fontFamily: "heading", fontSize: "1.25rem", fontWeight: "600", defaultTag: "h6" },
  Heading7: { category: "heading", className: "type-heading7", fontFamily: "heading", fontSize: "1rem", fontWeight: "600", defaultTag: "h6" },
  Body1: { category: "body", className: "type-body1", fontFamily: "body", fontSize: "2rem", desktopFontSize: "2.5rem", lineHeight: "1.2", fontWeight: "400", defaultTag: "p" },
  Body2: { category: "body", className: "type-body2", fontFamily: "body", fontSize: "1.75rem", desktopFontSize: "2rem", lineHeight: "1.25", fontWeight: "400", defaultTag: "p" },
  Body3: { category: "body", className: "type-body3", fontFamily: "body", fontSize: "1.5rem", fontWeight: "400", defaultTag: "p" },
  Body4: { category: "body", className: "type-body4", fontFamily: "body", fontSize: "1.25rem", fontWeight: "400", defaultTag: "p" },
  Body5: { category: "body", className: "type-body5", fontFamily: "body", fontSize: "1rem", fontWeight: "400", defaultTag: "p" },
  Body6: { category: "body", className: "type-body6", fontFamily: "body", fontSize: "0.8725rem", fontWeight: "400", defaultTag: "p" },
  Body7: { category: "body", className: "type-body7", fontFamily: "body", fontSize: "0.75rem", fontWeight: "400", defaultTag: "p" }
};
var textColorVariants = cva("", {
  variants: {
    color: {
      foreground: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",
      brand: "text-brand",
      success: "text-success",
      inherit: "text-inherit"
    }
  },
  defaultVariants: {
    color: "foreground"
  }
});
var Text = React2.forwardRef(function Text2({
  type = TextTypes.Body5,
  tag,
  bold = false,
  center = false,
  color,
  className,
  children,
  ...props
}, ref) {
  const styleDef = textStyleDefinitions[type];
  const Component = tag ?? styleDef.defaultTag;
  return /* @__PURE__ */ jsx(
    Component,
    {
      ref,
      "data-slot": "text",
      "data-type": type,
      className: cn(
        styleDef.className,
        textColorVariants({ color }),
        bold && "font-bold",
        center && "text-center",
        className
      ),
      ...props,
      children
    }
  );
});
Text.displayName = "Text";
var Card = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("surface-panel text-card-foreground", className),
    ...props
  }
));
Card.displayName = "Card";
var CardHeader = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex flex-col space-y-1.5 p-6", className),
    ...props
  }
));
CardHeader.displayName = "CardHeader";
var CardTitle = React2.forwardRef(({ className, children, color: _color, ...props }, ref) => /* @__PURE__ */ jsx(
  Text,
  {
    ref,
    type: TextTypes.Heading6,
    tag: "h3",
    className: cn("leading-none tracking-tight", className),
    ...props,
    children
  }
));
CardTitle.displayName = "CardTitle";
var CardDescription = React2.forwardRef(({ className, children, color: _color, ...props }, ref) => /* @__PURE__ */ jsx(
  Text,
  {
    ref,
    type: TextTypes.Body6,
    tag: "p",
    color: "muted",
    className,
    ...props,
    children
  }
));
CardDescription.displayName = "CardDescription";
var CardContent = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("p-6 pt-0", className), ...props }));
CardContent.displayName = "CardContent";
var CardFooter = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: cn("flex items-center p-6 pt-0", className),
    ...props
  }
));
CardFooter.displayName = "CardFooter";
function LoadingSpinner({
  size = 24,
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: cn("animate-spin", className),
      ...props,
      children: /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })
    }
  );
}
function CheckIcon({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "3",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props,
      children: /* @__PURE__ */ jsx("path", { d: "M20 6 9 17l-5-5" })
    }
  );
}
function Checkbox({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    CheckboxPrimitive.Root,
    {
      "data-slot": "checkbox",
      className: cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(
        CheckboxPrimitive.Indicator,
        {
          "data-slot": "checkbox-indicator",
          className: "flex items-center justify-center text-current transition-none",
          children: /* @__PURE__ */ jsx(CheckIcon, { className: "size-3.5" })
        }
      )
    }
  );
}
function XIcon({ className, ...props }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props,
      children: [
        /* @__PURE__ */ jsx("path", { d: "M18 6 6 18" }),
        /* @__PURE__ */ jsx("path", { d: "m6 6 12 12" })
      ]
    }
  );
}
function Dialog({
  ...props
}) {
  return /* @__PURE__ */ jsx(DialogPrimitive.Root, { "data-slot": "dialog", ...props });
}
function DialogTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(DialogPrimitive.Trigger, { "data-slot": "dialog-trigger", ...props });
}
function DialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsx(DialogPrimitive.Portal, { "data-slot": "dialog-portal", ...props });
}
function DialogClose({
  ...props
}) {
  return /* @__PURE__ */ jsx(DialogPrimitive.Close, { "data-slot": "dialog-close", ...props });
}
function DialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DialogPrimitive.Overlay,
    {
      "data-slot": "dialog-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function DialogContent({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxs(DialogPortal, { "data-slot": "dialog-portal", children: [
    /* @__PURE__ */ jsx(DialogOverlay, {}),
    /* @__PURE__ */ jsxs(
      DialogPrimitive.Content,
      {
        "data-slot": "dialog-content",
        className: cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        ),
        ...props,
        children: [
          children,
          /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", children: [
            /* @__PURE__ */ jsx(XIcon, {}),
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      }
    )
  ] });
}
function DialogHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "dialog-header",
      className: cn("flex flex-col gap-2 text-center sm:text-left", className),
      ...props
    }
  );
}
function DialogFooter({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "dialog-footer",
      className: cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      ),
      ...props
    }
  );
}
function DialogTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DialogPrimitive.Title,
    {
      "data-slot": "dialog-title",
      className: cn("text-lg leading-none font-semibold", className),
      ...props
    }
  );
}
function DialogDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    DialogPrimitive.Description,
    {
      "data-slot": "dialog-description",
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsx(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "border-input bg-background shadow-xs file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow,background-color] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-4 focus-visible:outline-1 focus-visible:shadow-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ...props
    }
  );
}
var Label = React2.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "label",
  {
    ref,
    "data-slot": "label",
    className: cn(
      "text-foreground flex items-center gap-2 text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    ),
    ...props
  }
));
Label.displayName = "Label";
var Textarea = React2.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "textarea",
      {
        className: cn(
          "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
function asString(value) {
  return typeof value === "string" ? value : "";
}
function asNumberString(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function parseNumber(value) {
  const trimmed = value.trim();
  if (trimmed === "") return void 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : void 0;
}
function formFromBot(bot) {
  const cfg = bot.default_shared_config ?? {};
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
    tools: asStringArray(cfg.tools)
  };
}
function BotEditor({ botUuid, onBack, onSaved, className }) {
  const { data: bot, loading, error } = useBot(botUuid);
  const models = useModels();
  const tools = useTools();
  const { save, saving } = useSaveBot();
  const [form, setForm] = React2.useState(null);
  const [toolInitTexts, setToolInitTexts] = React2.useState({});
  const [statusMessage, setStatusMessage] = React2.useState(null);
  const [modelDialogOpen, setModelDialogOpen] = React2.useState(false);
  const [toolsDialogOpen, setToolsDialogOpen] = React2.useState(false);
  const [customModel, setCustomModel] = React2.useState("");
  React2.useEffect(() => {
    if (bot && form === null) {
      setForm(formFromBot(bot));
      const existingInit = (bot.default_shared_config ?? {}).tool_init;
      const initTexts = {};
      if (existingInit && typeof existingInit === "object") {
        for (const [toolName, initValue] of Object.entries(
          existingInit
        )) {
          initTexts[toolName] = JSON.stringify(initValue, null, 2);
        }
      }
      setToolInitTexts(initTexts);
    }
  }, [bot, form]);
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-8", children: /* @__PURE__ */ jsx(LoadingSpinner, { size: 20 }) });
  }
  if (error) {
    return /* @__PURE__ */ jsx(Card, { className, children: /* @__PURE__ */ jsxs(CardContent, { className: "pt-6", children: [
      /* @__PURE__ */ jsxs(Text, { color: "destructive", children: [
        "Failed to load bot: ",
        error.message
      ] }),
      onBack ? /* @__PURE__ */ jsx(Button, { variant: "outline", className: "mt-4", onClick: onBack, children: "Back" }) : null
    ] }) });
  }
  if (!bot || !form) {
    return null;
  }
  const set = (key, value) => setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  const selectedTools = (tools.data?.rows ?? []).filter(
    (tool) => form.tools.includes(tool.name)
  );
  const toolsRequiringInit = selectedTools.filter((tool) => tool.requires_init);
  const applyModel = (model) => {
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
  const toggleTool = (name) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.tools.includes(name);
      return {
        ...prev,
        tools: has ? prev.tools.filter((t) => t !== name) : [...prev.tools, name]
      };
    });
  };
  const handleSave = async () => {
    setStatusMessage(null);
    const toolInit = {};
    for (const tool of toolsRequiringInit) {
      const raw = (toolInitTexts[tool.name] ?? "").trim();
      if (raw === "") continue;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("must be a JSON object");
        }
        toolInit[tool.name] = parsed;
      } catch (err) {
        setStatusMessage({
          kind: "error",
          text: `Invalid tool_init JSON for "${tool.name}": ${err instanceof Error ? err.message : String(err)}`
        });
        return;
      }
    }
    const config = {
      model: form.model,
      backend: form.backend
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
        default_shared_config: config
      });
      setStatusMessage({ kind: "success", text: "Bot saved." });
      onSaved?.(saved);
    } catch (err) {
      setStatusMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err)
      });
    }
  };
  return /* @__PURE__ */ jsxs(Card, { className, children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Edit bot" }),
        /* @__PURE__ */ jsx(CardDescription, { children: bot.bot_username })
      ] }),
      onBack ? /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: onBack, children: "Back" }) : null
    ] }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col gap-6", children: [
      /* @__PURE__ */ jsxs(Section, { title: "General", children: [
        /* @__PURE__ */ jsx(Field, { label: "Name", children: /* @__PURE__ */ jsx(Input, { value: form.name, onChange: (e) => set("name", e.target.value) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Description", children: /* @__PURE__ */ jsx(
          Textarea,
          {
            value: form.description,
            onChange: (e) => set("description", e.target.value)
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-6", children: [
          /* @__PURE__ */ jsx(
            CheckboxField,
            {
              label: "Public",
              checked: form.is_public,
              onCheckedChange: (v) => set("is_public", v === true)
            }
          ),
          /* @__PURE__ */ jsx(
            CheckboxField,
            {
              label: "Active",
              checked: form.is_active,
              onCheckedChange: (v) => set("is_active", v === true)
            }
          ),
          /* @__PURE__ */ jsx(
            CheckboxField,
            {
              label: "Reasoning",
              checked: form.reasoning,
              onCheckedChange: (v) => set("reasoning", v === true)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Section, { title: "Model", children: [
        /* @__PURE__ */ jsx(Field, { label: "Model", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              value: form.model,
              placeholder: "model id",
              onChange: (e) => set("model", e.target.value)
            }
          ),
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setModelDialogOpen(true), children: "Browse" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsx(Field, { label: "Backend", children: /* @__PURE__ */ jsx(
            Input,
            {
              value: form.backend,
              placeholder: "openai, anthropic, ...",
              onChange: (e) => set("backend", e.target.value)
            }
          ) }),
          /* @__PURE__ */ jsx(Field, { label: "Endpoint (optional)", children: /* @__PURE__ */ jsx(
            Input,
            {
              value: form.endpoint,
              placeholder: "https://...",
              onChange: (e) => set("endpoint", e.target.value)
            }
          ) })
        ] }),
        /* @__PURE__ */ jsx(Field, { label: "System prompt", children: /* @__PURE__ */ jsx(
          Textarea,
          {
            rows: 5,
            value: form.system_prompt,
            onChange: (e) => set("system_prompt", e.target.value)
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx(Section, { title: "Sampling", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Temperature", children: /* @__PURE__ */ jsx(Input, { inputMode: "decimal", value: form.temperature, onChange: (e) => set("temperature", e.target.value) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Top P", children: /* @__PURE__ */ jsx(Input, { inputMode: "decimal", value: form.top_p, onChange: (e) => set("top_p", e.target.value) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Max tokens", children: /* @__PURE__ */ jsx(Input, { inputMode: "numeric", value: form.max_tokens, onChange: (e) => set("max_tokens", e.target.value) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Context", children: /* @__PURE__ */ jsx(Input, { inputMode: "numeric", value: form.context, onChange: (e) => set("context", e.target.value) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Presence penalty", children: /* @__PURE__ */ jsx(Input, { inputMode: "decimal", value: form.presence_penalty, onChange: (e) => set("presence_penalty", e.target.value) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Frequency penalty", children: /* @__PURE__ */ jsx(Input, { inputMode: "decimal", value: form.frequency_penalty, onChange: (e) => set("frequency_penalty", e.target.value) }) })
      ] }) }),
      /* @__PURE__ */ jsxs(Section, { title: "Tools", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-center gap-1", children: form.tools.length === 0 ? /* @__PURE__ */ jsx(Text, { type: "Body6", color: "muted", children: "No tools selected." }) : form.tools.map((name) => /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: name }, name)) }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => setToolsDialogOpen(true), children: "Edit tools" })
        ] }),
        toolsRequiringInit.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
          /* @__PURE__ */ jsx(Text, { type: "Body6", color: "muted", children: "Tool init data (JSON per tool)" }),
          toolsRequiringInit.map((tool) => /* @__PURE__ */ jsx(Field, { label: tool.name, children: /* @__PURE__ */ jsx(
            Textarea,
            {
              rows: 4,
              className: "font-mono text-xs",
              placeholder: "{}",
              value: toolInitTexts[tool.name] ?? "",
              onChange: (e) => setToolInitTexts((prev) => ({
                ...prev,
                [tool.name]: e.target.value
              }))
            }
          ) }, tool.name))
        ] }) : null
      ] })
    ] }),
    /* @__PURE__ */ jsxs(CardFooter, { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx("div", { children: statusMessage ? /* @__PURE__ */ jsx(
        Text,
        {
          type: "Body6",
          color: statusMessage.kind === "error" ? "destructive" : "success",
          children: statusMessage.text
        }
      ) : null }),
      /* @__PURE__ */ jsxs(Button, { onClick: handleSave, disabled: saving, children: [
        saving ? /* @__PURE__ */ jsx(LoadingSpinner, { size: 16 }) : null,
        saving ? "Saving..." : "Save bot"
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: modelDialogOpen, onOpenChange: setModelDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Select a model" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "Choosing a model also fills in its backend and endpoint when known." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            value: customModel,
            placeholder: "Custom model id",
            onChange: (e) => setCustomModel(e.target.value)
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => {
              if (customModel.trim()) {
                set("model", customModel.trim());
                setModelDialogOpen(false);
              }
            },
            children: "Use"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "max-h-72 overflow-y-auto", children: models.loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-6", children: /* @__PURE__ */ jsx(LoadingSpinner, { size: 18 }) }) : /* @__PURE__ */ jsx("ul", { className: "flex flex-col gap-1", children: (models.data?.rows ?? []).map((model) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => applyModel(model),
          className: "hover:bg-accent w-full cursor-pointer rounded-md px-3 py-2 text-left",
          children: [
            /* @__PURE__ */ jsx(Text, { type: "Body6", tag: "span", children: model.title || model.model_id }),
            /* @__PURE__ */ jsxs(Text, { type: "Body7", color: "muted", className: "block", children: [
              model.model_id,
              model.configuration?.backend ? ` \xB7 ${model.configuration.backend}` : ""
            ] })
          ]
        }
      ) }, model.model_id)) }) })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: toolsDialogOpen, onOpenChange: setToolsDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Select tools" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: 'Tools the bot may call. Tools marked "init" need init data below.' })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "max-h-72 overflow-y-auto", children: tools.loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-6", children: /* @__PURE__ */ jsx(LoadingSpinner, { size: 18 }) }) : /* @__PURE__ */ jsx("ul", { className: "flex flex-col gap-1", children: (tools.data?.rows ?? []).map((tool) => {
        const checked = form.tools.includes(tool.name);
        return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("label", { className: "hover:bg-accent flex cursor-pointer items-start gap-3 rounded-md px-3 py-2", children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked,
              onCheckedChange: () => toggleTool(tool.name),
              className: "mt-0.5"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx(Text, { type: "Body6", tag: "span", children: tool.name }),
            tool.requires_init ? /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "ml-2", children: "init" }) : null,
            tool.description ? /* @__PURE__ */ jsx(Text, { type: "Body7", color: "muted", className: "block", children: tool.description }) : null
          ] })
        ] }) }, tool.name);
      }) }) })
    ] }) })
  ] });
}
function assignNumber(config, key, value) {
  const parsed = parseNumber(value);
  if (parsed !== void 0) {
    config[key] = parsed;
  }
}
function Section({ title, children }) {
  return /* @__PURE__ */ jsxs("section", { className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ jsx(Text, { type: "Heading7", color: "muted", children: title }),
    children
  ] });
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
    /* @__PURE__ */ jsx(Label, { children: label }),
    children
  ] });
}
function CheckboxField({
  label,
  checked,
  onCheckedChange
}) {
  return /* @__PURE__ */ jsxs("label", { className: "flex cursor-pointer items-center gap-2", children: [
    /* @__PURE__ */ jsx(Checkbox, { checked, onCheckedChange: (v) => onCheckedChange(v === true) }),
    /* @__PURE__ */ jsx(Text, { type: "Body6", tag: "span", children: label })
  ] });
}
function BotManager({
  includePublic = false,
  onSelectBot,
  onSaved,
  className
}) {
  const { data, loading, error, refetch } = useBots({ include_public: includePublic });
  const [editingBot, setEditingBot] = React2.useState(null);
  if (editingBot) {
    return /* @__PURE__ */ jsx(
      BotEditor,
      {
        botUuid: editingBot.uuid,
        onBack: () => {
          setEditingBot(null);
          refetch();
        },
        onSaved,
        className
      }
    );
  }
  return /* @__PURE__ */ jsxs(Card, { className, children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Bots" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Manage your Open Chat bot configurations." })
      ] }),
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: refetch, children: "Refresh" })
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { children: loading ? /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-8", children: /* @__PURE__ */ jsx(LoadingSpinner, { size: 20 }) }) : error ? /* @__PURE__ */ jsxs(Text, { color: "destructive", children: [
      "Failed to load bots: ",
      error.message
    ] }) : !data || data.rows.length === 0 ? /* @__PURE__ */ jsx(Text, { color: "muted", children: "No bots found." }) : /* @__PURE__ */ jsx("ul", { className: "flex flex-col gap-2", children: data.rows.map((bot) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => {
          setEditingBot(bot);
          onSelectBot?.(bot);
        },
        className: "surface-interactive hover:bg-accent/40 w-full cursor-pointer px-4 py-3 text-left",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsx(Text, { type: "Heading7", tag: "span", children: bot.name }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
              bot.is_public ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "public" }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "private" }),
              !bot.is_active && /* @__PURE__ */ jsx(Badge, { variant: "destructive", children: "inactive" })
            ] })
          ] }),
          bot.description ? /* @__PURE__ */ jsx(Text, { type: "Body6", color: "muted", className: "mt-1 block", children: bot.description }) : null
        ]
      }
    ) }, bot.uuid)) }) })
  ] });
}

export { Badge, BotEditor, BotManager, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Checkbox, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, Input, Label, LoadingSpinner, OpenChatProvider, Text, TextTypes, Textarea, badgeVariants, buttonVariants, cn, textColorVariants, textStyleDefinitions, useAsyncData, useBot, useBots, useMCPServers, useModels, useOpenChatClient, useSaveBot, useTools };
//# sourceMappingURL=react.js.map
//# sourceMappingURL=react.js.map