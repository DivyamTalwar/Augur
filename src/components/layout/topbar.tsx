import { useLocation } from "react-router-dom";

const SearchIcon = (
  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5l3 3" strokeLinecap="round" />
  </svg>
);

const BellIcon = (
  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}>
    <path d="M4 7a4 4 0 118 0v3l1 1.5H3L4 10V7z" strokeLinejoin="round" />
    <path d="M6.5 13.5h3" strokeLinecap="round" />
  </svg>
);

const HelpIcon = (
  <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}>
    <circle cx="8" cy="8" r="6" />
    <path d="M6.2 6.2c0-1 .8-1.7 1.8-1.7s1.8.7 1.8 1.7c0 1.5-1.8 1.5-1.8 3M8 11h.01" strokeLinecap="round" />
  </svg>
);

function IconBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-2 border border-transparent transition-[background,border-color,color] duration-150 ease-out hover:bg-bg-2 hover:border-line hover:text-ink"
    >
      {children}
    </button>
  );
}

function routeMeta(pathname: string): { root: string; leaf: string } {
  if (pathname.startsWith("/lead/") && pathname !== "/lead") {
    return { root: "Workspace", leaf: "Company Detail" };
  }
  if (pathname.startsWith("/people/") && pathname !== "/people") {
    return { root: "Workspace", leaf: "Person Detail" };
  }
  switch (pathname) {
    case "/lead":
      return { root: "Workspace", leaf: "Companies" };
    case "/people":
      return { root: "Workspace", leaf: "People" };
    case "/prompt":
      return { root: "Workspace", leaf: "Prompt Configuration" };
    case "/scoring":
      return { root: "Workspace", leaf: "Scoring" };
    default:
      return { root: "Workspace", leaf: "Overview" };
  }
}

export function TopBar() {
  const { pathname } = useLocation();
  const { root, leaf } = routeMeta(pathname);

  return (
    <div
      data-tauri-drag-region
      className="relative h-[52px] flex-shrink-0 flex items-center px-6 gap-3.5 border-b border-line"
      style={{
        background:
          "linear-gradient(180deg, var(--color-paper), rgba(255,253,249,0.85))",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-2 text-[13px] text-ink-2">
        <div
          className="grid place-items-center w-[22px] h-[22px] rounded-md text-white font-bold text-[11px]"
          style={{
            background: "linear-gradient(135deg, var(--color-flame), var(--color-flame-2))",
            boxShadow: "0 2px 6px rgba(255,91,31,0.35)",
          }}
        >
          Q
        </div>
        <span className="text-ink-3">{root}</span>
        <span className="text-line-2">/</span>
        <span className="text-ink font-semibold">{leaf}</span>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <IconBtn title="Search">{SearchIcon}</IconBtn>
        <IconBtn title="Notifications">{BellIcon}</IconBtn>
        <IconBtn title="Help">{HelpIcon}</IconBtn>
      </div>
    </div>
  );
}
