/*******************************************************************************
** @Author:					Thomas Bouder <Tbouder>
** @Email:					Tbouder@protonmail.com
** @Date:					Friday 17 January 2020 - 15:15:55
** @Filename:				PictureList.js
**
** @Last modified by:		Tbouder
** @Last modified time:		Wednesday 15 April 2020 - 00:56:02
*******************************************************************************/

import	React, {useState, useEffect, forwardRef, useImperativeHandle}	from	'react';
import	styled							from	'styled-components';
import	PhotoCardWidth					from	'./PhotoCardWidth';
import	InfiniteList					from	'./InfiniteList';
import	ModalAlbumSelection				from	'./ModalAlbumSelection';
import	ModalDayPicker					from	'./ModalDayPicker';
import	ModalConfirmation				from	'./ModalConfirmation';
import	ToastSuccess					from	'./ToastSuccess';
import	PictureLightroom				from	'./PictureLightroom';
import	Timebar							from	'./Timebar';
import	{ActionBar}						from	'./Navbar';
import	useKeyPress						from	'../hooks/useKeyPress';
import	* as API						from	'../utils/API';
import	{convertToMoment, formatDate}	from	'../utils/ConvertDate';
import	{Row, Col}						from	'../style/Frame';

const	Toggle = styled.div`
	cursor: pointer;
	width: 24px;
	height: 24px;
	margin-right: 8px;
	mask-size: contain;
	mask-repeat: no-repeat;
	mask-position: center;
	transition: 0.3s;
`;
const	StyledDate = styled.div`
	font-size: 14px;
	color: #B5B7DF;
	margin-top: 8px;
	margin-bottom: 8px;
	display: flex;
    align-items: center;
	height: 24px;
	width: 100%;
	position: relative;
	cursor: pointer;
	& > p {
		margin-left: -32px;
		transition: 0.2s;
	}


	${props => props.isToggleSome && '& > p {margin-left: 0; transition: 0.2s;}'};
	${props => props.isToggleSelected && '& > p {margin-left: 0; transition: 0.2s;}'};
	& > ${Toggle} {
		${props => props.isToggleSome && `background-color: #FFFFFF`};
		${props => props.isToggleSome && `opacity: 1`};
		${props => props.isToggleSome && `z-index: 1`};

		${props => props.isToggleSelected ? `mask: url('/static/icons/checked.svg')` : `mask: url('/static/icons/unchecked.svg')`};
		${props => props.isToggleSelected && `background-color: #FFFFFF`};
		${props => props.isToggleSelected && `opacity: 1`};
		${props => props.isToggleSelected && `z-index: 1`};
	}

	&:hover {
		& > p {
			margin-left: 0;
			transition: 0.2s;
		}
		& > ${Toggle} {
			opacity: 1;
			z-index: 1;
			background-color: #FFFFFF;
		}
	}

