"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

type State = { error?: string; ok?: string } | undefined;

/** Formulaire relié à une Server Action, avec affichage accessible des erreurs et état d'envoi. */
export function ActionForm({ action, children, className, encType }: {
  action: (state: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  encType?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} encType={encType}>
      {state?.error && <div role="alert" className="mb-4 rounded-lg border-l-4 border-red-700 bg-red-50 p-4 text-sm">{state.error}</div>}
      {state?.ok && <div role="status" className="mb-4 rounded-lg border-l-4 border-green-700 bg-green-50 p-4 text-sm">{state.ok}</div>}
      {children}
    </form>
  );
}

export function SubmitButton({ children, className = "btn btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} aria-busy={pending}>{pending ? "Envoi…" : children}</button>;
}
