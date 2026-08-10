import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-normal capitalize", TONE_CLASSES[tone])}>
      {label.toLowerCase().replaceAll("_", " ")}
    </Badge>
  );
}

const INVOICE_TONE: Record<string, Tone> = {
  PAID: "success",
  PENDING: "neutral",
  PARTIAL: "info",
  OVERDUE: "danger",
  WAIVED: "info",
};

const AVAILABILITY_TONE: Record<string, Tone> = {
  AVAILABLE: "success",
  UNAVAILABLE: "danger",
  MAYBE: "warning",
  NO_RESPONSE: "neutral",
};

const ATTENDANCE_TONE: Record<string, Tone> = {
  PRESENT: "success",
  LATE: "warning",
  EXCUSED: "info",
  ABSENT: "danger",
};

const REGISTRATION_TONE: Record<string, Tone> = {
  COMPLETE: "success",
  IN_PROGRESS: "warning",
  NOT_STARTED: "neutral",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={INVOICE_TONE[status] ?? "neutral"} />;
}

export function AvailabilityStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={AVAILABILITY_TONE[status] ?? "neutral"} />;
}

export function AttendanceStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={ATTENDANCE_TONE[status] ?? "neutral"} />;
}

export function RegistrationStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={REGISTRATION_TONE[status] ?? "neutral"} />;
}

export function CredentialStatusBadge({ expiryDate }: { expiryDate: Date }) {
  const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return <StatusBadge label="Expired" tone="danger" />;
  if (daysLeft < 30) return <StatusBadge label={`Expires in ${daysLeft}d`} tone="warning" />;
  return <StatusBadge label="Valid" tone="success" />;
}
