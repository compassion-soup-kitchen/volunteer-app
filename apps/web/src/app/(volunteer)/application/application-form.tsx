"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/brand/icon-chip";
import { SignaturePad } from "@/components/signature-pad";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { DatePicker } from "@/components/date-picker";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiUserLine,
  RiAlarmWarningLine,
  RiCalendarLine,
  RiHeartLine,
  RiToolsLine,
  RiShieldCheckLine,
  RiFileListLine,
} from "@remixicon/react";
import { submitApplication, type ApplicationFormData } from "@/lib/application-actions";

type ServiceArea = { id: string; name: string; description: string | null };

const STEPS = [
  { id: "contact", label: "Contact", shortLabel: "Contact", icon: RiUserLine },
  { id: "emergency", label: "Emergency contact", shortLabel: "Emergency", icon: RiAlarmWarningLine },
  { id: "availability", label: "Availability", shortLabel: "Availability", icon: RiCalendarLine },
  { id: "interests", label: "Interests", shortLabel: "Interests", icon: RiHeartLine },
  { id: "skills", label: "Skills", shortLabel: "Skills", icon: RiToolsLine },
  { id: "agreements", label: "Agreements", shortLabel: "Agreements", icon: RiShieldCheckLine },
  { id: "review", label: "Review", shortLabel: "Review", icon: RiFileListLine },
] as const;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const TIME_SLOTS = ["morning", "afternoon", "evening"] as const;

const SKILL_OPTIONS = [
  "Food preparation",
  "Cooking",
  "Food safety / hygiene",
  "First aid",
  "Driving",
  "Te reo Māori",
  "Community work",
  "Social work",
  "Event planning",
  "Gardening",
  "Administration",
  "IT / Technology",
];

interface ApplicationFormProps {
  serviceAreas: ServiceArea[];
}