`;

const	Modals = forwardRef((props, ref) => {
	function	init() {
		return {
			confirmation: {enabled: props.modals.confirmation.enabled, open: false, data: {}},
			albums: {enabled: props.modals.albums.enabled, open: false, data: {}},
			dayPicker: {enabled: props.modals.dayPicker.enabled, open: false, data: {}}
		};
	}
	function	reducer(state, reduce) {
		if (reduce.type === 'toggle') {
			return ({...state, [reduce.modal]: {...state[reduce.modal], open: !state[reduce.modal].open}})
		}
		else if (reduce.type === 'open') {
			return ({...state, [reduce.modal]: {...state[reduce.modal], open: true}})
		}
		else if (reduce.type === 'openWithData') {
			return ({...state, [reduce.modal]: {...state[reduce.modal], open: true, data: reduce.data}})
		}
		else if (reduce.type === 'close') {
			return ({...state, [reduce.modal]: {...state[reduce.modal], open: false}})
		}
	}

	const [state, dispatch] = React.useReducer(reducer, init, init);

	useImperativeHandle(ref, () => ({
		Open(modal, data = undefined) {
			if (data !== undefined) {
				dispatch({type: 'openWithData', modal, data});
			} else {
				dispatch({type: 'open', modal});
			}
		},
		Close(modal) {
			onClose(modal);
		}
	}));

	function	onClose(modal) {
		dispatch({type: 'toggle', modal});
		props.onClose()
	}
	
	return (
		<>
			{state.dayPicker.enabled && <ModalDayPicker
				isOpen={state.dayPicker.open}
				onClose={() => onClose('dayPicker')}
				onConfirm={props.modals.dayPicker.onConfirm}
				selectedObject={props.selectedObject} />}
			{state.confirmation.enabled && <ModalConfirmation
				isOpen={state.confirmation.open}
				onClose={() => onClose('confirmation')}
				onConfirm={() => props.modals.confirmation.onConfirm(state.confirmation.data)}
				selectedObject={props.selectedObject}
				text={state.confirmation.data && `Are you sure you want to rotate ${state.confirmation.data.direction} these ${props.selectedObject.length} picture(s)?`} />}
			{state.albums.enabled && <ModalAlbumSelection
				isOpen={state.albums.open}
				onClose={() => onClose('albums')}
				albumList={state.albums.data.albumList}
				selectedObject={props.selectedObject}
				onConfirm={(action, data) => props.modals.albums.onConfirm(action, data)} />}
		</>
	)

})

function	PictureList(props) {
	const	[update, set_update] = useState(0);
	const	[isReady, set_isReady] = useState(false);

	const	[pictureList, set_pictureList] = useState(props.pictureList);
	const	[mappedPictureList, set_mappedPictureList] = useState([]);
	const	[timelineData, set_timelineData] = useState([]);
	
	const	[selectMode, set_selectMode] = useState(false);
	
	const	[selectedPictures, set_selectedPictures] = useState([]); //ALL THE OBJECT
	const	[selectedPicturesKeys, set_selectedPicturesKeys] = useState([]); //ONLY THE KEYS

	const	[selectedDays, set_selectedDays] = useState({});
	const	[successToast, set_successToast] = useState(false);

	const	[lightRoom, set_lightRoom] = useState(false);
	const	[lightRoomIndex, set_lightRoomIndex] = useState(0);
	
	const	isShift = useKeyPress('Shift');
	const	[lastCheck, set_lastCheck] = useState(-1);
	const	[infiniteListHeight, set_infiniteListHeight] = useState(0);
	const	uploaderRef = React.useRef(null);
	const	modalsRef = React.useRef(null);

	const	domElements = [];

	useEffect(() => {
		const	_mappedPictureList = [];
		props.pictureList.forEach(each => _mappedPictureList[each.uri] = each)

		set_mappedPictureList(_mappedPictureList);
		set_pictureList(props.pictureList);
		set_isReady(true);
	}, [props.pictureList])

	useEffect(() => {setTimelineData()}, [infiniteListHeight])

	function	setTimelineData() {
		const	pageSize = infiniteListHeight;
		const	timelineScrollerData = [];
		const	exists = []

		domElements.forEach((e) => {
			const	element = document.getElementById(e);
			const	relativeFromTop = element?.offsetTop / pageSize * 100;
			if (!exists[getMonthYear(e)]) {
				exists[getMonthYear(e)] = true
				timelineScrollerData.push([getMonthYear(e), getDate(e), relativeFromTop])
			} else {
				timelineScrollerData.push(['•', getDate(e), relativeFromTop])

			}
		})
		set_timelineData(timelineScrollerData)
	}

	if (!isReady)
		return (null);

	function	onDeletePicture(_selectedPictures = selectedPicturesKeys) {
		API.DeletePictures({picturesID: _selectedPictures}).then(() => {
			const	_pictureList = pictureList.filter(item => _selectedPictures.findIndex(elem => elem === item.uri) == -1)
			props.set_pictureList(_pictureList);
			set_selectedPicturesKeys([]);
			set_selectedDays({});
			set_selectMode(false);
		});
	}
	function	onSetAlbumCover() {
		API.SetAlbumCover({
			albumID: props.albumID,
			coverPicture: selectedPicturesKeys[0] || '',
		}).then((e) => {
			set_successToast(true);
			set_selectedPicturesKeys([]);
			set_selectedDays({});
			set_selectMode(false);
		})
	}

	function	getMonthYear(day) {
		const	months = [`Janvier`, `Février`, `Mars`, `Avril`, `Mai`, `Juin`, `Juillet`, `Août`, `Septembre`, `Octobre`, `Novembre`, `Décembre`];
		const	fullDate = new Date(day);

		return (`${months[fullDate.getMonth()]} ${fullDate.getFullYear()}`)
	}
	function	getDate(day) {
		const	months = [`Janvier`, `Février`, `Mars`, `Avril`, `Mai`, `Juin`, `Juillet`, `Août`, `Septembre`, `Octobre`, `Novembre`, `Décembre`];
		const	fullDate = new Date(day);

		return (`${fullDate.getDate()} ${months[fullDate.getMonth()]} ${fullDate.getFullYear()}`);
	}

	/**************************************************************************
	**	On select an image, we need to update the list of selected images
	**	and the selected days to update the checkboxes
	**************************************************************************/
	function	updateSelectedPicture(element) {
		const	_selectedPictures = selectedPicturesKeys;
		const	pictureSelected = _selectedPictures.indexOf(element.uri);
		const	daysToRecheck = {};

		if (pictureSelected >= 0)
			_selectedPictures.splice(pictureSelected, 1);
		else
			_selectedPictures.push(element.uri);

		daysToRecheck[element.day] = true;
		updateDaysCheckBox(daysToRecheck, _selectedPictures);
		set_selectedPicturesKeys(_selectedPictures);
		set_selectMode(_selectedPictures.length > 0);
	}
	function	batchUpdateSelectedPictures(element, elemIndex) {
		const	_selectedPictures = selectedPicturesKeys;
		const	pictureSelected = _selectedPictures.indexOf(element.uri);
		const	daysToRecheck = {};
		const	batchFirst = lastCheck > elemIndex ? elemIndex : lastCheck;
		const	batchLast = lastCheck > elemIndex ? lastCheck : elemIndex;

		for (let i = batchFirst; i <= batchLast; i++) {
			if (pictureSelected >= 0) {
				//BATCH UNSELECT
				const	toUnselectIndex = _selectedPictures.indexOf(pictureList[i].uri);
				if (toUnselectIndex >= 0) {
					_selectedPictures.splice(toUnselectIndex, 1);
					daysToRecheck[pictureList[i].dateAsKey] = true
				}
			} else {
				//BATCH SELECT
				const	toSelectIndex = _selectedPictures.indexOf(pictureList[i].uri);
				if (toSelectIndex === -1) {
					_selectedPictures.push(pictureList[i].uri);
					daysToRecheck[pictureList[i].dateAsKey] = true
				}
			}
		}
		updateDaysCheckBox(daysToRecheck, _selectedPictures)
		set_selectedPicturesKeys(_selectedPictures);
		set_selectMode(_selectedPictures.length > 0);
		set_update(update + 1);
	}
	function	updateDaysCheckBox(daysToCheck, _selectedPictures) {
		const	_selectedDays = selectedDays;

		Object.keys(daysToCheck).map((eachDay) => {
			const	dayPictures = pictureList.filter(elem => elem.dateAsKey === eachDay).map(e => e.uri);
			const	selectedDayPictures = _selectedPictures.filter(elem => dayPictures.indexOf(elem) > -1);

			if (selectedDayPictures.length === 0) {
				_selectedDays[eachDay] = `NONE`;
			} else if (selectedDayPictures.length === dayPictures.length) {
				_selectedDays[eachDay] = `FULL`;
			} else {
				_selectedDays[eachDay] = `SOME`;
			}
		})
		set_selectedDays(_selectedDays);
		set_update(update + 1);
	}
	function	onDayToggleClick(day) {
		const	dayPictures = pictureList.filter(elem => elem.dateAsKey === day).map(e => e.uri);
		const	selectedDayPictures = selectedPicturesKeys.filter(elem => dayPictures.indexOf(elem) > -1);
		
		if (selectedDayPictures.length === 0) {
			/* SHOULD SELECT ALL */
			const	_selectedPictures = [...selectedPicturesKeys, ...dayPictures];
			const	_selectedDays = selectedDays;
			_selectedDays[day] = `FULL`

			// console.log(pictureList.find(e => e.uri === dayPictures[dayPictures.length - 1]).originalIndex)
			set_selectedPicturesKeys(_selectedPictures);
			set_selectedDays(_selectedDays);
			set_selectMode(true);
			set_lastCheck(pictureList.find(e => e.uri === dayPictures[dayPictures.length - 1]).originalIndex)
		} else if (selectedDayPictures.length === dayPictures.length) {
			/* SHOULD UNSELECT ALL */
			const	_selectedPictures = selectedPicturesKeys.filter(elem => dayPictures.indexOf(elem) === -1);
			const	_selectedDays = selectedDays;

			_selectedDays[day] = `NONE`
			
			set_lastCheck(-1);
			set_selectedPicturesKeys(_selectedPictures);
			set_selectedDays(_selectedDays);
			set_selectMode(_selectedPictures.length > 0);
		} else {
			/* SHOULD SELECT SOME */
			const	toSelect = dayPictures.filter(elem => selectedDayPictures.indexOf(elem) === -1);
			const	_selectedPictures = [...selectedPicturesKeys, ...toSelect];
			const	_selectedDays = selectedDays;
			
			_selectedDays[day] = `FULL`

			set_lastCheck(pictureList.find(e => e.uri === dayPictures[dayPictures.length - 1]).originalIndex)
			set_selectedPicturesKeys(_selectedPictures);
			set_selectedDays(_selectedDays);
			set_selectMode(true);
		}
		set_update(update + 1);
	}
	function	onSelectAll() {
		const	_selectedDays = {};
		const	_selectedPictures = pictureList.map(e => e.uri)
		pictureList.map(e => _selectedDays[e.dateAsKey] = `FULL`)

		set_lastCheck(-1);
		set_selectedPicturesKeys(_selectedPictures);
		set_selectedDays(_selectedDays);
		set_update(update + 1);
	}
	function	onUnselectAll() {
		set_lastCheck(-1);
		set_selectedPicturesKeys([]);
		set_selectedDays({});
		set_selectMode(false);
		set_update(update + 1);
	}
	function	onRotate(direction) {
		uploaderRef.current.SetUploader()

		selectedPicturesKeys.forEach(async (each) => {
			let		image = await API.GetImage(each, null, 'original')
			let		imageToRotate = new Image();

			imageToRotate.onload = function() {
				URL.revokeObjectURL(image.src)
				const	canvas = new OffscreenCanvas(imageToRotate.width, imageToRotate.height);
				const	c = canvas.getContext('2d');
				let		cw = imageToRotate.width;
				let		ch = imageToRotate.height;

				canvas.width = ch;
				canvas.height = cw;
				cw = canvas.width;
				ch = canvas.height;

				c.save();
				c.translate(cw, ch / cw);
				if (direction === 'left') {
					c.rotate(-Math.PI / 2);
					c.drawImage(imageToRotate, -ch, -cw);
				} else {
					c.rotate(Math.PI / 2);
					c.drawImage(imageToRotate, 0, 0);
				}
				c.restore();

				canvas.convertToBlob({type: 'image/jpeg', quality: 1}).then((blob) => {
					const	file = new File([blob], '');
					file.width = imageToRotate.height
					file.height = imageToRotate.width
					uploaderRef.current.Reupload(null, 0, [file], each)
					imageToRotate = null;
					image = null;
				})
			}
			imageToRotate.src = image
		})
	}

	function	renderImage(element, elemIndex) {
		return (
			<PhotoCardWidth
				key={`${element.uri}_${elemIndex}`}
				uri={element.uri}
				width={element.width}
				height={element.height}
				originalWidth={element.originalWidth}
				originalHeight={element.originalHeight}
				isSelectMode={selectMode}
				isSelected={selectedPicturesKeys.indexOf(element.uri) > -1}
				onToggle={() => {
					if (isShift && lastCheck > -1)
						batchUpdateSelectedPictures(element, elemIndex);
					else
						updateSelectedPicture(element);
					set_lastCheck(elemIndex);
				}}
				onClick={() => {
					set_lightRoomIndex(elemIndex);
					set_lightRoom(true);
				}}
				alt={'img'} />
		);
	}
	function	renderDaySeparator(day) {
		const	days = [`Dimanche`, `Lundi`, `Mardi`, `Mercredi`, `Jeudi`, `Vendredi`, `Samedi`];
		const	months = [`Janvier`, `Février`, `Mars`, `Avril`, `Mai`, `Juin`, `Juillet`, `Août`, `Septembre`, `Octobre`, `Novembre`, `Décembre`];

		const	fullDate = new Date(day);
		return (
			<StyledDate
				id={`${day}`}
				ref={() => domElements.push(`${day}`)}
				isToggleSelected={selectedDays[day] === 'FULL'}
				isToggleSome={selectedDays[day] === 'SOME'}
				onClick={() => onDayToggleClick(day)}>
				<Toggle />

				<p>{`${days[fullDate.getDay()]} ${fullDate.getDate()} ${months[fullDate.getMonth()]} ${fullDate.getFullYear()}`}</p>
			</StyledDate>
		)
	}

	function	renderModals() {
		return (
			<Modals
				ref={modalsRef}
				modals={{
					confirmation: {
						enabled: true,
						onConfirm: function(data) {
							if (data && data.action)
								data.action();
							modalsRef.current.Close('confirmation');
						},
					},
					albums: {
						enabled: true,
						onConfirm: function(action, data) {
							if (action === 'appendToAlbum') {
								API.SetPicturesAlbum({
									albumID: data.albumID,
									groupIDs: selectedPicturesKeys,
								}).then(() => {
									//TODO: ADD SUCCESS TOAST
								}).finally(() => {
									modalsRef.current.Close('albums');
								});
							}
							else if (action === 'createAlbum') {
								API.CreateAlbum({
									name: data.albumName,
									coverPicture: selectedPicturesKeys[0],
									pictures: selectedPicturesKeys,
								}).then(() => {
									//TODO: ADD SUCCESS TOAST
								}).finally(() => {
									modalsRef.current.Close('albums');
								});
							}
						},
					},
					dayPicker: {
						enabled: true,
						onConfirm: function(confirmedDate) {
							const	newDate = formatDate(new Date(confirmedDate));
							API.SetPicturesDate({newDate, groupIDs: selectedPicturesKeys})
							.then(() => {
								const	_mappedPictureList = [];
								const	_pictureList = pictureList.map((each) => {
									if (selectedPicturesKeys.includes(each.uri)) {
										each.originalTime = newDate;
										each.dateAsKey = convertToMoment(newDate)
									}
									_mappedPictureList[each.uri] = each
									return (each);
								});
								set_mappedPictureList(_mappedPictureList);
								set_pictureList(_pictureList);
							}).finally(() => {
								modalsRef.current.Close('dayPicker');
							});
						},
					}
				}}
				onClose={() => {
					set_selectedPicturesKeys([]);
					set_selectedDays({});
					set_selectMode(false);
				}}
				selectedObject={pictureList.filter(e => selectedPicturesKeys.includes(e.uri))}
			/>
		);
	}

	return (
		<>
			<ActionBar
				isEnabled={selectMode}
				allPictureSelected={selectMode && pictureList.length === selectedPicturesKeys.length}
				albumID={props.albumID}
				onCancel={() => {
					set_selectedPicturesKeys([]);
					set_selectedDays({});
					set_selectMode(false);
				}}
				onAddToAlbum={() => modalsRef.current.Open('albums', {albumList: props.albumList})}
				onChangeDate={() => modalsRef.current.Open('dayPicker')}
				onDeletePicture={onDeletePicture}
				onSetCover={onSetAlbumCover}
				onSelectAll={onSelectAll}
				onUnselectAll={onUnselectAll}
				onRotate={(direction) => modalsRef.current.Open('confirmation', {action: () => onRotate(direction), direction})}
				len={selectedPicturesKeys.length} />
			{renderModals()}
			<Row>
				<Col xs={2} sm={4} md={12} lg={12}>
					<InfiniteList
						set_infiniteListHeight={set_infiniteListHeight}
						renderChildren={renderImage}
						renderDaySeparator={renderDaySeparator}
						childrenContainer={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 16}}
						pictureList={pictureList} />
				</Col>
			</Row>

			<Timebar
				data={timelineData} />
			<ToastSuccess
				isOpen={successToast}
				onClose={() => set_successToast(false)}
				status={'Les photos de couverture de l\'album ont été mises à jour'} />

			{lightRoom && <PictureLightroom
				onClose={() => set_lightRoom(false)}
				onDeletePicture={e => onDeletePicture([e.uri])}
				list={pictureList}
				originalIndex={lightRoomIndex} />
			}
		</>
	);
}

export default PictureList;
