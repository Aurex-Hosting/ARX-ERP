import React from 'react';
import {
  Layers,
  ShieldCheck,
  Zap,
  Sparkles,
  Activity,
  Cpu,
  Database,
  Globe,
  Lock,
  Code,
  BarChart,
  Server,
  Star,
  Terminal,
  ExternalLink,
} from 'lucide-react';

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  Layers,
  ShieldCheck,
  Zap,
  Sparkles,
  Activity,
  Cpu,
  Database,
  Globe,
  Lock,
  Code,
  BarChart,
  Server,
  Star,
  Terminal,
};

export interface CustomOverviewWidgetProps {
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  color?: string;
  linkUrl?: string;
  linkText?: string;
  height?: '1/2-raw' | '2/2-raw' | '1/2' | '2/2';
}

export const CustomOverviewWidget: React.FC<CustomOverviewWidgetProps> = ({
  title,
  description,
  icon = 'Layers',
  badge,
  color = '#7c3aed',
  linkUrl,
  linkText,
  height = '2/2-raw',
}) => {
  const IconComponent = ICONS[icon] || Layers;
  const isHalfRow = height === '1/2-raw' || height === '1/2';

  if (isHalfRow) {
    return (
      <div className="h-full min-h-[190px] p-5 rounded-3xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundColor: color }}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                {badge}
              </span>
            )}
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 truncate leading-snug">
              {title}
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {linkUrl && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <a
              href={linkUrl}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              <span>{linkText || 'Learn More'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full min-h-[394px] p-6 md:p-7 rounded-3xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div className="space-y-5">
        {/* Header: Icon & Badge */}
        <div className="flex items-center justify-between">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundColor: color }}
          >
            <IconComponent className="w-7 h-7" />
          </div>

          {badge && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              {badge}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-snug">
            {title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Optional Link Button */}
      {linkUrl && (
        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
          <a
            href={linkUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <span>{linkText || 'Learn More'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
