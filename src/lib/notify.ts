import { toast } from "@/hooks/use-toast";

export type NotifyVariant = "default" | "destructive";

type NotifyOptions = {
  title?: string;
  variant?: NotifyVariant;
  /** Override toast auto-dismiss duration (ms). */
  duration?: number;
};

const inferVariant = (message: string): NotifyVariant => {
  const m = message.trim().toLowerCase();
  if (!m) return "default";

  // Most legacy alert() usages are validation/errors; treat common prefixes as destructive.
  if (
    m.startsWith("please ") ||
    m.startsWith("failed") ||
    m.startsWith("error") ||
    m.startsWith("could not") ||
    m.includes("fail") ||
    m.includes("unable")
  ) {
    return "destructive";
  }

  return "default";
};

export function notify(message: string, options?: NotifyOptions) {
  const text = String(message ?? "").trim();
  if (!text) return;

  const variant = options?.variant ?? inferVariant(text);
  const duration =
    options?.duration ?? (variant === "destructive" ? 6500 : 4500);

  toast({
    title: options?.title ?? (variant === "destructive" ? "Action required" : undefined),
    description: text,
    variant,
    duration,
  });
}

export function notifyError(message: string, title = "Action required") {
  notify(message, { title, variant: "destructive" });
}

export function notifySuccess(message: string, title = "Done") {
  notify(message, { title, variant: "default" });
}
