import type { SidebarLanguage } from '../i18n/sidebar';
import {
  getSidebarMenuLabel,
  type SidebarMenuItem,
} from '../hooks/useSidebarMenu';

const MENU_ICON_COLOR = 'rgba(220, 221, 222, 1)';

function SvgIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-5 w-5"
      onError={(e) => {
        (e.target as HTMLImageElement).setAttribute('data-error', '1');
      }}
    />
  );
}

export function SidebarMenuItemIcon({
  item,
  language,
  collapsed = false,
}: {
  item: SidebarMenuItem;
  language: SidebarLanguage;
  collapsed?: boolean;
}) {
  const label = getSidebarMenuLabel(item.labels, language);
  const opacityClass = collapsed
    ? 'transition-opacity duration-200 opacity-60 group-hover:opacity-100'
    : 'transition-opacity duration-200 opacity-60 group-hover:opacity-100';

  if (item.icon_type === 'emoji' && item.icon_value) {
    return <span className={collapsed ? 'text-lg' : 'text-base'}>{item.icon_value}</span>;
  }

  if (item.icon_type === 'image' && item.icon_value) {
    return (
      <div className={opacityClass}>
        <SvgIcon src={item.icon_value} alt={label} />
      </div>
    );
  }

  if (item.icon_type === 'iconify' && item.icon_value) {
    return (
      <span
        className={`iconify ${opacityClass}`}
        data-icon={item.icon_value}
        aria-hidden="true"
        style={{
          fontSize: item.slug === 'coupon' ? '23px' : '20px',
          color: MENU_ICON_COLOR,
        }}
      />
    );
  }

  return null;
}

export function getSidebarMenuItemHref(item: SidebarMenuItem): string {
  if (item.link_tipo === 'href') return item.href || '#';
  if (item.link_tipo === 'external') return item.action_value || '#';
  if (item.link_tipo === 'game') return '#';
  if (item.link_tipo === 'event') return '#';
  return '#';
}

export { MENU_ICON_COLOR };
