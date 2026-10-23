import type { AnchorHTMLAttributes } from 'react';

// Every outbound link opens in a new tab without leaking the opener.
export function ExternalLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}
