import {
	Category,
	Font,
	FONT_FAMILY_DEFAULT,
	FontManager,
	Options,
	OPTIONS_DEFAULTS,
	Script,
	SortOption,
	Variant,
} from "@samuelmeuli/font-manager";
import React, { KeyboardEvent, PureComponent, ReactElement } from "react";

type LoadingStatus = "loading" | "finished" | "error";

interface Props {
	// Required props
	apiKey: string;
	activeFontFamily: string;
	onChange: (font: Font) => void;

	// Optional props
	pickerId?: string;
	families?: string[];
	categories?: Category[];
	scripts?: Script[];
	variants?: Variant[];
	filter?: (font: Font) => boolean;
	limit?: number;
	sort?: SortOption;
}

interface State {
	expanded: boolean;
	loadingStatus: LoadingStatus;
}

/**
 * Return the fontId based on the provided font family
 */
function getFontId(fontFamily: string): string {
	return fontFamily.replace(/\s+/g, "-").toLowerCase();
}

export default class FontPicker extends PureComponent<Props, State> {
	// Instance of the FontManager class used for managing, downloading and applying fonts
	fontManager: FontManager;

	static defaultProps = {
		defaultFamily: FONT_FAMILY_DEFAULT,
		pickerId: OPTIONS_DEFAULTS.pickerId,
		families: OPTIONS_DEFAULTS.families,
		categories: OPTIONS_DEFAULTS.categories,
		scripts: OPTIONS_DEFAULTS.scripts,
		variants: OPTIONS_DEFAULTS.variants,
		filter: OPTIONS_DEFAULTS.filter,
		limit: OPTIONS_DEFAULTS.limit,
		sort: OPTIONS_DEFAULTS.sort,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		onChange: (): void => {},
	};

	state: Readonly<State> = {
		expanded: false,
		loadingStatus: "loading",
	};

	constructor(props: Props) {
		super(props);

		const {
			apiKey,
			activeFontFamily,
			pickerId,
			families,
			categories,
			scripts,
			variants,
			filter,
			limit,
			sort,
			onChange,
		} = this.props;

		const options: Options = {
			pickerId,
			families,
			categories,
			scripts,
			variants,
			filter,
			limit,
			sort,
		};

		// Initialize FontManager object and generate font list
		this.fontManager = new FontManager(apiKey, activeFontFamily, options, onChange);
		this.fontManager
			.init()
			.then((): void => {
				this.setState({
					loadingStatus: "finished",
				});
			})
			.catch((err: Error): void => {
				// On error: Log error message
				this.setState({
					loadingStatus: "error",
				});
				console.error("Error trying to fetch the list of available fonts");
				console.error(err);
			});

		// Function bindings
		this.onClose = this.onClose.bind(this);
		this.onSelection = this.onSelection.bind(this);
		this.setActiveFontFamily = this.setActiveFontFamily.bind(this);
		this.toggleExpanded = this.toggleExpanded.bind(this);
	}

	/**
	 * After every component update, check whether the activeFontFamily prop has changed. If so,
	 * call this.setActiveFontFamily with the new font
	 */
	componentDidUpdate(prevProps: Props): void {
		const { activeFontFamily, onChange } = this.props;

		// If active font prop has changed: Update font family in font manager and component state
		if (activeFontFamily !== prevProps.activeFontFamily) {
			this.setActiveFontFamily(activeFontFamily);
		}

		// If onChange prop has changed: Update onChange function in font manager
		if (onChange !== prevProps.onChange) {
			this.fontManager.setOnChange(onChange);
		}
	}

	/**
	 * EventListener for closing the font picker when clicking anywhere outside it
	 */
	onClose(e: MouseEvent): void {
		let targetEl = e.target as Node; // Clicked element
		const fontPickerEl = document.getElementById(`font-picker${this.fontManager.selectorSuffix}`);

		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (targetEl === fontPickerEl) {
				// Click inside font picker: Exit
				return;
			}
			if (targetEl.parentNode) {
				// Click outside font picker: Move up the DOM
				targetEl = targetEl.parentNode;
			} else {
				// DOM root is reached: Toggle picker, exit
				this.toggleExpanded();
				return;
			}
		}
	}

	/**
	 * Update the active font on font button click
	 */
	onSelection(e: React.MouseEvent | KeyboardEvent): void {
		const target = e.target as HTMLButtonElement;
		const activeFontFamily = target.textContent;
		if (!activeFontFamily) {
			throw Error(`Missing font family in clicked font button`);
		}
		this.setActiveFontFamily(activeFontFamily);
		this.toggleExpanded();
	}

	/**
	 * Set the specified font as the active font in the fontManager and update activeFontFamily in the
	 * state
	 */
	setActiveFontFamily(activeFontFamily: string): void {
		this.fontManager.setActiveFont(activeFontFamily);
	}

	/**
	 * Generate <ul> with all font families
	 */
	generateFontList(fonts: Font[]): ReactElement {
		const { activeFontFamily } = this.props;
		const { loadingStatus } = this.state;

		if (loadingStatus !== "finished") {
			return <div />;
		}
		return (
			<ul className="font-list">
				{fonts.map(
					(font): ReactElement => {
						const isActive = font.family === activeFontFamily;
						const fontId = getFontId(font.family);
						return (
							<li key={fontId} className="font-list-item">
								<button
									type="button"
									id={`font-button-${fontId}${this.fontManager.selectorSuffix}`}
									className={`font-button ${isActive ? "active-font" : ""}`}
									onClick={this.onSelection}
									onKeyPress={this.onSelection}
								>
									{font.family}
								</button>
							</li>
						);
					},
				)}
			</ul>
		);
	}

	/**
	 * Expand/collapse the picker's font list
	 */
	toggleExpanded(): void {
		const { expanded } = this.state;

		if (expanded) {
			this.setState({
				expanded: false,
			});
			document.removeEventListener("click", this.onClose);
		} else {
			this.setState({
				expanded: true,
			});
			document.addEventListener("click", this.onClose);
		}
	}

	render(): ReactElement {
		const { activeFontFamily, sort } = this.props;
		const { expanded, loadingStatus } = this.state;

		// Extract and sort font list
		const fonts = Array.from(this.fontManager.getFonts().values());
		if (sort === "alphabet") {
			fonts.sort((font1: Font, font2: Font): number => font1.family.localeCompare(font2.family));
		}

		// Render font picker button and attach font list to it
		return (
			<div
				id={`font-picker${this.fontManager.selectorSuffix}`}
				className={expanded ? "expanded" : ""}
			>
				<button
					type="button"
					className="dropdown-button"
					onClick={this.toggleExpanded}
					onKeyPress={this.toggleExpanded}
				>
					<p className="dropdown-font-family">{activeFontFamily}</p>
					<p className={`dropdown-icon ${loadingStatus}`} />
				</button>
				{loadingStatus === "finished" && this.generateFontList(fonts)}
			</div>
		);
	}
}
