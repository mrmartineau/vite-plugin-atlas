import { useEffect, useRef, useState } from 'react';

interface SidebarItem {
	id: string;
	label: string;
}

interface SidebarProps {
	items: SidebarItem[];
}

export function Sidebar({ items }: SidebarProps) {
	const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
	const observerRef = useRef<IntersectionObserver | null>(null);

	useEffect(() => {
		observerRef.current?.disconnect();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				}
			},
			{ rootMargin: '-80px 0px -60% 0px', threshold: 0 },
		);
		observerRef.current = observer;

		for (const item of items) {
			const el = document.getElementById(item.id);
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	}, [items]);

	return (
		<nav className="atlas-sidebar">
			<ul className="atlas-sidebar__list">
				{items.map((item) => (
					<li key={item.id}>
						<a
							className={`atlas-sidebar__link ${activeId === item.id ? 'atlas-sidebar__link--active' : ''}`}
							href={`#${item.id}`}
							onClick={(e) => {
								e.preventDefault();
								document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
							}}
						>
							{item.label}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
