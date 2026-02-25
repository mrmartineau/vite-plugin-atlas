import type { ComponentType, ReactNode } from 'react';
import { CopyButton } from './CopyButton.js';
import { ErrorBoundary } from './ErrorBoundary.js';

interface ExampleCardProps {
	name: string;
	title?: string;
	description?: string;
	source?: string;
	component: () => ReactNode;
	wrapper?: ComponentType<{ children: ReactNode }> | null;
	id: string;
}

function deCamelCase(str: string): string {
	return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
}

export function ExampleCard({
	name,
	title,
	description,
	source,
	component: ExampleComponent,
	wrapper: Wrapper,
	id,
}: ExampleCardProps) {
	const displayTitle = title ?? deCamelCase(name);
	const rendered = <ExampleComponent />;

	return (
		<div className="atlas-example-card" id={id}>
			<div className="atlas-example-card__header">
				<h3 className="atlas-example-card__title">{displayTitle}</h3>
			</div>
			{description && <p className="atlas-example-card__description">{description}</p>}
			<div className="atlas-example-card__preview">
				<ErrorBoundary>{Wrapper ? <Wrapper>{rendered}</Wrapper> : rendered}</ErrorBoundary>
			</div>
			{source && (
				<div className="atlas-example-card__source">
					<div className="atlas-example-card__source-header">
						<span>Source</span>
						<CopyButton text={source} />
					</div>
					<pre className="atlas-example-card__code">
						<code>{source}</code>
					</pre>
				</div>
			)}
		</div>
	);
}
