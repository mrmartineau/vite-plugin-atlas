import { useCallback, useRef, useState } from 'react';

interface CopyButtonProps {
	text: string;
	className?: string;
	label?: string;
}

export function CopyButton({ text, className, label }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => setCopied(false), 2000);
		});
	}, [text]);

	return (
		<button
			type="button"
			className={`atlas-copy-btn ${className ?? ''}`}
			onClick={handleCopy}
			title="Copy to clipboard"
		>
			{copied ? '✓' : '📋'} {label && <span>{copied ? 'Copied!' : label}</span>}
		</button>
	);
}
