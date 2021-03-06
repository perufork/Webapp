/*******************************************************************************
** @Author:					Thomas Bouder <Tbouder>
** @Email:					Tbouder@protonmail.com
** @Date:					Sunday 12 January 2020 - 14:45:07
** @Filename:				albums.js
**
** @Last modified by:		Tbouder
** @Last modified time:		Thursday 12 March 2020 - 13:34:26
*******************************************************************************/

import	React, {useState}					from	'react';
import	styled								from	'styled-components';
import	ModalAlbumSelection					from	'../../components/ModalAlbumSelection';
import	AlbumCard, {AlbumsCardPreviewFake}	from	'../../components/AlbumCard';
import	useEffectOnce						from	'../../hooks/useEffectOnce';
import	* as API							from	'../../utils/API';

const	AlbumsContainer = styled.div`
	font-size: 10pt;
	width: 100%;
	margin: 0 auto;
	border-radius: 4px;
	padding: 32px calc(8.33% - 16px) 32px calc(8.33% - 16px);
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
`;

function AlbumList() {
	const	[albumList, set_albumList] = useState([]);
	const	[isReady, set_isReady] = useState(false);
	const	[albumSelectionModal, set_albumSelectionModal] = useState(false);

	useEffectOnce(() => {
		API.ListAlbums().then(e => set_albumList(e || []))
		set_isReady(true)
	})

	if (!isReady)
		return (null);

	return (
		<AlbumsContainer>
			{albumList.map(e => <AlbumCard key={e.albumID} album={e} />)}
			<AlbumsCardPreviewFake onClick={() => set_albumSelectionModal(true)} />
			<ModalAlbumSelection
				isOpen={albumSelectionModal}
				onCloseSuccess={(name, albumID) => {
					set_albumList(_prev => [..._prev, {albumID, name}])
					set_albumSelectionModal(false)
				}}
				onClose={() => set_albumSelectionModal(false)}
				content={'albumCreation'} />
		</AlbumsContainer>
	);
}

export default AlbumList;
