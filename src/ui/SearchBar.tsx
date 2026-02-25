interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
	return (
		<div className="atlas-search">
			<span className="atlas-search__icon">🔍</span>
			<input
				className="atlas-search__input"
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Search components..."
			/>
			{value && (
				<button
					type="button"
					className="atlas-search__clear"
					onClick={() => onChange('')}
					title="Clear search"
				>
					✕
				</button>
			)}
		</div>
	);
}
