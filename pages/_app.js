/*******************************************************************************
** @Author:					Thomas Bouder <Tbouder>
** @Email:					Tbouder@protonmail.com
** @Date:					Sunday 12 January 2020 - 14:39:16
** @Filename:				_app.js
**
** @Last modified by:		Tbouder
** @Last modified time:		Tuesday 14 April 2020 - 14:16:16
*******************************************************************************/

import	React, {useState}				from	'react';
import	{useRouter}						from	'next/router';
import	WithTheme						from 	'../style/StyledTheme';
import	NavBar							from	'../components/Navbar';

function	MyApp(props) {
	const	router = useRouter();
	const	[memberPublicKey, set_memberPublicKey] = useState(null);
	const	[isDragNDrop, set_isDragNDrop] = useState(false);
	const	{Component, pageProps} = props;

	return (
		<WithTheme>
			{router.route !== '/' && <NavBar />}
			<div
				onDragEnter={() => set_isDragNDrop(true)}
				style={{width: '100%', minHeight: '100vh'}}>
				<Component
					isDragNDrop={isDragNDrop}
					set_isDragNDrop={set_isDragNDrop}
					element={props.element}
					memberPublicKey={memberPublicKey}
					{...pageProps} />
			</div>
		</WithTheme>
	);
}


export default MyApp;