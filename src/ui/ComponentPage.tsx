import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from 'react';
import type { AtlasComponentEntry, AtlasProp } from '../types/index.js';
import { CopyButton } from './CopyButton.js';
import { ExampleCard } from './ExampleCard.js';
import { PropsTable } from './PropsTable.js';
import { Sidebar } from './Sidebar.js';

interface ComponentPageProps {
	entry: AtlasComponentEntry;
	wrapper?: ComponentType<{ children: ReactNode }> | null;
}

interface LoadedExample {
	name: string;
	component: () => ReactNode;
	title?: string;
	description?: string;
	exampleWrapper?: ComponentType<{ children: ReactNode }>;
	order?: number;
}

export function ComponentPage({ entry, wrapper }: ComponentPageProps) {
	const [examples, setExamples] = useState<LoadedExample[]>([]);
	const [sources, setSources] = useState<Record<string, string>>({});
	const [imports, setImports] = useState('');
	const [props, setProps] = useState<AtlasProp[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		setError(null);
		setExamples([]);
		setSources({});
		setImports('');
		setProps([]);

		Promise.all([
			import(/* @vite-ignore */ `/${entry.examplesFile}`),
			import(/* @vite-ignore */ `/@id/__x00__virtual:atlas-source/${entry.slug}`),
			import(/* @vite-ignore */ `/@id/__x00__virtual:atlas-props/${entry.slug}`),
		])
			.then(([examplesMod, sourceMod, propsMod]) => {
				const loaded: LoadedExample[] = [];
				for (const exportName of entry.exports) {
					const ex = examplesMod[exportName];
					if (typeof ex === 'function') {
						loaded.push({
							name: exportName,
							component: ex,
							title: ex.title,
							description: ex.description,
							exampleWrapper: ex.wrapper,
							order: ex.order,
						});
					}
				}
				loaded.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

				setExamples(loaded);
				setSources(sourceMod.sources ?? {});
				setImports(sourceMod.imports ?? '');
				setProps(propsMod.props ?? []);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message);
				setLoading(false);
			});
	}, [entry]);

	const sidebarItems = useMemo(() => {
		const items: { id: string; label: string }[] = [];
		if (props.length > 0) {
			items.push({ id: 'atlas-props', label: 'Props' });
		}
		for (const ex of examples) {
			items.push({
				id: `atlas-example-${ex.name}`,
				label: ex.title ?? deCamelCase(ex.name),
			});
		}
		return items;
	}, [props, examples]);

	const handleDownloadAI = () => {
		let md = `# ${entry.name}\n\n`;
		md += `**Group:** ${entry.group}\n`;
		md += `**File:** ${entry.examplesFile}\n\n`;

		if (imports) {
			md += `## Imports\n\n\`\`\`tsx\n${imports}\n\`\`\`\n\n`;
		}

		if (Object.keys(sources).length > 0) {
			md += `## Examples\n\n`;
			for (const [name, source] of Object.entries(sources)) {
				md += `### ${name}\n\n\`\`\`tsx\n${source}\n\`\`\`\n\n`;
			}
		}

		if (props.length > 0) {
			md += `## Props\n\n`;
			md += `| Name | Type | Required | Default | Description |\n`;
			md += `|------|------|----------|---------|-------------|\n`;
			for (const prop of props) {
				md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default ? `\`${prop.default}\`` : '-'} | ${prop.description || '-'} |\n`;
			}
			md += '\n';
		}

		const blob = new Blob([md], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${entry.slug}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const fullContext = useMemo(() => {
		let md = `# ${entry.name}\n\n`;
		md += `**Group:** ${entry.group}\n`;
		md += `**File:** ${entry.examplesFile}\n\n`;
		if (imports) md += `## Imports\n\n\`\`\`tsx\n${imports}\n\`\`\`\n\n`;
		if (Object.keys(sources).length > 0) {
			md += `## Examples\n\n`;
			for (const [name, source] of Object.entries(sources)) {
				md += `### ${name}\n\n\`\`\`tsx\n${source}\n\`\`\`\n\n`;
			}
		}
		if (props.length > 0) {
			md += `## Props\n\n`;
			md += `| Name | Type | Required | Default | Description |\n`;
			md += `|------|------|----------|---------|-------------|\n`;
			for (const prop of props) {
				md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default ? `\`${prop.default}\`` : '-'} | ${prop.description || '-'} |\n`;
			}
		}
		return md;
	}, [entry, imports, sources, props]);

	if (loading) {
		return (
			<div className="atlas-component-page">
				<div className="atlas-component-page__loading">Loading component…</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="atlas-component-page">
				<a href="#/" className="atlas-component-page__back">
					← Back to Atlas
				</a>
				<div className="atlas-error-card">
					<div className="atlas-error-card__header">⚠️ Failed to load component</div>
					<pre className="atlas-error-card__message">{error}</pre>
				</div>
			</div>
		);
	}

	return (
		<div className="atlas-component-page">
			<div className="atlas-component-page__layout">
				{sidebarItems.length > 0 && <Sidebar items={sidebarItems} />}
				<div className="atlas-component-page__main">
					<a href="#/" className="atlas-component-page__back">
						← Back to Atlas
					</a>
					<h1 className="atlas-component-page__title">{entry.name}</h1>

					{imports && (
						<div className="atlas-component-page__imports">
							<div className="atlas-component-page__imports-header">
								<span>Import</span>
								<CopyButton text={imports} />
							</div>
							<pre className="atlas-component-page__code">
								<code>{imports}</code>
							</pre>
						</div>
					)}

					<div className="atlas-component-page__actions">
						<button type="button" className="atlas-btn" onClick={handleDownloadAI}>
							⬇ Download for AI
						</button>
						<CopyButton text={fullContext} label="Copy Full Context" />
					</div>

					{props.length > 0 && (
						<section id="atlas-props">
							<h2>Props</h2>
							<PropsTable props={props} />
						</section>
					)}

					<section className="atlas-component-page__examples">
						<h2>Examples</h2>
						{examples.map((ex) => (
							<ExampleCard
								key={ex.name}
								id={`atlas-example-${ex.name}`}
								name={ex.name}
								title={ex.title}
								description={ex.description}
								source={sources[ex.name]}
								component={ex.component}
								wrapper={ex.exampleWrapper ?? wrapper}
							/>
						))}
					</section>
				</div>
			</div>
		</div>
	);
}

function deCamelCase(str: string): string {
	return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
}
