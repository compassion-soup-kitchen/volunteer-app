import Link from "next/link";
import { RiArrowRightLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ListCardProps extends Omit<React.ComponentProps<typeof Card>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A quiet link out, top right: "View all", "Log leave". */
  action?: { label: string; href: string };
}

/**
 * ListCard - a titled card whose body is a list: a `BleedList` or
 * `DetailList` of hairline rows, or a `ListCardBody` for anything else (chips,
 * a paragraph, the empty line). The record pages are built from these.
 */
export function ListCard({
  title,
  description,
  action,
  className,
  children,
  ...props
}: ListCardProps) {
  return (
    <Card className={cn("gap-0", className)} {...props}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base group-data-[variant=danger]/card:text-destructive">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? (
          // A ghost button is taller than the title's line; the negative
          // margins centre it on that line instead of hanging below it, and
          // line its label up with the card's right edge.
          <CardAction className="-my-2 -mr-2.5">
            <Button asChild variant="ghost" size="sm">
              <Link href={action.href}>
                {action.label}
                <RiArrowRightLine data-icon="inline-end" />
              </Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      {children}
    </Card>
  );
}

/** A ListCard body that isn't rows: chips, a paragraph, the empty line. */
export function ListCardBody({ className, ...props }: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("border-t border-border pt-3", className)} {...props} />;
}

/** The quiet line a ListCard shows when it has nothing to list. */
export function ListCardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <ListCardBody>
      <p className="text-sm text-muted-foreground">{children}</p>
    </ListCardBody>
  );
}
