import { Fragment, type ReactNode } from 'react';
import { richParts, splitTemplate } from '../lib/i18n';

/** A translated string with **bold** parts (lib/i18n richParts). */
export function Rich({ text, boldClass }: { text: string; boldClass?: string }) {
  return <>{richParts(text).map((p, i) => (p.bold ? <b key={i} className={boldClass}>{p.text}</b> : <Fragment key={i}>{p.text}</Fragment>))}</>;
}

/** A translated template with elements in its {placeholders} (lib/i18n splitTemplate), e.g. a no-wrap date. */
export function Fill({ template, nodes }: { template: string; nodes: Record<string, ReactNode> }) {
  return <>{splitTemplate(template).map((p, i) => <Fragment key={i}>{typeof p === 'string' ? p : nodes[p.key]}</Fragment>)}</>;
}
