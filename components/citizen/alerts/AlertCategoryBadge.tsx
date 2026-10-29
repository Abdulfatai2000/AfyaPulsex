import { TriangleAlert, Lightbulb, Info } from "lucide-react";
import type { AlertCategory } from "@/types/public-alerts";
export const alertCategories={important:{label:"Important",Icon:TriangleAlert},advisory:{label:"Advisory",Icon:Lightbulb},information:{label:"Information",Icon:Info}} as const;
export function AlertCategoryBadge({category}:{category:AlertCategory}){const {label,Icon}=alertCategories[category];return <span className={"al-badge al-"+category}><Icon aria-hidden="true" size={14}/>{label}</span>;}

