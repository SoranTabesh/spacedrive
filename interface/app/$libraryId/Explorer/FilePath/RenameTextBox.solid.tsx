/** @jsxImportSource solid-js */
// @ts-nocheck // TODO: Bring this back

import clsx from 'clsx';
import { createSignal } from 'solid-js';
import { OperatingSystem } from '@sd/client';

import { TruncateMarkupSolid } from './TruncateMarkup.solid';

export interface RenameTextBoxProps extends React.HTMLAttributes<HTMLDivElement> {
	name: string;
	onRename: (newName: string) => void;
	disabled?: boolean;
	lines?: number;
	// Temporary solution for TruncatedText in list view
	idleClassName?: string;

	// TODO: Remove all this in future.
	_temporary_os: OperatingSystem;
}

export function RenameTextBox2(props: RenameTextBoxProps) {
	const os = props._temporary_os; // TODO: Get using a hook

	let ref: HTMLDivElement | undefined;

	let renamable = false;
	let timeout: NodeJS.Timeout | null = null;

	const [allowRename, setAllowRename] = createSignal(false);
	const [isTruncated, setIsTruncated] = createSignal(false);

	// Highlight file name up to extension or
	// fully if it's a directory, hidden file or has no extension
	const highlightText = () => {
		if (!ref || !props.name) return;

		const node = ref.firstChild;
		if (!node) return;

		const endRange = props.name.lastIndexOf('.');

		const range = document.createRange();

		range.setStart(node, 0);
		range.setEnd(node, endRange > 1 ? endRange : props.name.length);

		const sel = window.getSelection();
		if (!sel) return;

		sel.removeAllRanges();
		sel.addRange(range);
	};

	const reset = () => ref && (ref.innerText = props.name ?? '');

	const handleRename = async () => {
		let newName = ref?.innerText;

		if (newName?.endsWith('\n')) newName = newName.slice(0, -1);

		if (!newName || newName === props.name) {
			reset();
			return;
		}

		props.onRename(newName);
	};

	const handleKeyDown = (e: unknown) => {
		switch (e.key) {
			case 'Tab': {
				e.preventDefault();
				ref?.blur();
				break;
			}
			case 'Escape': {
				e.stopPropagation();
				reset();
				ref?.blur();
				break;
			}
			case 'z': {
				if (os === 'macOS' ? e.metaKey : e.ctrlKey) {
					reset();
					highlightText();
				}
			}
		}
	};

	const resetState = () => {
		setAllowRename(false);
		renamable = false;
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	// TODO
	// useShortcut('renameObject', (e) => {
	// 	e.preventDefault();
	// 	if (allowRename) blur();
	// 	else if (!disabled) setAllowRename(true);
	// });

	// TODO
	// useEffect(() => {
	// 	const element = ref.current;
	// 	if (!element || !allowRename) return;

	// 	const scroll = (e: WheelEvent) => {
	// 		e.preventDefault();
	// 		element.scrollTop += e.deltaY;
	// 	};

	// 	highlightText();

	// 	element.addEventListener('wheel', scroll);
	// 	return () => element.removeEventListener('wheel', scroll);
	// }, [allowRename, highlightText]);

	// TODO
	// useEffect(() => {
	// 	if (!disabled) {
	// 		if (isRenaming && !allowRename) setAllowRename(true);
	// 		else explorerStore.isRenaming = allowRename;
	// 	} else resetState();
	// }, [isRenaming, disabled, allowRename]);

	// TODO
	// useEffect(() => {
	// 	const onMouseDown = (event: MouseEvent) => {
	// 		if (!ref.current?.contains(event.target as Node)) blur();
	// 	};

	// 	document.addEventListener('mousedown', onMouseDown, true);
	// 	return () => document.removeEventListener('mousedown', onMouseDown, true);
	// }, [blur]);

	return (
		<div
			ref={ref}
			role="textbox"
			autoCorrect="off"
			contenteditable={allowRename()}
			class={clsx(
				'cursor-default overflow-hidden rounded-md px-1.5 py-px text-xs text-ink outline-none',
				allowRename() && 'whitespace-normal bg-app !text-ink ring-2 ring-accent-deep',
				!allowRename() && props.idleClassName,
				props.className
			)}
			onDblClick={(e) => {
				if (allowRename()) e.stopPropagation();
				renamable = false;
			}}
			onMouseDown={(e) => {
				e.button === 0 && (renamable = !props.disabled);
			}}
			onMouseUp={(e) => {
				if (e.button === 0 || renamable || !allowRename) {
					timeout = setTimeout(() => renamable && setAllowRename(true), 350);
				}
			}}
			onBlur={(e) => {
				handleRename();
				resetState();
				explorerStore.isRenaming = false;
			}}
			onKeyDown={handleKeyDown}
			{...props}
		>
			{allowRename() ? (
				props.name
			) : (
				<TruncatedTextWrapperSolid
					text={props.name}
					lines={props.lines}
					onTruncate={setIsTruncated}
				/>
			)}
		</div>
	);
}

interface TruncatedTextProps {
	text: string;
	lines: number;
	onTruncate: (wasTruncated: boolean) => void;
}

export function TruncatedTextWrapperSolid(props: TruncatedTextProps) {
	const ellipsis = () => {
		const extension = props.text.lastIndexOf('.');
		if (extension !== -1) return `...${props.text.slice(-(props.text.length - extension + 2))}`;
		return `...${props.text.slice(-8)}`;
	};

	return (
		<TruncateMarkupSolid
			postfix={ellipsis()}
			content={props.text}
			lines={props.lines}
			onTruncate={props.onTruncate}
		/>
	);
}
