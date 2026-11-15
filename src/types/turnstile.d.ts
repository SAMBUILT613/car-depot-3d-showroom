interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  [key: string]: unknown;
}

interface Window {
  turnstile?: {
    render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
  };
}
