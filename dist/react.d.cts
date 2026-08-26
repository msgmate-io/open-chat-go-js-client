import { OpenChatClient, UpdateBotRequest, Bot, ListBotsParams, ListedBotsPage, MCPServersResponse, ModelsPage, ToolsPage } from './index.cjs';
export { APIRequestError, BrowserTokenProvider, ClientAuth, OpenChatAuthError, OpenChatClientOptions, ParentTokenAuth, createOpenChatClient, exchangeForBrowserToken } from './index.cjs';
import * as React from 'react';
import { ClassValue } from 'clsx';
import * as class_variance_authority_types from 'class-variance-authority/types';
import { VariantProps } from 'class-variance-authority';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface OpenChatProviderProps {
    client: OpenChatClient;
    children: React.ReactNode;
}
/**
 * Provides an {@link OpenChatClient} to the embedded Open Chat components and
 * hooks. Create the client once (e.g. with `createOpenChatClient`) and pass it
 * here.
 */
declare function OpenChatProvider({ client, children }: OpenChatProviderProps): React.JSX.Element;
/** Access the {@link OpenChatClient} from context. */
declare function useOpenChatClient(): OpenChatClient;

interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}
/**
 * Minimal data-fetching hook (no external data library). Runs `fn`, tracks
 * loading/error/data, and exposes `refetch`. Re-runs when `deps` change.
 */
declare function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T>;
/** List the caller's bots (optionally including public bots). */
declare function useBots(params?: ListBotsParams): AsyncState<ListedBotsPage>;
/** Fetch a single bot by UUID or owner-scoped name. */
declare function useBot(identifier: string | null): AsyncState<Bot>;
/** Model catalog for populating the model picker. */
declare function useModels(): AsyncState<ModelsPage>;
/** Tool catalog for populating the tools picker. */
declare function useTools(): AsyncState<ToolsPage>;
/** MCP server catalog for populating integrations. */
declare function useMCPServers(): AsyncState<MCPServersResponse>;
interface SaveBotState {
    save: (identifier: string, patch: UpdateBotRequest) => Promise<Bot>;
    saving: boolean;
    error: Error | null;
}
/** Mutation hook for updating a bot (metadata + default_shared_config). */
declare function useSaveBot(): SaveBotState;

interface BotManagerProps {
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
declare function BotManager({ includePublic, onSelectBot, onSaved, className, }: BotManagerProps): React.JSX.Element;

interface BotEditorProps {
    /** Bot UUID (or owner-scoped name) to edit. */
    botUuid: string;
    /** Called to return to the list view. */
    onBack?: () => void;
    /** Called after a successful save. */
    onSaved?: (bot: Bot) => void;
    className?: string;
}
/**
 * Embedded editor for a single bot's metadata and `default_shared_config`.
 * Saves with a single `PATCH /bots/{identifier}` call.
 */
declare function BotEditor({ botUuid, onBack, onSaved, className }: BotEditorProps): React.JSX.Element | null;

declare function cn(...inputs: ClassValue[]): string;

declare const buttonVariants: (props?: ({
    variant?: "link" | "default" | "secondary" | "destructive" | "outline" | "ghost" | "brand" | "neutral" | null | undefined;
    size?: "default" | "neutral" | "sm" | "lg" | "icon" | "neutral-sm" | "neutral-lg" | "neutral-icon" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}): React.JSX.Element;

declare function Input({ className, type, ...props }: React.ComponentProps<"input">): React.JSX.Element;

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
}
declare const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>;

/**
 * Typography scale (vendored from @open-chat-go/ui).
 * CSS classes live in src/styles/globals.css.
 */
declare const TextTypes: {
    readonly Heading1: "Heading1";
    readonly Heading2: "Heading2";
    readonly Heading3: "Heading3";
    readonly Heading4: "Heading4";
    readonly Heading5: "Heading5";
    readonly Heading6: "Heading6";
    readonly Heading7: "Heading7";
    readonly Body1: "Body1";
    readonly Body2: "Body2";
    readonly Body3: "Body3";
    readonly Body4: "Body4";
    readonly Body5: "Body5";
    readonly Body6: "Body6";
    readonly Body7: "Body7";
};
type TextType = keyof typeof TextTypes;
type TextStyleCategory = "heading" | "body";
type TextTag = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "li" | "label" | "span" | "strong" | "div";
type TextColor = "foreground" | "muted" | "primary" | "destructive" | "brand" | "success" | "inherit";
interface TextStyleDefinition {
    category: TextStyleCategory;
    className: string;
    fontFamily: "heading" | "body";
    fontSize: string;
    desktopFontSize?: string;
    lineHeight?: string;
    fontWeight: string;
    defaultTag: TextTag;
}
declare const textStyleDefinitions: Record<TextType, TextStyleDefinition>;

declare const textColorVariants: (props?: ({
    color?: "destructive" | "inherit" | "brand" | "foreground" | "muted" | "primary" | "success" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
interface TextProps extends Omit<React.HTMLAttributes<HTMLElement>, "color">, VariantProps<typeof textColorVariants> {
    type?: TextType;
    tag?: TextTag;
    bold?: boolean;
    center?: boolean;
}
declare const Text: React.ForwardRefExoticComponent<TextProps & React.RefAttributes<HTMLElement>>;

declare const Card: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardHeader: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardTitle: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>>;
declare const CardDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>;
declare const CardContent: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
declare const CardFooter: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;

declare const badgeVariants: (props?: ({
    variant?: "default" | "secondary" | "destructive" | "outline" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Badge({ className, variant, asChild, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
}): React.JSX.Element;

declare const Label: React.ForwardRefExoticComponent<React.LabelHTMLAttributes<HTMLLabelElement> & React.RefAttributes<HTMLLabelElement>>;

declare function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>): React.JSX.Element;

declare function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>): React.JSX.Element;
declare function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>): React.JSX.Element;
declare function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>): React.JSX.Element;
declare function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>): React.JSX.Element;
declare function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>): React.JSX.Element;
declare function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>): React.JSX.Element;
declare function DialogHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function DialogFooter({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element;
declare function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element;

interface LoadingSpinnerProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
}
declare function LoadingSpinner({ size, className, ...props }: LoadingSpinnerProps): React.JSX.Element;

export { type AsyncState, Badge, BotEditor, type BotEditorProps, BotManager, type BotManagerProps, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Checkbox, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, Input, Label, LoadingSpinner, type LoadingSpinnerProps, OpenChatClient, OpenChatProvider, type OpenChatProviderProps, type SaveBotState, Text, type TextColor, type TextProps, type TextTag, type TextType, TextTypes, Textarea, type TextareaProps, badgeVariants, buttonVariants, cn, textColorVariants, textStyleDefinitions, useAsyncData, useBot, useBots, useMCPServers, useModels, useOpenChatClient, useSaveBot, useTools };
