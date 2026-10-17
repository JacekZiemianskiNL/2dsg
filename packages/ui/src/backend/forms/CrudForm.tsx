"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import type { z } from "zod";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import type { ApiResult, FieldErrors } from "../api/types";

export type CrudFieldType = "text" | "email" | "password" | "number" | "url" | "textarea";

export interface CrudField<TName extends string = string> {
  name: TName;
  label: string;
  type?: CrudFieldType;
  placeholder?: string;
  description?: string;
  autoComplete?: string;
}

type ObjectSchema = z.ZodObject;
type FieldName<S extends ObjectSchema> = Extract<keyof z.input<S>, string>;

export interface CrudFormProps<S extends ObjectSchema> {
  /** The same Zod schema the API route validates with. */
  schema: S;
  fields: Array<CrudField<FieldName<S>>>;
  initialValues?: Partial<Record<FieldName<S>, string | number>>;
  /** Called with schema-parsed values; return the `apiCall` result to show server-side errors. */
  onSubmit: (values: z.output<S>) => Promise<ApiResult<unknown> | void>;
  onCancel?: () => void;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
}

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function toRawValues(fields: CrudField[], values: Record<string, string>): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name] ?? "";
    // An empty input means "not provided", so optional fields stay optional.
    if (value === "") continue;
    raw[field.name] = field.type === "number" ? Number(value) : value;
  }
  return raw;
}

/**
 * Schema-driven create/edit form: validates on the client with the shared schema, shows server-returned
 * `fieldErrors` next to their field, and handles loading. Cmd/Ctrl+Enter submits, Escape cancels.
 */
export function CrudForm<S extends ObjectSchema>({
  schema,
  fields,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
}: CrudFormProps<S>) {
  const formId = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, String(initialValues?.[field.name] ?? "")])),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const parsed = schema.safeParse(toRawValues(fields, values));
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const result = await onSubmit(parsed.data);
      if (result && !result.ok) {
        setFieldErrors(result.error.fieldErrors ?? {});
        setFormError(result.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    } else if (event.key === "Escape" && onCancel && !isSubmitting) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} aria-busy={isSubmitting} className="grid gap-4">
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errors = fieldErrors[field.name];
        const describedBy = [field.description && `${inputId}-description`, errors && `${inputId}-error`].filter(Boolean).join(" ");
        const common = {
          id: inputId,
          name: field.name,
          value: values[field.name] ?? "",
          placeholder: field.placeholder,
          disabled: isSubmitting,
          "aria-invalid": errors ? true : undefined,
          "aria-describedby": describedBy || undefined,
        };
        const setValue = (value: string) => setValues((current) => ({ ...current, [field.name]: value }));
        return (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={inputId}>{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea {...common} onChange={(event) => setValue(event.target.value)} />
            ) : (
              <Input
                {...common}
                type={field.type ?? "text"}
                autoComplete={field.autoComplete}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
            {field.description && (
              <p id={`${inputId}-description`} className="text-sm text-muted-foreground">
                {field.description}
              </p>
            )}
            {errors && (
              <p id={`${inputId}-error`} className="text-sm text-destructive">
                {errors.join(" ")}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
