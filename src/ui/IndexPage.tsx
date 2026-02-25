import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AtlasComponentEntry } from '../types/index.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { SearchBar } from './SearchBar.js';

interface IndexPageProps {
	manifest: AtlasComponentEntry[];
	title: string;
}

interface LazyPreviewProps {
	entry: AtlasComponentEntry;
}

function LazyPreview({ entry }: LazyPreviewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	const [ExampleComponent, setExampleComponent] = useState<(() => ReactNode) | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!visible) return;

		import(/* @vite-ignore */ `/${entry.examplesFile}`)
			.then((mod) => {
				const firstExport = entry.exports[0];
				if (firstExport && mod[firstExport]) {
					setExampleComponent(() => mod[firstExport]);
				}
			})
			.catch((err) => {
				setError(err.message);
			});
	}, [visible, entry]);

	return (
		<div ref={containerRef} className="atlas-card__preview">
			{error ? (
				<div className="atlas-card__preview-error">Failed to load preview</div>
			) : ExampleComponent ? (
				<ErrorBoundary>
					<ExampleComponent />
				</ErrorBoundary>
			) : visible ? (
				<div className="atlas-card__preview-loading">Loading…</div>
			) : null}
		</div>
	);
}

export function IndexPage({ manifest, title }: IndexPageProps) {
	const [search, setSearch] = useState('');
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	const filtered = useMemo(() => {
		if (!search) return manifest;
		const q = search.toLowerCase();
		return manifest.filter((e) => e.name.toLowerCase().includes(q));
	}, [manifest, search]);

	const grouped = useMemo(() => {
		const groups: Record<string, AtlasComponentEntry[]> = {};
		for (const entry of filtered) {
			const group = entry.group || 'Ungrouped';
			if (!groups[group]) groups[group] = [];
			groups[group].push(entry);
		}
		return groups;
	}, [filtered]);

	const toggleGroup = useCallback((group: string) => {
		setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
	}, []);

	return (
		<div className="atlas-index">
			<div className="atlas-index__header">
				<h1 className="atlas-index__title">Atlas — {title}</h1>
				<SearchBar value={search} onChange={setSearch} />
			</div>
			<div className="atlas-index__content">
				{Object.keys(grouped).length === 0 && (
					<div className="atlas-index__empty">
						{search ? 'No components match your search.' : 'No components discovered yet.'}
					</div>
				)}
				{Object.entries(grouped).map(([group, entries]) => (
					<div key={group} className="atlas-group">
						<button
							type="button"
							className="atlas-group__header"
							onClick={() => toggleGroup(group)}
						>
							<span
								className={`atlas-group__toggle ${collapsed[group] ? 'atlas-group__toggle--collapsed' : ''}`}
							>
								▼
							</span>
							<span className="atlas-group__name">{group}</span>
							<span className="atlas-group__count">{entries.length}</span>
						</button>
						{!collapsed[group] && (
							<div className="atlas-group__grid">
								{entries.map((entry) => (
									<a key={entry.slug} className="atlas-card" href={`#/${entry.slug}`}>
										<LazyPreview entry={entry} />
										<div className="atlas-card__info">
											<div className="atlas-card__name">{entry.name}</div>
											<div className="atlas-card__meta">
												{entry.exports.length} example{entry.exports.length !== 1 ? 's' : ''}
											</div>
										</div>
									</a>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
