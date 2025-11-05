import React from 'react';

const ConfigurableNavbar = ({ title, showMenu = true, config }) => {
	// Use provided title or fallback to config
	const navTitle = title || config?.navbar?.logo?.text || 'Rebuilderd';
	const menuItems = config?.navbar?.menuItems || [];

	return (
		<div id="archnavbar">
			<div id="logo">
				<h1>{navTitle}</h1>
			</div>
			{showMenu && menuItems.length > 0 && (
				<div id="archnavbarmenu">
					<ul id="archnavbarlist">
						{menuItems.map(item => (
							<li key={item.id} id={item.id}>
								<a href={item.url} title={item.title}>
									{item.text}
								</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

export default ConfigurableNavbar;
