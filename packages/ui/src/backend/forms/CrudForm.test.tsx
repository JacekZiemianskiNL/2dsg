import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ApiResult } from "../api/types";
import { CrudForm, type CrudField } from "./CrudForm";

const schema = z.object({
  name: z.string({ error: "Name is required" }).min(2, "Name is too short"),
  rate: z.number({ error: "Rate is required" }).positive("Rate must be positive"),
  bio: z.string().optional(),
});
const fields: Array<CrudField<"name" | "rate" | "bio">> = [
  { name: "name", label: "Name" },
  { name: "rate", label: "Hourly rate", type: "number" },
  { name: "bio", label: "Bio", type: "textarea", description: "Optional" },
];

function setup(onSubmit = vi.fn(async (): Promise<ApiResult<unknown> | void> => undefined), onCancel = vi.fn()) {
  const user = userEvent.setup();
  render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);
  return { user, onSubmit, onCancel };
}

describe("CrudForm", () => {
  it("renders a labelled control per field", () => {
    setup();
    expect(screen.getByLabelText("Name")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hourly rate")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Bio").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Bio")).toHaveAccessibleDescription("Optional");
  });

  it("validates with the schema on the client and does not submit invalid input", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Name"), "A");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Name is too short");
    expect(screen.getByText("Rate is required")).toBeInTheDocument();
  });

  it("submits schema-parsed values (numbers coerced, empty optional fields omitted)", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", rate: 80 });
  });

  it("shows server-returned fieldErrors next to the field and the message as a form error", async () => {
    const onSubmit = vi.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 400,
      error: { code: "validation_failed", message: "Please fix the highlighted fields", fieldErrors: { name: ["Name already taken"] } },
    }));
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please fix the highlighted fields");
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Name already taken");
  });

  it("disables the form while submitting", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    finish();
    expect(await screen.findByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("submits on Ctrl/Cmd+Enter and cancels on Escape", async () => {
    const { user, onSubmit, onCancel } = setup();
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledOnce();
    await user.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("prefills initial values", () => {
    render(<CrudForm schema={schema} fields={fields} initialValues={{ name: "Ada", rate: 80 }} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Hourly rate")).toHaveValue(80);
  });

  it("ignores a submit while one is already in flight", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    const form = screen.getByRole("button", { name: "Save" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledOnce();
    finish();
    await screen.findByRole("button", { name: "Save" });
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    finish();
    await screen.findByRole("button", { name: "Save" });
  });

  it("shows a server error without field errors as a form error only", async () => {
    const onSubmit = vi.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 409,
      error: { code: "conflict", message: "That name is taken" },
    }));
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That name is taken");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });

  it("submits textarea input and ignores Escape without onCancel", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Hourly rate"), "80");
    await user.type(screen.getByLabelText("Bio"), "Mentor");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", rate: 80, bio: "Mentor" });
  });
});
