import { useNavigate } from "react-router-dom";
import { ThumbsUp, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import useAuthStore from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { itemVariants } from "@/components/page-transition";

const CATEGORY_LABELS = {
  roads: "Roads", bridges: "Bridges", buildings: "Buildings",
  water_supply: "Water Supply", electricity: "Electricity", street_lights: "Street Lights",
  garbage: "Garbage", sewage: "Sewage", drainage: "Drainage",
  dangerous_structures: "Dangerous Structures", open_manholes: "Open Manholes",
  scheme_delays: "Scheme Delays", other: "Other",
};

function ComplaintCard({ complaint, onUpvote }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const hasUpvoted =
    user &&
    complaint.upvotes?.some(
      (id) => id === user._id || id?.toString() === user._id
    );

  return (
    <motion.div variants={itemVariants}>
      <Card
        className="cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-primary/40"
        onClick={() => navigate(`/complaints/${complaint._id}`)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold line-clamp-1">
              {complaint.title}
            </h3>
            <StatusBadge status={complaint.status} />
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <Badge
              variant="secondary"
              className="bg-primary/20 text-primary border-primary/30"
            >
              {CATEGORY_LABELS[complaint.category] || complaint.category}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {complaint.village}
              {complaint.ward ? ` / Ward ${complaint.ward}` : ""}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {complaint.description}
          </p>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpvote?.(complaint._id);
                }}
                className={`gap-1 px-2 py-1 h-auto ${
                  hasUpvoted ? "text-primary bg-primary/10" : "hover:text-primary hover:bg-primary/10"
                }`}
              >
                <ThumbsUp
                  className="h-3.5 w-3.5"
                  fill={hasUpvoted ? "currentColor" : "none"}
                />{" "}
                {complaint.upvoteCount || 0}
              </Button>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />{" "}
                {format(new Date(complaint.createdAt), "dd MMM yyyy")}
              </span>
            </div>
            <span className="text-xs truncate max-w-[120px] text-muted-foreground">
              {complaint.createdBy?.name || "Anonymous"}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ComplaintCard;
