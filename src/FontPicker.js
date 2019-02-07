import React, { Component } from 'react';
import throttle from 'lodash.throttle';
import { FontManager } from 'font-picker';

const THROTTLE_INTERVAL = 250;


/**
 * React interface for the font picker
 * @see README.md
 */
export default class FontPicker extends Component {
	constructor(props) {
		super(props);

		this.state = {
			activeFont: this.props.activeFont,
			errorText: '',
			expanded: false,
			loadingStatus: 'loading' // possible values: 'loading', 'finished', 'error'
		};

		// Determine selector suffix from font picker's name
		if (this.props.options && this.props.options.name) {
			this.pickerSuffix = `-${this.props.options.name}`;
		} else {
			this.pickerSuffix = '';
		}

		// initialize FontManager object and generate the font list
		this.fontManager = new FontManager(
			this.props.apiKey,
			this.props.activeFont,
			this.props.options
		);
		this.fontManager.init()
			.then(() => {
				// font list has finished loading
				this.setState({
					errorText: '',
					loadingStatus: 'finished'
				});
			})
			.catch((err) => {
				// error while loading font list
				this.setState({
					errorText: 'Error trying to fetch the list of available fonts',
					loadingStatus: 'error'
				});
				console.error(this.state.errorText);
				console.error(err);
			});

		// function bindings
		this.onClose = this.onClose.bind(this);
		this.onScroll = this.onScroll.bind(this);
		this.setActiveFont = this.setActiveFont.bind(this);
		this.downloadPreviews = throttle(this.downloadPreviews.bind(this), THROTTLE_INTERVAL);
		this.toggleExpanded = this.toggleExpanded.bind(this);
	}

	/**
	 * After every component update, check whether the activeFont prop has changed. If so, change the
	 * font in the fontManager as well
	 */
	componentDidUpdate() {
		if (this.state.activeFont !== this.props.activeFont) {
			this.setActiveFont(this.props.activeFont);
		}
	}

	/**
	 * EventListener for closing the font picker when clicking anywhere outside it
	 */
	onClose(e) {
		let targetElement = e.target; // clicked element

		do {
			if (targetElement === document.getElementById('font-picker')) {
				// click inside font picker
				return;
			}
			// move up the DOM
			targetElement = targetElement.parentNode;
		} while (targetElement);

		// click outside font picker
		this.toggleExpanded();
	}

	/**
	 * Scroll event handler
	 */
	onScroll(e) {
		e.persist();
		this.downloadPreviews(e);
	}

	/**
	 * Set the font with the given font list index as the active one
	 */
	setActiveFont(fontFamily) {
		const activeFontIndex = this.fontManager.setActiveFont(fontFamily);
		if (activeFontIndex === -1) {
			// error trying to change font
			this.setState({
				activeFont: fontFamily,
				errorText: `Cannot update activeFont: The font "${fontFamily}" is not in the font list`,
				loadingStatus: 'error'
			});
			console.error(this.state.errorText);
		} else {
			// font change successful
			this.setState({
				activeFont: fontFamily,
				errorText: '',
				loadingStatus: 'finished'
			});
		}
	}

	/**
	 * Download the font previews for all visible font entries and the five after them
	 */
	downloadPreviews(e) {
		const elementHeight = e.target.scrollHeight / this.fontManager.fonts.length;
		const downloadIndex = Math.ceil((e.target.scrollTop + e.target.clientHeight) / elementHeight);
		this.fontManager.downloadPreviews(downloadIndex + 5);
	}

	/**
	 * Expand/collapse the picker's font list
	 */
	toggleExpanded() {
		if (this.state.expanded) {
			this.setState({
				expanded: false
			});
			document.removeEventListener('click', this.onClose);
		} else {
			this.setState({
				expanded: true
			});
			document.addEventListener('click', this.onClose);
		}
	}

	render() {
		// generate <ul> with font list; fetch font previews on scroll
		let fontList;
		if (this.state.loadingStatus === 'finished') {
			fontList = (
				<ul className={this.state.expanded ? 'expanded' : ''} onScroll={this.onScroll}>
					{
						this.fontManager.fonts.map((font) => {
							const isActive = font.family === this.state.activeFont;
							const fontId = font.family.replace(/\s+/g, '-').toLowerCase();
							return (
								<li key={font.family}>
									<button
										type="button"
										className={`font-${fontId}${this.pickerSuffix} ${isActive ? 'active-font' : ''}`}
										onClick={() => {
											this.toggleExpanded();
											this.props.onChange(font);
										}}
										onKeyPress={() => {
											this.toggleExpanded();
											this.props.onChange(font);
										}}
									>
										{font.family}
									</button>
								</li>
							);
						})
					}
				</ul>
			);
		}

		// render font picker button and attach font list to it
		return (
			<div id={`font-picker${this.pickerSuffix}`} title={this.state.errorText}>
				<button
					type="button"
					className={`dropdown-button ${this.state.expanded ? 'expanded' : ''}`}
					onClick={this.toggleExpanded}
					onKeyPress={this.toggleExpanded}
				>
					<p className="dropdown-font-name">{this.state.activeFont}</p>
					<div className={`dropdown-icon ${this.state.loadingStatus}`} />
				</button>
				{this.state.loadingStatus === 'finished' && fontList}
			</div>
		);
	}
}
