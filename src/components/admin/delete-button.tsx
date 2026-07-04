"use client";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  id,
  label = "Eliminar",
  confirmText = "¿Eliminar definitivamente? Esta acción no se puede deshacer.",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger">
        {label}
      </Button>
    </form>
  );
}
