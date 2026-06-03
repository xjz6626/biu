import type { RecommendItemBadge } from "./types";

const BADGE_LABEL_MAP: Record<RecommendItemBadge, string> = {
  followedUp: "关注UP",
  vocaloid: "V·U",
};

const BADGE_CLASS_MAP: Record<RecommendItemBadge, string> = {
  followedUp: "border-emerald-400/30 bg-emerald-400/10 text-emerald-500 dark:text-emerald-300",
  vocaloid: "border-violet-400/30 bg-violet-400/10 text-violet-500 dark:text-violet-300",
};

interface TitleWithBadgesProps {
  badges?: RecommendItemBadge[];
  title: string;
}

const TitleWithBadges = ({ badges = [], title }: TitleWithBadgesProps) => {
  if (!badges.length) return title;

  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 align-middle">
      <span className="min-w-0 truncate">{title}</span>
      {badges.map(badge => (
        <span
          key={badge}
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none ${BADGE_CLASS_MAP[badge]}`}
        >
          {BADGE_LABEL_MAP[badge]}
        </span>
      ))}
    </span>
  );
};

export default TitleWithBadges;
