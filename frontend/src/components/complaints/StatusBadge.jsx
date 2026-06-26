import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  pending: { variant: "secondary" },
  approved: { variant: "secondary" },
  rejected: { variant: "destructive" },
  in_progress: { variant: "secondary" },
  resolved: { variant: "default" },
  citizen_verification_pending: { variant: "outline" },
  awaiting_citizen_response: { variant: "outline" },
  reopened: { variant: "destructive" },
  closed: { variant: "outline" },
};

function StatusBadge({ status }) {
  const label = status
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const style = STATUS_STYLES[status] || { variant: "secondary" };

  return (
    <Badge variant={style.variant}>
      {label}
    </Badge>
  );
}

export default StatusBadge;