export function ApplicationForm({ serviceAreas }: ApplicationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [selectedServiceAreas, setSelectedServiceAreas] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [cocSignature, setCocSignature] = useState<string | null>(null);
  const [safeguardingSignature, setSafeguardingSignature] = useState<string | null>(null);
  const [agreedCoc, setAgreedCoc] = useState(false);
  const [agreedSafeguarding, setAgreedSafeguarding] = useState(false);

  // Validation per step
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Contact
        if (!phone.trim()) newErrors.phone = "Phone number is required";
        if (!address.trim()) newErrors.address = "Address is required";
        break;
      case 1: // Emergency
        if (!emergencyContactName.trim()) newErrors.emergencyContactName = "Name is required";
        if (!emergencyContactPhone.trim()) newErrors.emergencyContactPhone = "Phone is required";
        if (!emergencyContactRelationship.trim()) newErrors.emergencyContactRelationship = "Relationship is required";
        break;
      case 2: // Availability
        if (Object.values(availability).every((slots) => slots.length === 0)) {
          newErrors.availability = "Please select at least one time you're available";
        }
        break;
      case 3: // Interests
        if (selectedServiceAreas.length === 0) {
          newErrors.interests = "Please select at least one area of interest";
        }
        break;
      case 4: // Skills — optional, no validation
        break;
      case 5: // Agreements
        if (!agreedCoc) newErrors.coc = "You must agree to the Code of Conduct";
        if (!cocSignature) newErrors.cocSignature = "Please sign the Code of Conduct";
        if (!agreedSafeguarding) newErrors.safeguarding = "You must agree to the Safeguarding Policy";
        if (!safeguardingSignature) newErrors.safeguardingSignature = "Please sign the Safeguarding Policy";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function goBack() {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  function toggleAvailability(day: string, slot: string) {
    setAvailability((prev) => {
      const daySlots = prev[day] || [];
      if (daySlots.includes(slot)) {
        return { ...prev, [day]: daySlots.filter((s) => s !== slot) };
      }
      return { ...prev, [day]: [...daySlots, slot] };
    });
  }

  function toggleServiceArea(id: string) {
    setSelectedServiceAreas((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function handleSubmit() {
    if (!validateStep(currentStep)) return;

    const data: ApplicationFormData = {
      phone,
      address,
      dateOfBirth: dateOfBirth?.toISOString() ?? "",
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      availability,
      serviceAreaIds: selectedServiceAreas,
      skills: selectedSkills,
      bio,
      agreements: [
        { type: "CODE_OF_CONDUCT", signatureData: cocSignature! },
        { type: "SAFEGUARDING", signatureData: safeguardingSignature! },
      ],
    };

    startTransition(async () => {
      const result = await submitApplication(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Application submitted! We'll be in touch soon.");
        router.push("/dashboard");
      }
    });
  }

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="space-y-6">
      {/* Segmented step indicator - numbered steps joined by hairlines */}
      <nav aria-label="Application steps" className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground sm:hidden">
          Step {currentStep + 1} of {STEPS.length}
          {" · "}
          {STEPS[currentStep].label}
        </p>
        <ol className="flex items-center overflow-x-auto pb-1">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <li key={step.id} className="flex shrink-0 items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="mx-1.5 w-3 border-t border-border sm:mx-2 sm:w-5"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    // Allow going back to completed steps
                    if (isDone) {
                      setErrors({});
                      setCurrentStep(i);
                    }
                  }}
                  disabled={i > currentStep}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${step.label}${isDone ? " (completed)" : ""}`}
                  className={`flex items-center gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isDone ? "cursor-pointer" : ""
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tnum transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : isDone
                          ? "border-success/40 text-success"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? <RiCheckLine className="size-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`eyebrow hidden whitespace-nowrap sm:inline ${
                      isActive
                        ? "text-primary"
                        : isDone
                          ? "text-success"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.shortLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconChip tone="brand">
              <StepIcon />
            </IconChip>
            <div>
              <CardTitle>{STEPS[currentStep].label}</CardTitle>
              <CardDescription>{getStepDescription(currentStep)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <StepContact
              phone={phone}
              setPhone={setPhone}
              address={address}
              setAddress={setAddress}
              dateOfBirth={dateOfBirth}
              setDateOfBirth={setDateOfBirth}
              errors={errors}
            />
          )}
          {currentStep === 1 && (
            <StepEmergency
              name={emergencyContactName}
              setName={setEmergencyContactName}
              phone={emergencyContactPhone}
              setPhone={setEmergencyContactPhone}
              relationship={emergencyContactRelationship}
              setRelationship={setEmergencyContactRelationship}
              errors={errors}
            />
          )}
          {currentStep === 2 && (
            <StepAvailability
              availability={availability}
              toggleAvailability={toggleAvailability}
              errors={errors}
            />
          )}
          {currentStep === 3 && (
            <StepInterests
              serviceAreas={serviceAreas}
              selected={selectedServiceAreas}
              toggle={toggleServiceArea}
              errors={errors}
            />
          )}
          {currentStep === 4 && (
            <StepSkills
              selectedSkills={selectedSkills}
              toggleSkill={toggleSkill}
              bio={bio}
              setBio={setBio}
            />
          )}
          {currentStep === 5 && (
            <StepAgreements
              agreedCoc={agreedCoc}
              setAgreedCoc={setAgreedCoc}
              cocSignature={cocSignature}
              setCocSignature={setCocSignature}
              agreedSafeguarding={agreedSafeguarding}
              setAgreedSafeguarding={setAgreedSafeguarding}
              safeguardingSignature={safeguardingSignature}
              setSafeguardingSignature={setSafeguardingSignature}
              errors={errors}
            />
          )}
          {currentStep === 6 && (
            <StepReview
              phone={phone}
              address={address}
              dateOfBirth={dateOfBirth}
              emergencyContactName={emergencyContactName}
              emergencyContactPhone={emergencyContactPhone}
              emergencyContactRelationship={emergencyContactRelationship}
              availability={availability}
              serviceAreas={serviceAreas}
              selectedServiceAreas={selectedServiceAreas}
              selectedSkills={selectedSkills}
              bio={bio}
              hasCocSignature={!!cocSignature}
              hasSafeguardingSignature={!!safeguardingSignature}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation - the submit button is the page's single red CTA */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0 || isPending}
          className="gap-1.5"
        >
          <RiArrowLeftLine className="size-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={goNext}
            className="gap-1.5"
          >
            Next
            <RiArrowRightLine className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <RiCheckLine className="size-4" />
                Submit application
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function getStepDescription(step: number): string {
  switch (step) {
    case 0: return "Let us know how to reach you";
    case 1: return "Someone we can contact in an emergency";
    case 2: return "When are you available to volunteer?";
    case 3: return "What areas of mahi interest you?";
    case 4: return "Tell us about your experience (optional)";
    case 5: return "Please read and sign our agreements";
    case 6: return "Check everything looks right before submitting";
    default: return "";
  }
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
}

// ─── Step Components ─────────────────────────────────

function StepContact({
  phone, setPhone, address, setAddress, dateOfBirth, setDateOfBirth, errors,
}: {
  phone: string; setPhone: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  dateOfBirth: Date | undefined; setDateOfBirth: (v: Date | undefined) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number *</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="021 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <FieldError error={errors.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <AddressAutocomplete
          id="address"
          value={address}
          onChange={setAddress}
        />
        <FieldError error={errors.address} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dob">Date of birth</Label>
        <DatePicker
          id="dob"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          placeholder="Select your date of birth"
          toDate={new Date()}
          fromDate={new Date("1920-01-01")}
        />
        <p className="text-xs text-muted-foreground">
          Optional - helps us match you with appropriate mahi
        </p>
      </div>
    </div>
  );
}

function StepEmergency({
  name, setName, phone, setPhone, relationship, setRelationship, errors,
}: {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  relationship: string; setRelationship: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ec-name">Contact name *</Label>
        <Input
          id="ec-name"
          autoComplete="off"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FieldError error={errors.emergencyContactName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ec-phone">Contact phone *</Label>
        <Input
          id="ec-phone"
          type="tel"
          autoComplete="off"
          placeholder="021 987 6543"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <FieldError error={errors.emergencyContactPhone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ec-relationship">Relationship *</Label>
        <Input
          id="ec-relationship"
          autoComplete="off"
          placeholder="e.g. Partner, Parent, Friend"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        />
        <FieldError error={errors.emergencyContactRelationship} />
      </div>
    </div>
  );
}

function StepAvailability({
  availability, toggleAvailability, errors,
}: {
  availability: Record<string, string[]>;
  toggleAvailability: (day: string, slot: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tap the times you&apos;re generally available. This helps us find the best shifts for you.
      </p>
      <FieldError error={errors.availability} />

      <div className="space-y-2">
        {/* Header row */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-medium text-muted-foreground">
          <div />
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="capitalize">{slot}</div>
          ))}
        </div>

        {/* Day rows */}
        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-4 gap-2 items-center">
            <div className="text-sm font-medium capitalize">{day.slice(0, 3)}</div>
            {TIME_SLOTS.map((slot) => {
              const isSelected = (availability[day] || []).includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleAvailability(day, slot)}
                  className={`flex h-10 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isSelected
                      ? "border-primary/40 bg-primary-tint text-primary-tint-foreground"
                      : "border-input bg-card text-muted-foreground hover:bg-muted"
                  }`}
                  aria-label={`${day} ${slot}`}
                  aria-pressed={isSelected}
                >
                  {isSelected ? <RiCheckLine className="size-4" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepInterests({
  serviceAreas, selected, toggle, errors,
}: {
  serviceAreas: ServiceArea[];
  selected: string[];
  toggle: (id: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose the areas where you&apos;d like to contribute. You can volunteer across multiple areas.
      </p>
      <FieldError error={errors.interests} />

      <div className="grid gap-3 sm:grid-cols-2">
        {serviceAreas.map((area) => {
          const isSelected = selected.includes(area.id);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggle(area.id)}
              aria-pressed={isSelected}
              className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                isSelected
                  ? "border-primary/40 bg-primary-tint"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{area.name}</p>
                  {area.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {area.description}
                    </p>
                  )}
                </div>
                <div
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {isSelected && <RiCheckLine className="size-3" aria-hidden />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepSkills({
  selectedSkills, toggleSkill, bio, setBio,
}: {
  selectedSkills: string[];
  toggleSkill: (skill: string) => void;
  bio: string;
  setBio: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Relevant skills</Label>
        <p className="text-xs text-muted-foreground">
          Select any that apply - don&apos;t worry if none do, all help is welcome
        </p>
        <div className="flex flex-wrap gap-2">
          {SKILL_OPTIONS.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                aria-pressed={isSelected}
                className="group rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer transition-colors group-hover:text-primary"
                >
                  {isSelected && <RiCheckLine className="mr-1 size-3" aria-hidden />}
                  {skill}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          placeholder="Tell us a bit about yourself - why you'd like to volunteer, any experience you have, or anything else you'd like us to know..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">Optional</p>
      </div>
    </div>
  );
}

function StepAgreements({
  agreedCoc, setAgreedCoc, cocSignature, setCocSignature,
  agreedSafeguarding, setAgreedSafeguarding, safeguardingSignature, setSafeguardingSignature,
  errors,
}: {
  agreedCoc: boolean; setAgreedCoc: (v: boolean) => void;
  cocSignature: string | null; setCocSignature: (v: string | null) => void;
  agreedSafeguarding: boolean; setAgreedSafeguarding: (v: boolean) => void;
  safeguardingSignature: string | null; setSafeguardingSignature: (v: string | null) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-8">
      {/* Code of Conduct */}
      <div className="space-y-4">
        <div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            Te Tikanga · Code of Conduct
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Our Code of Conduct guides how we work together as whānau
          </p>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">
          <p className="mb-3">As a volunteer at Compassion Soup Kitchen | Te Pūaroha, I agree to:</p>
          <ul className="space-y-2 pl-4 list-disc">
            <li>Treat all people with aroha (love), manaakitanga (hospitality), and respect</li>
            <li>Maintain confidentiality about the people we serve</li>
            <li>Follow health and safety guidelines at all times</li>
            <li>Arrive on time for scheduled shifts and notify coordinators of absences</li>
            <li>Respect the property and resources of the organisation</li>
            <li>Work cooperatively with other volunteers, staff, and coordinators</li>
            <li>Represent Compassion Soup Kitchen positively in the community</li>
            <li>Report any concerns about safety or welfare to a coordinator</li>
          </ul>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-coc"
            checked={agreedCoc}
            onCheckedChange={(checked) => setAgreedCoc(checked === true)}
          />
          <Label htmlFor="agree-coc" className="text-sm leading-snug">
            I have read and agree to follow the Code of Conduct *
          </Label>
        </div>
        <FieldError error={errors.coc} />

        {agreedCoc && (
          <>
            <SignaturePad
              onSignatureChange={setCocSignature}
              initialValue={cocSignature}
              label="Sign the Code of Conduct"
            />
            <FieldError error={errors.cocSignature} />
          </>
        )}
      </div>

      {/* Safeguarding */}
      <div className="space-y-4">
        <div>
          <h3 className="font-serif text-lg font-medium tracking-tight">
            Safeguarding Policy
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Protecting the safety and wellbeing of everyone in our community
          </p>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">
          <p className="mb-3">As a volunteer, I understand and commit to:</p>
          <ul className="space-y-2 pl-4 list-disc">
            <li>Acting in the best interests of all tamariki (children) and vulnerable people</li>
            <li>Never being alone with a child or vulnerable person in an unsupervised setting</li>
            <li>Reporting any concerns about abuse or neglect to a coordinator immediately</li>
            <li>Completing a Ministry of Justice (MOJ) check if required</li>
            <li>Maintaining appropriate boundaries with all people we serve</li>
            <li>Not using personal devices to photograph or record people we serve</li>
            <li>Understanding that breaches of this policy may result in immediate removal</li>
          </ul>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-safeguarding"
            checked={agreedSafeguarding}
            onCheckedChange={(checked) => setAgreedSafeguarding(checked === true)}
          />
          <Label htmlFor="agree-safeguarding" className="text-sm leading-snug">
            I have read and agree to the Safeguarding Policy *
          </Label>
        </div>
        <FieldError error={errors.safeguarding} />

        {agreedSafeguarding && (
          <>
            <SignaturePad
              onSignatureChange={setSafeguardingSignature}
              initialValue={safeguardingSignature}
              label="Sign the Safeguarding Policy"
            />
            <FieldError error={errors.safeguardingSignature} />
          </>
        )}
      </div>
    </div>
  );
}

function StepReview({
  phone, address, dateOfBirth,
  emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
  availability, serviceAreas, selectedServiceAreas, selectedSkills, bio,
  hasCocSignature, hasSafeguardingSignature,
}: {
  phone: string; address: string; dateOfBirth: Date | undefined;
  emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelationship: string;
  availability: Record<string, string[]>;
  serviceAreas: ServiceArea[];
  selectedServiceAreas: string[];
  selectedSkills: string[];
  bio: string;
  hasCocSignature: boolean;
  hasSafeguardingSignature: boolean;
}) {
  const selectedAreaNames = serviceAreas
    .filter((a) => selectedServiceAreas.includes(a.id))
    .map((a) => a.name);

  const availableDays = Object.entries(availability)
    .filter(([, slots]) => slots.length > 0)
    .map(([day, slots]) => `${day.charAt(0).toUpperCase() + day.slice(1, 3)}: ${slots.join(", ")}`);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Please review your details below. You can go back to any step to make changes.
      </p>

      <ReviewSection title="Contact details">
        <ReviewField label="Phone" value={phone} />
        <ReviewField label="Address" value={address} />
        <ReviewField label="Date of birth" value={dateOfBirth ? dateOfBirth.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" }) : "Not provided"} />
      </ReviewSection>

      <ReviewSection title="Emergency contact">
        <ReviewField label="Name" value={emergencyContactName} />
        <ReviewField label="Phone" value={emergencyContactPhone} />
        <ReviewField label="Relationship" value={emergencyContactRelationship} />
      </ReviewSection>

      <ReviewSection title="Availability">
        {availableDays.length > 0 ? (
          <div className="space-y-1">
            {availableDays.map((d) => (
              <p key={d} className="text-sm">{d}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None selected</p>
        )}
      </ReviewSection>

      <ReviewSection title="Interests">
        <div className="flex flex-wrap gap-1.5">
          {selectedAreaNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      </ReviewSection>

      <ReviewSection title="Skills & about">
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedSkills.map((skill) => (
              <Badge key={skill} variant="outline">{skill}</Badge>
            ))}
          </div>
        )}
        <ReviewField label="About" value={bio || "Not provided"} />
      </ReviewSection>

      <ReviewSection title="Agreements">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {hasCocSignature ? (
              <RiCheckLine className="size-4 text-success" aria-hidden />
            ) : (
              <RiCloseLine className="size-4 text-destructive" aria-hidden />
            )}
            Code of Conduct · {hasCocSignature ? "Signed" : "Not signed"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {hasSafeguardingSignature ? (
              <RiCheckLine className="size-4 text-success" aria-hidden />
            ) : (
              <RiCloseLine className="size-4 text-destructive" aria-hidden />
            )}
            Safeguarding Policy · {hasSafeguardingSignature ? "Signed" : "Not signed"}
          </div>
        </div>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <h3 className="eyebrow mb-3 text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="text-sm font-medium text-muted-foreground min-w-[120px]">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
