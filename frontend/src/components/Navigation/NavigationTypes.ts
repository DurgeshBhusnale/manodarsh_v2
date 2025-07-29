export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavigationItem[];
  roles?: ('admin' | 'soldier')[];
  isActive?: boolean;
  isExpanded?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface NavigationContextType {
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
}