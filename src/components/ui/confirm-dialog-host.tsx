import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/use-confirm";

export function ConfirmDialogHost() {
  const { open, options, confirm, cancel } = useConfirmDialog();

  if (!options) return null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancel}>{options.cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className={buttonVariants({ variant: options.variant })}
          >
            {options.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
