/**
 * External dependencies
 */
import { size, map, without, omit } from 'lodash';

/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import {
	EditorProvider,
	ErrorBoundary,
	PostLockedModal,
} from '@wordpress/editor';
import { StrictMode, useMemo } from '@wordpress/element';
import {
	KeyboardShortcuts,
	SlotFillProvider,
	DropZoneProvider,
} from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import preventEventDiscovery from './prevent-event-discovery';
import Layout from './components/layout';
import EditorInitialization from './components/editor-initialization';
import EditPostSettings from './components/edit-post-settings';

function Editor( {
	postId,
	postType,
	settings,
	initialEdits,
	onError,
	...props
} ) {
	const {
		hasFixedToolbar,
		focusMode,
		hasReducedUI,
		hasThemeStyles,
		post,
		preferredStyleVariations,
		hiddenBlockTypes,
		blockTypes,
		__experimentalLocalAutosaveInterval,
		keepCaretInsideBlock,
	} = useSelect( ( select ) => {
		const {
			isFeatureActive,
			getPreference,
			__experimentalGetPreviewDeviceType,
		} = select( 'core/edit-post' );
		const { getEntityRecord } = select( 'core' );
		const { getBlockTypes } = select( 'core/blocks' );

		return {
			hasFixedToolbar:
				isFeatureActive( 'fixedToolbar' ) ||
				__experimentalGetPreviewDeviceType() !== 'Desktop',
			focusMode: isFeatureActive( 'focusMode' ),
			hasReducedUI: isFeatureActive( 'reducedUI' ),
			hasThemeStyles: isFeatureActive( 'themeStyles' ),
			post: getEntityRecord( 'postType', postType, postId ),
			preferredStyleVariations: getPreference(
				'preferredStyleVariations'
			),
			hiddenBlockTypes: getPreference( 'hiddenBlockTypes' ),
			blockTypes: getBlockTypes(),
			__experimentalLocalAutosaveInterval: getPreference(
				'localAutosaveInterval'
			),
			keepCaretInsideBlock: isFeatureActive( 'keepCaretInsideBlock' ),
		};
	} );

	const { updatePreferredStyleVariations, setIsInserterOpened } = useDispatch(
		'core/edit-post'
	);

	const editorSettings = useMemo( () => {
		const result = {
			...( hasThemeStyles
				? settings
				: omit( settings, [ 'defaultEditorStyles' ] ) ),
			__experimentalPreferredStyleVariations: {
				value: preferredStyleVariations,
				onChange: updatePreferredStyleVariations,
			},
			hasFixedToolbar,
			focusMode,
			hasReducedUI,
			__experimentalLocalAutosaveInterval,

			// This is marked as experimental to give time for the quick inserter to mature.
			__experimentalSetIsInserterOpened: setIsInserterOpened,
			keepCaretInsideBlock,
			styles: hasThemeStyles
				? settings.styles
				: settings.defaultEditorStyles,
		};

		// Omit hidden block types if exists and non-empty.
		if ( size( hiddenBlockTypes ) > 0 ) {
			// Defer to passed setting for `allowedBlockTypes` if provided as
			// anything other than `true` (where `true` is equivalent to allow
			// all block types).
			const defaultAllowedBlockTypes =
				true === settings.allowedBlockTypes
					? map( blockTypes, 'name' )
					: settings.allowedBlockTypes || [];

			result.allowedBlockTypes = without(
				defaultAllowedBlockTypes,
				...hiddenBlockTypes
			);
		}

		return result;
	}, [
		settings,
		hasFixedToolbar,
		focusMode,
		hasReducedUI,
		hasThemeStyles,
		hiddenBlockTypes,
		blockTypes,
		preferredStyleVariations,
		__experimentalLocalAutosaveInterval,
		setIsInserterOpened,
		updatePreferredStyleVariations,
		keepCaretInsideBlock,
	] );

	const template = useMemo(
		() => [
			createBlock( 'core/post-title' ),
			createBlock( 'core/post-content' ),
		],
		[]
	);

	if ( ! post ) {
		return null;
	}

	return (
		<StrictMode>
			<EditPostSettings.Provider value={ settings }>
				<SlotFillProvider>
					<DropZoneProvider>
						<EditorProvider
							settings={ editorSettings }
							post={ post }
							initialEdits={ initialEdits }
							useSubRegistry={ false }
							__unstableTemplate={ template }
							{ ...props }
						>
							<ErrorBoundary onError={ onError }>
								<EditorInitialization postId={ postId } />
								<Layout />
								<KeyboardShortcuts
									shortcuts={ preventEventDiscovery }
								/>
							</ErrorBoundary>
							<PostLockedModal />
						</EditorProvider>
					</DropZoneProvider>
				</SlotFillProvider>
			</EditPostSettings.Provider>
		</StrictMode>
	);
}

export default Editor;
