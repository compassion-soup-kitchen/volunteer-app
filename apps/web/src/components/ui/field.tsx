"use client"

import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/**
 * One form field: its label, control, hint and error, tied together by ids so
 * a screen reader announces the label, whether it's required, the hint and
 * any error when the control takes focus.
 *
 *   <Field error={errors.phone} required>
 *     <FieldLabel>Phone number</FieldLabel>
 *     <FieldControl>
 *       <Input type="tel" value={phone} onChange={...} />
 *     </FieldControl>
 *     <FieldDescription>We only call about shifts.</FieldDescription>
 *     <FieldError />
 *   </Field>
 *
 * The control's id comes from the Field (pass `id` to the Field, not the
 * control), and `aria-invalid` is what turns on the control's invalid styling.
 */
type FieldContextValue = {
  controlId: string
  labelId: string
  descriptionId: string
  errorId: string
  error?: React.ReactNode
  required: boolean
  hasDescription: boolean
  registerDescription: () => () => void
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

function useFieldContext(component: string): FieldContextValue {
  const context = React.useContext(FieldContext)
  if (!context) {
    throw new Error(`<${component}> must be rendered inside a <Field>.`)
  }
  return context
}

function Field({
  id,
  error,
  required = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  /** The control's id. Generated when left out. */
  id?: string
  /** The message to show and announce. Any truthy value marks the field invalid. */
  error?: React.ReactNode
  /** Announces the control as required and marks the label with "*". */
  required?: boolean
}) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId
  const [descriptionCount, setDescriptionCount] = React.useState(0)

  const registerDescription = React.useCallback(() => {
    setDescriptionCount((count) => count + 1)
    return () => setDescriptionCount((count) => count - 1)
  }, [])

  const context = React.useMemo<FieldContextValue>(
    () => ({
      controlId,
      labelId: `${controlId}-label`,
      descriptionId: `${controlId}-description`,
      errorId: `${controlId}-error`,
      error: error || undefined,
      required,
      hasDescription: descriptionCount > 0,
      registerDescription,
    }),
    [controlId, error, required, descriptionCount, registerDescription]
  )

  return (
    <FieldContext.Provider value={context}>
      <div
        data-slot="field"
        data-invalid={context.error ? true : undefined}
        className={cn("space-y-2", className)}
        {...props}
      />
    </FieldContext.Provider>
  )
}

function FieldLabel({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Label>, "htmlFor" | "id">) {
  const { controlId, labelId, required } = useFieldContext("FieldLabel")

  return (
    <Label data-slot="field-label" id={labelId} htmlFor={controlId} {...props}>
      {/* The control carries aria-required, so the star is for sighted eyes
          only. It shares a span with the text so it wraps with the last word. */}
      {required ? (
        <span>
          {children}
          <span aria-hidden="true">{" *"}</span>
        </span>
      ) : (
        children
      )}
    </Label>
  )
}

/** The label's id inside a Field, for controls that name themselves by it. */
function useFieldLabelId(): string | undefined {
  return React.useContext(FieldContext)?.labelId
}

/** The ids and states a control needs; for custom controls that can't take a Slot. */
function useFieldControlProps() {
  const { controlId, descriptionId, errorId, error, required, hasDescription } =
    useFieldContext("FieldControl")

  const describedBy = [error && errorId, hasDescription && descriptionId]
    .filter(Boolean)
    .join(" ")

  return {
    id: controlId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  } as const
}

/**
 * Hands the field's ids and states to the single control inside it - an
 * Input, Textarea, SelectTrigger, Checkbox, or a component that forwards
 * `id` and `aria-*` to its own input.
 */
function FieldControl(props: React.ComponentProps<typeof Slot.Root>) {
  const controlProps = useFieldControlProps()
  return <Slot.Root data-slot="field-control" {...controlProps} {...props} />
}

/**
 * For a field whose answer is a set of buttons (days of the week, areas of
 * interest): a labelled group that carries the field's hint and error.
 * Groups can't be aria-required or aria-invalid, so the error is what says so.
 */
function FieldControlGroup(props: React.ComponentProps<"div">) {
  const { labelId } = useFieldContext("FieldControlGroup")
  const { id, "aria-describedby": describedBy } = useFieldControlProps()

  return (
    <div
      data-slot="field-control-group"
      role="group"
      id={id}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: Omit<React.ComponentProps<"p">, "id">) {
  const { descriptionId, registerDescription } =
    useFieldContext("FieldDescription")

  React.useLayoutEffect(registerDescription, [registerDescription])

  return (
    <p
      data-slot="field-description"
      id={descriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

/** The field's error, announced as it appears. Renders nothing while valid. */
function FieldError({
  className,
  ...props
}: Omit<React.ComponentProps<"p">, "id" | "children">) {
  const { errorId, error } = useFieldContext("FieldError")
  if (!error) return null

  return (
    <p
      data-slot="field-error"
      id={errorId}
      role="alert"
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {error}
    </p>
  )
}

/** The key to the "*" on required labels, for forms that mark them. */
function RequiredFieldsNote({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="required-fields-note"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      Fields marked * are required.
    </p>
  )
}

export {
  Field,
  FieldControl,
  FieldControlGroup,
  FieldDescription,
  FieldError,
  FieldLabel,
  RequiredFieldsNote,
  useFieldControlProps,
  useFieldLabelId,
}
