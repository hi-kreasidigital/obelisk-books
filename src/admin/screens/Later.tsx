import { PageHeader } from '../ui/kit';
export function Later({ title, text, phase }: { title: string; text: string; phase?: string }) {
  return (<><PageHeader title={title} />{phase && <span className="badge bg-orange-tint mb-3">Built in {phase}</span>}<div className="card p-6 text-muted max-w-2xl">{text}</div></>);
}
