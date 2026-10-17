import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table";
import { Textarea } from "./textarea";

describe("shadcn primitives", () => {
  it("Button renders a button with variant and size classes and handles clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button variant="destructive" size="sm" className="extra" onClick={onClick}>
        Delete
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button.className).toContain("extra");
    expect(button.className).toContain(buttonVariants({ variant: "destructive", size: "sm" }).split(" ")[0]);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("Button defaults to the default variant and size", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("bg-primary");
  });

  it("buttonVariants resolves every variant", () => {
    for (const variant of ["default", "outline", "secondary", "ghost", "destructive", "link"] as const) {
      expect(buttonVariants({ variant })).toEqual(expect.any(String));
    }
  });

  it("Card renders all its slots", () => {
    render(
      <Card size="sm" data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveAttribute("data-size", "sm");
    for (const slot of ["card-header", "card-title", "card-description", "card-action", "card-content", "card-footer"]) {
      expect(card.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
  });

  it("Card defaults to the default size", () => {
    render(<Card data-testid="card" />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "default");
  });

  it("Table renders all its slots inside a scroll container", () => {
    render(
      <Table aria-label="People">
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1 person</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "People" });
    expect(table.parentElement).toHaveAttribute("data-slot", "table-container");
    for (const slot of ["table-caption", "table-header", "table-body", "table-footer", "table-row", "table-head", "table-cell"]) {
      expect(table.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
  });

  it("Input, Label and Textarea render labelled form controls", async () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" />
      </>,
    );
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("data-slot", "input");
    expect(screen.getByLabelText("Bio")).toHaveAttribute("data-slot", "textarea");
    expect(screen.getByText("Email")).toHaveAttribute("data-slot", "label");
    await userEvent.type(email, "a@b.c");
    expect(email).toHaveValue("a@b.c");
  });
});
