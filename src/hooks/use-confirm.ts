import React from "react";

export type ConfirmVariant = "default" | "destructive";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmVariant;
};

type State = {
  open: boolean;
  options: ConfirmOptions | null;
};

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { open: false, options: null };
let pendingResolve: ((value: boolean) => void) | null = null;

function dispatch(next: State) {
  memoryState = next;
  listeners.forEach((listener) => listener(memoryState));
}

function resolveAndClose(result: boolean) {
  const resolve = pendingResolve;
  pendingResolve = null;
  dispatch({ ...memoryState, open: false });
  if (resolve) resolve(result);
}

export function confirmDialog(
  description: string,
  options?: Partial<Omit<ConfirmOptions, "description">>
): Promise<boolean> {
  const opts: ConfirmOptions = {
    title: options?.title ?? "Are you sure?",
    description,
    confirmText: options?.confirmText ?? "Confirm",
    cancelText: options?.cancelText ?? "Cancel",
    variant: options?.variant ?? "destructive",
  };

  // If something else was awaiting a confirm, cancel it.
  if (pendingResolve) {
    resolveAndClose(false);
  }

  dispatch({ open: true, options: opts });

  return new Promise<boolean>((resolve) => {
    pendingResolve = resolve;
  });
}

export function useConfirmDialog() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    confirm: () => resolveAndClose(true),
    cancel: () => resolveAndClose(false),
  };
}
